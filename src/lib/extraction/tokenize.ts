import { STOPWORDS } from "./stopwords";

/** Deterministic pseudo-confidence in [0.55, 0.95] so the same text + same
 * candidate always scores the same, without needing a real model in the loop. */
export function hashConfidence(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 1000;
  }
  return Math.round((0.55 + (h % 400) / 1000) * 1000) / 1000;
}

export function normalize(text: string): string {
  return text.toLowerCase().trim();
}

const WORD_RE = /[a-z0-9']+/g;

export function tokenize(text: string): string[] {
  return normalize(text).match(WORD_RE) ?? [];
}

export function significantTerms(text: string, minLength = 4): string[] {
  const seen = new Set<string>();
  for (const word of tokenize(text)) {
    if (word.length < minLength) continue;
    if (STOPWORDS.has(word)) continue;
    seen.add(word);
  }
  return [...seen];
}

/** Word-boundary-ish substring check so "cost" doesn't match inside "costume". */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return re.test(haystack);
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a).filter((w) => w.length > 2));
  const setB = new Set(tokenize(b).filter((w) => w.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Trims a window of text around the first match of `phrase`, for suggestion excerpts. */
export function excerptAround(text: string, phrase: string, radius = 60): string {
  const lower = normalize(text);
  const idx = lower.indexOf(normalize(phrase));
  if (idx === -1) return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + phrase.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}
