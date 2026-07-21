// Same "mock now, real later" seam as the rest of this module: a templated
// stand-in for an LLM-authored description. Swap for a real Claude call by
// implementing the same two function signatures elsewhere and re-exporting
// from index.ts — nothing that calls these needs to change.
//
// Deliberately terse: the topic/theme name is already shown as a heading
// everywhere a description appears, and lineage (parent chain) is shown as
// a visual breadcrumb rather than restated in prose — so all a description
// needs to add is what actually differentiates it: the matching keywords.
// `parentName` is kept on the input shape for a future real-LLM version that
// may want the context, even though the current template doesn't use it.

export interface DescribableTopic {
  name: string;
  keywords: string[];
  parentName?: string | null;
}

export interface DescribableTheme {
  name: string;
  keywords: string[];
}

export function generateTopicDescription(topic: DescribableTopic): string {
  const keywords = topic.keywords.filter((k) => k.toLowerCase() !== topic.name.toLowerCase());
  if (keywords.length === 0) return "No distinguishing keywords yet — matches are based on the topic name alone.";
  return `Typically triggered by language like ${listPhrase(keywords.slice(0, 4))}.`;
}

export function generateThemeDescription(theme: DescribableTheme): string {
  const keywords = theme.keywords.filter((k) => k.toLowerCase() !== theme.name.toLowerCase());
  if (keywords.length === 0) return "No distinguishing keywords yet — matches are based on the theme name alone.";
  return `Often signaled by phrases like ${listPhrase(keywords.slice(0, 4))}.`;
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return `"${items[0]}"`;
  return `${items
    .slice(0, -1)
    .map((i) => `"${i}"`)
    .join(", ")} or "${items[items.length - 1]}"`;
}
