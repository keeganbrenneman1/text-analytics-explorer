import type {
  ExtractionInput,
  ExtractionResult,
  MatchedTheme,
  MatchedTopic,
  ThemeRef,
  TopicRef,
} from "./types";
import { containsPhrase, excerptAround, hashConfidence, normalize, significantTerms } from "./tokenize";

function topicHit(lower: string, topic: TopicRef): string | null {
  if (containsPhrase(lower, topic.name)) return topic.name;
  for (const kw of topic.keywords) {
    if (containsPhrase(lower, kw)) return kw;
  }
  return null;
}

function themeHit(lower: string, theme: ThemeRef): string | null {
  if (containsPhrase(lower, theme.name)) return theme.name;
  for (const kw of theme.keywords) {
    if (containsPhrase(lower, kw)) return kw;
  }
  return null;
}

function matchTopics(text: string, topics: TopicRef[]) {
  const lower = normalize(text);
  const childrenByParent = new Map<string, TopicRef[]>();
  for (const t of topics) {
    if (!t.parentId) continue;
    const bucket = childrenByParent.get(t.parentId) ?? [];
    bucket.push(t);
    childrenByParent.set(t.parentId, bucket);
  }

  const matched: MatchedTopic[] = [];
  let orphanParent: { topicId: string; name: string } | null = null;

  for (const topic of topics) {
    const hit = topicHit(lower, topic);
    if (!hit) continue;

    const children = childrenByParent.get(topic.id) ?? [];
    const hasMatchedChild = children.some((c) => topicHit(lower, c) !== null);

    if (children.length > 0 && !hasMatchedChild) {
      // matched a parent bucket, but no specific child topic — flag for mining, don't tag yet
      orphanParent ??= { topicId: topic.id, name: topic.name };
      continue;
    }

    matched.push({
      topicId: topic.id,
      name: topic.name,
      parentId: topic.parentId,
      confidence: hashConfidence(topic.name + text),
      excerpt: excerptAround(text, hit),
    });
  }

  if (matched.length > 0) orphanParent = null;
  return { matched, orphanParent };
}

function matchThemes(text: string, themes: ThemeRef[]): MatchedTheme[] {
  const lower = normalize(text);
  const matched: MatchedTheme[] = [];
  for (const theme of themes) {
    const hit = themeHit(lower, theme);
    if (!hit) continue;
    matched.push({
      themeId: theme.id,
      name: theme.name,
      confidence: hashConfidence(theme.name + text),
      excerpt: excerptAround(text, hit),
    });
  }
  return matched;
}

function unmatchedCandidateTerms(text: string, taxonomy: { topics: TopicRef[]; themes: ThemeRef[] }): string[] {
  const known = new Set<string>();
  for (const t of taxonomy.topics) {
    known.add(normalize(t.name));
    t.keywords.forEach((k) => known.add(normalize(k)));
  }
  for (const t of taxonomy.themes) {
    known.add(normalize(t.name));
    t.keywords.forEach((k) => known.add(normalize(k)));
  }
  return significantTerms(text).filter((term) => !known.has(term)).slice(0, 5);
}

/**
 * Rule-based stand-in for a real extraction call. Same signature as the
 * eventual Claude-backed extractor (see types.ts `Extractor`) — matches
 * document text against a project's *existing* topic/theme keyword lists.
 * Terms that match nothing feed `candidateTerms`, which mining.ts uses to
 * propose new topics/themes once they recur often enough.
 */
export async function extractDocument(input: ExtractionInput): Promise<ExtractionResult> {
  const { text, taxonomy } = input;

  const { matched: matchedTopics, orphanParent } = matchTopics(text, taxonomy.topics);
  const matchedThemes = matchThemes(text, taxonomy.themes);
  const candidateTerms = unmatchedCandidateTerms(text, taxonomy);

  let state: ExtractionResult["state"] = "untagged";
  if (matchedTopics.length > 0) state = "tagged";
  else if (orphanParent) state = "orphaned";

  return { state, matchedTopics, matchedThemes, orphanParent, candidateTerms };
}
