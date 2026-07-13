import type { ThresholdLevel } from "./types";

/** Detection dial: how readily new topic/theme candidates surface from recurring unmatched terms. */
export const DETECTION_PARAMS: Record<ThresholdLevel, { minDocsForThemeCandidate: number; minDocsForTopicCandidate: number }> = {
  conservative: { minDocsForThemeCandidate: 5, minDocsForTopicCandidate: 4 },
  balanced: { minDocsForThemeCandidate: 3, minDocsForTopicCandidate: 3 },
  aggressive: { minDocsForThemeCandidate: 2, minDocsForTopicCandidate: 2 },
};

/** Promotion dial: how readily a recurring theme is proposed for promotion to a topic. */
export const PROMOTION_PARAMS: Record<ThresholdLevel, { minOccurrences: number; minDaysActive: number }> = {
  conservative: { minOccurrences: 20, minDaysActive: 14 },
  balanced: { minOccurrences: 10, minDaysActive: 7 },
  aggressive: { minOccurrences: 5, minDaysActive: 2 },
};

/** Merge dial: name-similarity threshold above which two topics/themes are proposed as a merge. */
export const MERGE_PARAMS: Record<ThresholdLevel, { minSimilarity: number }> = {
  conservative: { minSimilarity: 0.75 },
  balanced: { minSimilarity: 0.55 },
  aggressive: { minSimilarity: 0.4 },
};
