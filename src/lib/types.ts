import type { AttributeType, DocumentState, SuggestionKind, SuggestionStatus, ThresholdLevel } from "./database.types";

export type { AttributeType, DocumentState, SuggestionKind, SuggestionStatus, ThresholdLevel };

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
  description: string | null;
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
  description: string | null;
  docCount: number;
  firstSeenAt: string;
  createdAt: string;
}

export type AttributeValue = string | number;

export interface ProjectAttribute {
  id: string;
  projectId: string;
  key: string;
  label: string;
  type: AttributeType;
  options: string[];
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  projectId: string;
  docKey: string;
  name: string;
  state: DocumentState;
  attributes: Record<string, AttributeValue>;
  createdAt: string;
  updatedAt: string;
  pendingCount: number;
  topicCount: number;
}

export interface DocumentSegmentMatch {
  kind: "topic" | "theme";
  id: string;
  label: string;
  /** Ancestor names, root-first, excluding this node itself — empty for themes and top-level topics. */
  breadcrumb: string[];
  description: string | null;
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
  description: string;
  children?: StarterTopicSeed[];
}

export interface StarterThemeSeed {
  name: string;
  keywords: string[];
  description: string;
}

export interface StarterAttributeSeed {
  key: string;
  label: string;
  type: AttributeType;
  options?: string[];
}

export interface StarterDocumentSeed {
  docKey: string;
  name: string;
  content: string;
  attributes?: Record<string, AttributeValue>;
}

export interface NamedId {
  id: string;
  name: string;
}

export type DocFilter =
  | { kind: "state"; state: "all" | DocumentState }
  | { kind: "pending" }
  | { kind: "topic"; topics: NamedId[] }
  | { kind: "theme"; themes: NamedId[] }
  | { kind: "attribute"; key: string; label: string; value: AttributeValue };

export interface StarterModel {
  key: string;
  name: string;
  description: string;
  topics: StarterTopicSeed[];
  themes: StarterThemeSeed[];
  attributes: StarterAttributeSeed[];
  documents: StarterDocumentSeed[];
}
