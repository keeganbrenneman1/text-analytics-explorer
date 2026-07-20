// Public interface of the extraction subsystem. Everything upstream (the API
// layer, UI, sandbox) imports from here — never from `mockExtractor` directly.
//
// To swap in a real Claude-backed extractor later: implement `Extractor`
// (see types.ts) in a new `claudeExtractor.ts`, then change the export below
// from `mockExtractor` to it. `mining.ts` calls `extractDocument` internally,
// so the batch/suggestion logic upgrades for free — no caller changes needed.

export { extractDocument } from "./mockExtractor";
export { computeSuggestions } from "./mining";
export { DETECTION_PARAMS, MERGE_PARAMS, PROMOTION_PARAMS } from "./thresholds";
export { hashConfidence, jaccardSimilarity, titleCase } from "./tokenize";
export { generateTopicDescription, generateThemeDescription } from "./description";

export type {
  DocumentState,
  ExtractionInput,
  ExtractionResult,
  Extractor,
  MatchedTheme,
  MatchedTopic,
  TaxonomySnapshot,
  ThemeRef,
  ThresholdLevel,
  TopicRef,
} from "./types";

export type { MiningDocument, MiningInput, MiningOutput, MiningProject, ProposedSuggestion, SuggestionKind } from "./mining";
export type { DescribableTheme, DescribableTopic } from "./description";
