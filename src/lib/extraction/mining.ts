import { extractDocument } from "./mockExtractor";
import { DETECTION_PARAMS, MERGE_PARAMS, PROMOTION_PARAMS } from "./thresholds";
import { jaccardSimilarity, titleCase } from "./tokenize";
import type { TaxonomySnapshot, ThemeRef, ThresholdLevel, TopicRef } from "./types";

export interface MiningDocument {
  id: string;
  text: string;
}

export interface MiningProject {
  detectionThreshold: ThresholdLevel;
  promotionThreshold: ThresholdLevel;
  mergeThreshold: ThresholdLevel;
}

export type SuggestionKind = "topic_creation" | "theme_creation" | "promotion" | "merge";

export interface ProposedSuggestion {
  kind: SuggestionKind;
  /** Normalized dedup key: re-running mining shouldn't raise the same suggestion twice. */
  signature: string;
  confidence: number;
  payload: Record<string, unknown>;
}

export interface MiningInput {
  project: MiningProject;
  taxonomy: TaxonomySnapshot;
  documents: MiningDocument[];
  /** Signatures already pending, or denied within the last 30 days — both get suppressed. */
  suppressedSignatures: Set<string>;
}

export interface MiningOutput {
  suggestions: ProposedSuggestion[];
}

/**
 * Batch counterpart to `extractDocument`. Re-runs extraction across every
 * document against the *current* taxonomy (cheap at mock-scale, and rerun-safe
 * since nothing is cached) and turns the aggregate signal — recurring unmatched
 * terms, recurring orphan parents, theme occurrence counts, name-similar pairs
 * — into proposed suggestions. Nothing here touches Supabase; the caller
 * persists whatever comes back.
 */
export async function computeSuggestions(input: MiningInput): Promise<MiningOutput> {
  const { project, taxonomy, documents, suppressedSignatures } = input;
  const suggestions: ProposedSuggestion[] = [];

  const termStats = new Map<string, { count: number; docIds: string[]; excerpt: string }>();
  const orphanStats = new Map<
    string,
    { parentName: string; count: number; docIds: string[]; termCounts: Map<string, number>; excerpt: string }
  >();

  for (const doc of documents) {
    const result = await extractDocument({
      text: doc.text,
      taxonomy,
      detectionThreshold: project.detectionThreshold,
    });

    for (const term of result.candidateTerms) {
      const stat = termStats.get(term) ?? { count: 0, docIds: [], excerpt: doc.text };
      stat.count += 1;
      stat.docIds.push(doc.id);
      termStats.set(term, stat);
    }

    if (result.orphanParent) {
      const key = result.orphanParent.topicId;
      const stat = orphanStats.get(key) ?? {
        parentName: result.orphanParent.name,
        count: 0,
        docIds: [],
        termCounts: new Map<string, number>(),
        excerpt: doc.text,
      };
      stat.count += 1;
      stat.docIds.push(doc.id);
      for (const term of result.candidateTerms) {
        stat.termCounts.set(term, (stat.termCounts.get(term) ?? 0) + 1);
      }
      orphanStats.set(key, stat);
    }
  }

  const detectionParams = DETECTION_PARAMS[project.detectionThreshold];

  for (const [term, stat] of termStats) {
    if (stat.count < detectionParams.minDocsForThemeCandidate) continue;
    const signature = `theme_creation:${term}`;
    if (suppressedSignatures.has(signature)) continue;
    suggestions.push({
      kind: "theme_creation",
      signature,
      confidence: Math.min(0.95, 0.5 + stat.count * 0.05),
      payload: {
        name: titleCase(term),
        excerpt: stat.excerpt,
        docCount: stat.count,
        sourceDocumentIds: stat.docIds.slice(0, 10),
      },
    });
  }

  for (const [parentTopicId, stat] of orphanStats) {
    if (stat.count < detectionParams.minDocsForTopicCandidate) continue;
    const topTerm = [...stat.termCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const name = topTerm ? titleCase(topTerm) : `${stat.parentName} — new subtopic`;
    const signature = `topic_creation:${parentTopicId}:${topTerm ?? "general"}`;
    if (suppressedSignatures.has(signature)) continue;
    suggestions.push({
      kind: "topic_creation",
      signature,
      confidence: Math.min(0.95, 0.5 + stat.count * 0.05),
      payload: {
        name,
        parentTopicId,
        parentName: stat.parentName,
        excerpt: stat.excerpt,
        docCount: stat.count,
        sourceDocumentIds: stat.docIds.slice(0, 10),
      },
    });
  }

  const promotionParams = PROMOTION_PARAMS[project.promotionThreshold];
  const now = Date.now();
  for (const theme of taxonomy.themes) {
    const daysActive = (now - new Date(theme.firstSeenAt).getTime()) / 86_400_000;
    if (theme.docCount < promotionParams.minOccurrences) continue;
    if (daysActive < promotionParams.minDaysActive) continue;
    const signature = `promotion:${theme.id}`;
    if (suppressedSignatures.has(signature)) continue;
    suggestions.push({
      kind: "promotion",
      signature,
      confidence: Math.min(0.95, 0.5 + theme.docCount * 0.02),
      payload: {
        themeId: theme.id,
        themeName: theme.name,
        proposedTopicName: titleCase(theme.name),
        occurrences: theme.docCount,
        daysActive: Math.round(daysActive),
      },
    });
  }

  const mergeParams = MERGE_PARAMS[project.mergeThreshold];

  const siblingsByParent = new Map<string | null, TopicRef[]>();
  for (const t of taxonomy.topics) {
    const bucket = siblingsByParent.get(t.parentId) ?? [];
    bucket.push(t);
    siblingsByParent.set(t.parentId, bucket);
  }
  for (const siblings of siblingsByParent.values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        pushMergeIfSimilar(suggestions, "topic", siblings[i], siblings[j], mergeParams.minSimilarity, suppressedSignatures);
      }
    }
  }
  for (let i = 0; i < taxonomy.themes.length; i++) {
    for (let j = i + 1; j < taxonomy.themes.length; j++) {
      pushMergeIfSimilar(suggestions, "theme", taxonomy.themes[i], taxonomy.themes[j], mergeParams.minSimilarity, suppressedSignatures);
    }
  }

  return { suggestions };
}

function pushMergeIfSimilar(
  suggestions: ProposedSuggestion[],
  itemType: "topic" | "theme",
  a: TopicRef | ThemeRef,
  b: TopicRef | ThemeRef,
  minSimilarity: number,
  suppressedSignatures: Set<string>,
) {
  const similarity = jaccardSimilarity(a.name, b.name);
  if (similarity < minSimilarity) return;
  const [first, second] = [a, b].sort((x, y) => x.id.localeCompare(y.id));
  const signature = `merge:${itemType}:${first.id}:${second.id}`;
  if (suppressedSignatures.has(signature)) return;
  suggestions.push({
    kind: "merge",
    signature,
    confidence: Math.round(similarity * 1000) / 1000,
    payload: {
      itemType,
      aId: first.id,
      aName: first.name,
      aCount: first.docCount,
      bId: second.id,
      bName: second.name,
      bCount: second.docCount,
    },
  });
}
