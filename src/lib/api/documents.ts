import { supabase } from "../supabase";
import type { Database } from "../database.types";
import type { DocumentDetail, DocumentSegmentMatch, DocumentSummary, UploadResult } from "../types";
import { extractDocument, type ExtractionResult } from "../extraction";
import { loadTaxonomySnapshot } from "./taxonomy";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function mapSummary(row: DocumentRow, pendingCount: number, topicCount: number): DocumentSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    docKey: row.doc_key,
    name: row.name,
    state: row.state,
    attributes: row.attributes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pendingCount,
    topicCount,
  };
}

/** documentId -> count of pending suggestions that reference it, either directly
 * (creation suggestions carry `sourceDocumentIds`) or via a theme it's tagged
 * with (a pending promotion suggestion on that theme). */
async function pendingCountsByDocument(projectId: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

  const { data: pending, error } = await client()
    .from("suggestions")
    .select("kind, payload")
    .eq("project_id", projectId)
    .eq("status", "pending");
  if (error) throw error;

  const promotionThemeIds: string[] = [];
  for (const s of pending ?? []) {
    if (s.kind === "topic_creation" || s.kind === "theme_creation") {
      const ids = (s.payload as { sourceDocumentIds?: string[] }).sourceDocumentIds;
      ids?.forEach(bump);
    } else if (s.kind === "promotion") {
      const themeId = (s.payload as { themeId?: string }).themeId;
      if (themeId) promotionThemeIds.push(themeId);
    }
  }

  if (promotionThemeIds.length > 0) {
    const { data: docThemes, error: dtErr } = await client()
      .from("document_themes")
      .select("document_id, theme_id")
      .in("theme_id", promotionThemeIds);
    if (dtErr) throw dtErr;
    docThemes?.forEach((row) => bump(row.document_id));
  }

  return counts;
}

async function summarizeDocuments(projectId: string, rows: DocumentRow[]): Promise<DocumentSummary[]> {
  const topicCounts = new Map<string, number>();
  const [pendingCounts] = await Promise.all([
    pendingCountsByDocument(projectId),
    rows.length === 0
      ? Promise.resolve()
      : client()
          .from("document_topics")
          .select("document_id")
          .eq("orphan", false)
          .in(
            "document_id",
            rows.map((r) => r.id),
          )
          .then(({ data: topicCountRows, error: tcErr }) => {
            if (tcErr) throw tcErr;
            for (const row of topicCountRows ?? []) {
              topicCounts.set(row.document_id, (topicCounts.get(row.document_id) ?? 0) + 1);
            }
          }),
  ]);

  return rows.map((row) => mapSummary(row, pendingCounts.get(row.id) ?? 0, topicCounts.get(row.id) ?? 0));
}

export async function listDocuments(
  projectId: string,
  filter: "all" | "tagged" | "orphaned" | "untagged" | "pending" = "all",
): Promise<DocumentSummary[]> {
  let query = client().from("documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (filter === "tagged" || filter === "orphaned" || filter === "untagged") {
    query = query.eq("state", filter);
  }
  const { data, error } = await query;
  if (error) throw error;

  const summaries = await summarizeDocuments(projectId, data ?? []);
  return filter === "pending" ? summaries.filter((d) => d.pendingCount > 0) : summaries;
}

/** Documents confirmed under any of the given topics (OR) — powers the Reports/Taxonomy
 * "drill into documents" actions and the Documents screen's multi-select topic filter. */
export async function listDocumentsByTopics(projectId: string, topicIds: string[]): Promise<DocumentSummary[]> {
  if (topicIds.length === 0) return [];
  const db = client();
  const { data: links, error: linkErr } = await db.from("document_topics").select("document_id").in("topic_id", topicIds).eq("orphan", false);
  if (linkErr) throw linkErr;
  const ids = [...new Set((links ?? []).map((l) => l.document_id))];
  if (ids.length === 0) return [];

  const { data: rows, error } = await db.from("documents").select("*").eq("project_id", projectId).in("id", ids).order("created_at", { ascending: false });
  if (error) throw error;
  return summarizeDocuments(projectId, rows ?? []);
}

/** Documents tagged with any of the given themes (OR). */
export async function listDocumentsByThemes(projectId: string, themeIds: string[]): Promise<DocumentSummary[]> {
  if (themeIds.length === 0) return [];
  const db = client();
  const { data: links, error: linkErr } = await db.from("document_themes").select("document_id").in("theme_id", themeIds);
  if (linkErr) throw linkErr;
  const ids = [...new Set((links ?? []).map((l) => l.document_id))];
  if (ids.length === 0) return [];

  const { data: rows, error } = await db.from("documents").select("*").eq("project_id", projectId).in("id", ids).order("created_at", { ascending: false });
  if (error) throw error;
  return summarizeDocuments(projectId, rows ?? []);
}

/** Documents whose `attributes[key]` equals `value` — powers the Upload screen's
 * source clickthrough and Reports' attribute filter. */
export async function listDocumentsByAttribute(projectId: string, key: string, value: string | number): Promise<DocumentSummary[]> {
  const db = client();
  const { data: rows, error } = await db
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .contains("attributes", { [key]: value })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return summarizeDocuments(projectId, rows ?? []);
}

export async function getDocumentDetail(documentId: string): Promise<DocumentDetail> {
  const { data: row, error } = await client().from("documents").select("*").eq("id", documentId).single();
  if (error) throw error;

  const [{ data: topicMatches, error: tErr }, { data: themeMatches, error: thErr }, pendingCounts] = await Promise.all([
    client().from("document_topics").select("*").eq("document_id", documentId),
    client().from("document_themes").select("*").eq("document_id", documentId),
    pendingCountsByDocument(row.project_id),
  ]);
  if (tErr) throw tErr;
  if (thErr) throw thErr;

  const [{ data: allProjectTopics, error: tnErr }, { data: themeNameRows, error: thnErr }] = await Promise.all([
    client().from("topics").select("id, name, description, parent_id").eq("project_id", row.project_id),
    client()
      .from("themes")
      .select("id, name, description")
      .in("id", (themeMatches ?? []).map((m) => m.theme_id)),
  ]);
  if (tnErr) throw tnErr;
  if (thnErr) throw thnErr;
  const topicById = new Map((allProjectTopics ?? []).map((t) => [t.id, t]));
  const themeNames = new Map((themeNameRows ?? []).map((t) => [t.id, t.name]));
  const themeDescriptions = new Map((themeNameRows ?? []).map((t) => [t.id, t.description]));

  const topicBreadcrumb = (topicId: string): string[] => {
    const chain: string[] = [];
    let current = topicById.get(topicId)?.parent_id ?? null;
    while (current) {
      const parent = topicById.get(current);
      if (!parent) break;
      chain.unshift(parent.name);
      current = parent.parent_id;
    }
    return chain;
  };

  const { data: pendingSuggestions, error: sErr } = await client()
    .from("suggestions")
    .select("kind, payload")
    .eq("project_id", row.project_id)
    .eq("status", "pending");
  if (sErr) throw sErr;

  const pendingTopicIds = new Set<string>();
  const pendingThemeIds = new Set<string>();
  for (const s of pendingSuggestions ?? []) {
    if (s.kind === "topic_creation") {
      const ids = (s.payload as { sourceDocumentIds?: string[] }).sourceDocumentIds ?? [];
      if (ids.includes(documentId)) {
        const parentId = (s.payload as { parentTopicId?: string }).parentTopicId;
        if (parentId) pendingTopicIds.add(parentId);
      }
    } else if (s.kind === "promotion") {
      const themeId = (s.payload as { themeId?: string }).themeId;
      if (themeId) pendingThemeIds.add(themeId);
    } else if (s.kind === "theme_creation") {
      const ids = (s.payload as { sourceDocumentIds?: string[] }).sourceDocumentIds ?? [];
      if (ids.includes(documentId)) pendingThemeIds.add("__new_theme__");
    }
  }

  const matches: DocumentSegmentMatch[] = [
    ...(topicMatches ?? []).map((m): DocumentSegmentMatch => ({
      kind: "topic",
      id: m.topic_id,
      label: topicById.get(m.topic_id)?.name ?? "Unknown topic",
      breadcrumb: topicBreadcrumb(m.topic_id),
      description: topicById.get(m.topic_id)?.description ?? null,
      excerpt: m.excerpt ?? "",
      confidence: Number(m.confidence),
      orphan: m.orphan,
      pending: m.orphan ? pendingTopicIds.has(m.topic_id) : false,
    })),
    ...(themeMatches ?? []).map((m): DocumentSegmentMatch => ({
      kind: "theme",
      id: m.theme_id,
      label: themeNames.get(m.theme_id) ?? "Unknown theme",
      breadcrumb: [],
      description: themeDescriptions.get(m.theme_id) ?? null,
      excerpt: m.excerpt ?? "",
      confidence: Number(m.confidence),
      orphan: false,
      pending: pendingThemeIds.has(m.theme_id),
    })),
  ];

  const topicCount = matches.filter((m) => m.kind === "topic" && !m.orphan).length;

  return {
    ...mapSummary(row, pendingCounts.get(row.id) ?? 0, topicCount),
    content: row.content,
    matches,
  };
}

async function applyExtractionResult(projectId: string, documentId: string, result: ExtractionResult) {
  const db = client();

  for (const topic of result.matchedTopics) {
    const { error } = await db.from("document_topics").insert({
      document_id: documentId,
      topic_id: topic.topicId,
      confidence: topic.confidence,
      excerpt: topic.excerpt,
      orphan: false,
    });
    if (error) throw error;
    const { error: rpcErr } = await db.rpc("increment_topic_doc_count", { p_topic_id: topic.topicId, p_delta: 1 });
    if (rpcErr) throw rpcErr;
  }

  for (const theme of result.matchedThemes) {
    const { error } = await db.from("document_themes").insert({
      document_id: documentId,
      theme_id: theme.themeId,
      confidence: theme.confidence,
      excerpt: theme.excerpt,
    });
    if (error) throw error;
    const { error: rpcErr } = await db.rpc("increment_theme_doc_count", { p_theme_id: theme.themeId, p_delta: 1 });
    if (rpcErr) throw rpcErr;
  }

  if (result.orphanParent) {
    const { error } = await db.from("document_topics").insert({
      document_id: documentId,
      topic_id: result.orphanParent.topicId,
      confidence: 0,
      excerpt: null,
      orphan: true,
    });
    if (error) throw error;
  }

  void projectId;
}

async function clearPriorMatches(documentId: string) {
  const db = client();

  const { data: priorTopics, error: ptErr } = await db.from("document_topics").select("topic_id, orphan").eq("document_id", documentId);
  if (ptErr) throw ptErr;
  for (const row of priorTopics ?? []) {
    if (!row.orphan) {
      const { error } = await db.rpc("increment_topic_doc_count", { p_topic_id: row.topic_id, p_delta: -1 });
      if (error) throw error;
    }
  }

  const { data: priorThemes, error: pthErr } = await db.from("document_themes").select("theme_id").eq("document_id", documentId);
  if (pthErr) throw pthErr;
  for (const row of priorThemes ?? []) {
    const { error } = await db.rpc("increment_theme_doc_count", { p_theme_id: row.theme_id, p_delta: -1 });
    if (error) throw error;
  }

  await db.from("document_topics").delete().eq("document_id", documentId);
  await db.from("document_themes").delete().eq("document_id", documentId);
}

/**
 * Upload (or re-upload) a document. `docKey` is the identity used to detect
 * duplicates within a project — defaults to the file name. An identical
 * re-upload (same key, same content) is blocked; a same-key upload with
 * different content replaces the prior version and is fully reprocessed.
 */
export async function uploadDocument(
  projectId: string,
  name: string,
  content: string,
  docKey: string = name,
  attributes: Record<string, string | number> = {},
): Promise<UploadResult> {
  const db = client();
  const contentHash = await sha256(content);
  const taxonomy = await loadTaxonomySnapshot(projectId);

  const { data: existing, error: findErr } = await db
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .eq("doc_key", docKey)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing && existing.content_hash === contentHash) {
    return { status: "blocked_duplicate", document: await getDocumentDetail(existing.id) };
  }

  const { data: project, error: projErr } = await db.from("projects").select("detection_threshold").eq("id", projectId).single();
  if (projErr) throw projErr;

  const result = await extractDocument({ text: content, taxonomy, detectionThreshold: project.detection_threshold });

  if (existing) {
    await clearPriorMatches(existing.id);
    const { error: updateErr } = await db
      .from("documents")
      .update({ content, content_hash: contentHash, state: result.state, attributes })
      .eq("id", existing.id);
    if (updateErr) throw updateErr;
    await applyExtractionResult(projectId, existing.id, result);
    return { status: "replaced", document: await getDocumentDetail(existing.id) };
  }

  const { data: inserted, error: insertErr } = await db
    .from("documents")
    .insert({ project_id: projectId, doc_key: docKey, name, content, content_hash: contentHash, state: result.state, attributes })
    .select("*")
    .single();
  if (insertErr) throw insertErr;

  await applyExtractionResult(projectId, inserted.id, result);
  return { status: "created", document: await getDocumentDetail(inserted.id) };
}

export async function getStateBreakdown(projectId: string): Promise<{ tagged: number; orphaned: number; untagged: number; total: number }> {
  const { data, error } = await client().from("documents").select("state").eq("project_id", projectId);
  if (error) throw error;
  const rows = data ?? [];
  const tagged = rows.filter((r) => r.state === "tagged").length;
  const orphaned = rows.filter((r) => r.state === "orphaned").length;
  const untagged = rows.filter((r) => r.state === "untagged").length;
  return { tagged, orphaned, untagged, total: rows.length };
}
