// Shared types for the extraction/mining seam. Everything in `src/lib/extraction`
// is intentionally decoupled from Supabase — it only knows about plain data
// structures, so the mock implementation can be swapped for a real Claude call
// later without touching the API layer or any UI code.

export type ThresholdLevel = "conservative" | "balanced" | "aggressive";

export type DocumentState = "tagged" | "orphaned" | "untagged";

export interface TopicRef {
  id: string;
  name: string;
  parentId: string | null;
  depth: 1 | 2 | 3;
  keywords: string[];
  docCount: number;
}

export interface ThemeRef {
  id: string;
  name: string;
  keywords: string[];
  polarity?: "positive" | "negative" | "neutral" | null;
  docCount: number;
  firstSeenAt: string;
}

export interface TaxonomySnapshot {
  topics: TopicRef[];
  themes: ThemeRef[];
}

export interface MatchedTopic {
  topicId: string;
  name: string;
  parentId: string | null;
  confidence: number;
  excerpt: string;
}

export interface MatchedTheme {
  themeId: string;
  name: string;
  confidence: number;
  excerpt: string;
}

export interface ExtractionInput {
  text: string;
  taxonomy: TaxonomySnapshot;
  detectionThreshold: ThresholdLevel;
}

export interface ExtractionResult {
  state: DocumentState;
  matchedTopics: MatchedTopic[];
  matchedThemes: MatchedTheme[];
  orphanParent: { topicId: string; name: string } | null;
  /** Significant tokens that matched nothing in the existing taxonomy — feeds mining's creation candidates. */
  candidateTerms: string[];
}

/** The single seam the rest of the app depends on. Swap `mockExtractor` for a
 * real-LLM implementation with this same signature and nothing else changes. */
export type Extractor = (input: ExtractionInput) => Promise<ExtractionResult>;
