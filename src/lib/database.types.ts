// Hand-written to match supabase/migrations/0001_init.sql. If the schema
// changes, regenerate with `supabase gen types typescript` once the project
// is linked, or update this file to match.

export type ThresholdLevel = "conservative" | "balanced" | "aggressive";
export type DocumentState = "tagged" | "orphaned" | "untagged";
export type SuggestionKind = "topic_creation" | "theme_creation" | "promotion" | "merge";
export type SuggestionStatus = "pending" | "confirmed" | "denied";
export type Polarity = "positive" | "negative" | "neutral";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          detection_threshold: ThresholdLevel;
          promotion_threshold: ThresholdLevel;
          merge_threshold: ThresholdLevel;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          detection_threshold?: ThresholdLevel;
          promotion_threshold?: ThresholdLevel;
          merge_threshold?: ThresholdLevel;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          project_id: string;
          parent_id: string | null;
          name: string;
          depth: 1 | 2 | 3;
          keywords: string[];
          doc_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_id?: string | null;
          name: string;
          depth: 1 | 2 | 3;
          keywords?: string[];
          doc_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["topics"]["Insert"]>;
        Relationships: [];
      };
      themes: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          keywords: string[];
          polarity: Polarity | null;
          doc_count: number;
          first_seen_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          keywords?: string[];
          polarity?: Polarity | null;
          doc_count?: number;
          first_seen_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["themes"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          doc_key: string;
          name: string;
          content: string;
          content_hash: string;
          state: DocumentState;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          doc_key: string;
          name: string;
          content: string;
          content_hash: string;
          state: DocumentState;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      document_topics: {
        Row: {
          id: string;
          document_id: string;
          topic_id: string;
          confidence: number;
          excerpt: string | null;
          orphan: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          topic_id: string;
          confidence?: number;
          excerpt?: string | null;
          orphan?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_topics"]["Insert"]>;
        Relationships: [];
      };
      document_themes: {
        Row: {
          id: string;
          document_id: string;
          theme_id: string;
          confidence: number;
          excerpt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          theme_id: string;
          confidence?: number;
          excerpt?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_themes"]["Insert"]>;
        Relationships: [];
      };
      suggestions: {
        Row: {
          id: string;
          project_id: string;
          kind: SuggestionKind;
          status: SuggestionStatus;
          signature: string;
          confidence: number;
          payload: Record<string, unknown>;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          kind: SuggestionKind;
          status?: SuggestionStatus;
          signature: string;
          confidence?: number;
          payload?: Record<string, unknown>;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["suggestions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_topic_doc_count: { Args: { p_topic_id: string; p_delta: number }; Returns: void };
      increment_theme_doc_count: { Args: { p_theme_id: string; p_delta: number }; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
