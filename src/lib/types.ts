import type { DocumentState, SuggestionKind, SuggestionStatus, ThresholdLevel } from "./database.types";

export type { DocumentState, SuggestionKind, SuggestionStatus, ThresholdLevel };

export interface Project {
  id: string;
  name: string;
  detectionThreshold: ThresholdLevel;
  promotionThreshold: ThresholdLevel;
  mergeThreshold: ThresholdLevel;
  createdAt: string;
}

export interface Topic {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  depth: 1 | 2 | 3;
  keywords: string[];
  docCount: number;
  createdAt: string;
}

export interface TopicNode extends Topic {
  children: TopicNode[];
}

export interface Theme {
  id: string;
  projectId: string;
  name: string;
  keywords: string[];
  docCount: number;
  firstSeenAt: string;
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  projectId: string;
  docKey: string;
  name: string;
  state: DocumentState;
  createdAt: string;
  updatedAt: string;
  pendingCount: number;
  topicCount: number;
}

export interface DocumentSegmentMatch {
  kind: "topic" | "theme";
  id: string;
  label: string;
  excerpt: string;
  confidence: number;
  orphan: boolean;
  pending: boolean;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
  matches: DocumentSegmentMatch[];
}

export interface UploadResult {
  status: "created" | "replaced" | "blocked_duplicate";
  document?: DocumentDetail;
}

// --- suggestion payloads (discriminated by `kind`) -------------------------

export interface TopicCreationPayload {
  name: string;
  parentTopicId: string | null;
  parentName?: string;
  excerpt: string;
  docCount: number;
  sourceDocumentIds: string[];
}

export interface ThemeCreationPayload {
  name: string;
  excerpt: string;
  docCount: number;
  sourceDocumentIds: string[];
}

export interface PromotionPayload {
  themeId: string;
  themeName: string;
  proposedTopicName: string;
  occurrences: number;
  daysActive: number;
}

export interface MergePayload {
  itemType: "topic" | "theme";
  aId: string;
  aName: string;
  aCount: number;
  bId: string;
  bName: string;
  bCount: number;
}

export type SuggestionPayload = TopicCreationPayload | ThemeCreationPayload | PromotionPayload | MergePayload;

export interface Suggestion<P = SuggestionPayload> {
  id: string;
  projectId: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  signature: string;
  confidence: number;
  payload: P;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface StarterTopicSeed {
  name: string;
  keywords: string[];
  children?: StarterTopicSeed[];
}

export interface StarterThemeSeed {
  name: string;
  keywords: string[];
}

export interface StarterDocumentSeed {
  docKey: string;
  name: string;
  content: string;
}

export type DocFilter =
  | { kind: "state"; state: "all" | DocumentState }
  | { kind: "pending" }
  | { kind: "topic"; topicId: string; topicName: string };

export interface StarterModel {
  key: string;
  name: string;
  description: string;
  topics: StarterTopicSeed[];
  themes: StarterThemeSeed[];
  documents: StarterDocumentSeed[];
}
