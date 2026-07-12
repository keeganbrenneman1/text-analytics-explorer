import type { MergePayload, PromotionPayload, Suggestion, SuggestionKind, ThemeCreationPayload, TopicCreationPayload } from "../lib/types";

export const KIND_LABEL: Record<SuggestionKind, string> = {
  topic_creation: "Topic creation",
  theme_creation: "Theme creation",
  promotion: "Promotion",
  merge: "Merge",
};

export function describeSuggestion(s: Suggestion): string {
  switch (s.kind) {
    case "topic_creation":
      return (s.payload as TopicCreationPayload).name;
    case "theme_creation":
      return (s.payload as ThemeCreationPayload).name;
    case "promotion": {
      const p = s.payload as PromotionPayload;
      return `${p.themeName} → ${p.proposedTopicName}`;
    }
    case "merge": {
      const p = s.payload as MergePayload;
      return `${p.aName} + ${p.bName}`;
    }
    default:
      return "";
  }
}
