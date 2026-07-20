// Same "mock now, real later" seam as the rest of this module: a templated
// stand-in for an LLM-authored description. Swap for a real Claude call by
// implementing the same two function signatures elsewhere and re-exporting
// from index.ts — nothing that calls these needs to change.

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
  const keywordPhrase = keywords.length > 0 ? ` Typically triggered by language like ${listPhrase(keywords.slice(0, 4))}.` : "";
  const parentPhrase = topic.parentName ? ` A subtopic under ${topic.parentName}.` : "";
  return `Documents about ${lowerFirst(topic.name)}.${parentPhrase}${keywordPhrase}`.trim();
}

export function generateThemeDescription(theme: DescribableTheme): string {
  const keywords = theme.keywords.filter((k) => k.toLowerCase() !== theme.name.toLowerCase());
  const keywordPhrase = keywords.length > 0 ? ` Often signaled by phrases like ${listPhrase(keywords.slice(0, 4))}.` : "";
  return `A recurring why/how pattern around ${lowerFirst(theme.name)}, not a fixed category.${keywordPhrase}`.trim();
}

function lowerFirst(s: string): string {
  return s.length ? s[0].toLowerCase() + s.slice(1) : s;
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return `"${items[0]}"`;
  return `${items
    .slice(0, -1)
    .map((i) => `"${i}"`)
    .join(", ")} or "${items[items.length - 1]}"`;
}
