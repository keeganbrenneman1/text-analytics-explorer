import { supabase } from "../supabase";
import type { Database, SuggestionKind, SuggestionStatus } from "../database.types";
import type {
  MergePayload,
  PromotionPayload,
  Suggestion,
  SuggestionPayload,
  ThemeCreationPayload,
  TopicCreationPayload,
} from "../types";

type SuggestionRow = Database["public"]["Tables"]["suggestions"]["Row"];

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

function mapSuggestion(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    status: row.status,
    signature: row.signature,
    confidence: Number(row.confidence),
    payload: row.payload as unknown as SuggestionPayload,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
  };
}

export async function listSuggestions(
  projectId: string,
  opts: { kind?: SuggestionKind; status?: SuggestionStatus; sinceDays?: number } = {},
): Promise<Suggestion[]> {
  let query = client().from("suggestions").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (opts.kind) query = query.eq("kind", opts.kind);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.sinceDays) {
    const since = new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString();
    query = opts.status === "denied" ? query.gte("decided_at", since) : query.gte("created_at", since);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapSuggestion);
}

export async function renameSuggestion(id: string, name: string): Promise<Suggestion> {
  const db = client();
  const { data: row, error } = await db.from("suggestions").select("*").eq("id", id).single();
  if (error) throw error;
  const payload = { ...(row.payload as Record<string, unknown>) };
  if (row.kind === "promotion") payload.proposedTopicName = name;
  else payload.name = name;

  const { data: updated, error: updateErr } = await db.from("suggestions").update({ payload }).eq("id", id).select("*").single();
  if (updateErr) throw updateErr;
  return mapSuggestion(updated);
}

export async function denySuggestion(id: string, deniedBy = "current user"): Promise<Suggestion> {
  const { data, error } = await client()
    .from("suggestions")
    .update({ status: "denied", decided_at: new Date().toISOString(), decided_by: deniedBy })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapSuggestion(data);
}

export async function undenySuggestion(id: string): Promise<Suggestion> {
  const { data, error } = await client()
    .from("suggestions")
    .update({ status: "pending", decided_at: null, decided_by: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapSuggestion(data);
}

async function markConfirmed(id: string, decidedBy: string) {
  const { error } = await client()
    .from("suggestions")
    .update({ status: "confirmed", decided_at: new Date().toISOString(), decided_by: decidedBy })
    .eq("id", id);
  if (error) throw error;
}

async function tagSourceDocumentsTopicOnly(sourceDocumentIds: string[], topicId: string, confidence: number) {
  const db = client();
  for (const documentId of sourceDocumentIds) {
    const { error } = await db
      .from("document_topics")
      .upsert({ document_id: documentId, topic_id: topicId, confidence, orphan: false }, { onConflict: "document_id,topic_id" });
    if (error) throw error;
    const { error: stateErr } = await db.from("documents").update({ state: "tagged" }).eq("id", documentId).neq("state", "tagged");
    if (stateErr) throw stateErr;
  }
}

/** Applies a confirmed suggestion's effect to the taxonomy/documents, then marks it confirmed. */
export async function confirmSuggestion(id: string, decidedBy = "current user"): Promise<Suggestion> {
  const db = client();
  const { data: row, error } = await db.from("suggestions").select("*").eq("id", id).single();
  if (error) throw error;

  if (row.kind === "topic_creation") {
    const payload = row.payload as unknown as TopicCreationPayload;
    let depth: 1 | 2 | 3 = 1;
    if (payload.parentTopicId) {
      const { data: parent, error: parentErr } = await db.from("topics").select("depth").eq("id", payload.parentTopicId).single();
      if (parentErr) throw parentErr;
      depth = Math.min(3, parent.depth + 1) as 1 | 2 | 3;
    }
    const { data: topic, error: topicErr } = await db
      .from("topics")
      .insert({ project_id: row.project_id, parent_id: payload.parentTopicId, name: payload.name, depth, keywords: [payload.name.toLowerCase()] })
      .select("*")
      .single();
    if (topicErr) throw topicErr;

    await tagSourceDocumentsTopicOnly(payload.sourceDocumentIds, topic.id, row.confidence);
    const { error: countErr } = await db.rpc("increment_topic_doc_count", { p_topic_id: topic.id, p_delta: payload.sourceDocumentIds.length });
    if (countErr) throw countErr;
  } else if (row.kind === "theme_creation") {
    const payload = row.payload as unknown as ThemeCreationPayload;
    const { data: theme, error: themeErr } = await db
      .from("themes")
      .insert({ project_id: row.project_id, name: payload.name, keywords: [payload.name.toLowerCase()] })
      .select("*")
      .single();
    if (themeErr) throw themeErr;

    await tagSourceDocumentsThemeOnly(payload.sourceDocumentIds, theme.id, row.confidence);
    const { error: countErr } = await db.rpc("increment_theme_doc_count", { p_theme_id: theme.id, p_delta: payload.sourceDocumentIds.length });
    if (countErr) throw countErr;
  } else if (row.kind === "promotion") {
    const payload = row.payload as unknown as PromotionPayload;
    const { data: topic, error: topicErr } = await db
      .from("topics")
      .insert({ project_id: row.project_id, parent_id: null, name: payload.proposedTopicName, depth: 1, keywords: [payload.themeName.toLowerCase()] })
      .select("*")
      .single();
    if (topicErr) throw topicErr;

    const { data: docThemes, error: dtErr } = await db.from("document_themes").select("document_id, confidence").eq("theme_id", payload.themeId);
    if (dtErr) throw dtErr;
    for (const dt of docThemes ?? []) {
      const { error: insErr } = await db
        .from("document_topics")
        .upsert({ document_id: dt.document_id, topic_id: topic.id, confidence: dt.confidence, orphan: false }, { onConflict: "document_id,topic_id" });
      if (insErr) throw insErr;
      const { error: stateErr } = await db.from("documents").update({ state: "tagged" }).eq("id", dt.document_id).neq("state", "tagged");
      if (stateErr) throw stateErr;
    }
    const { error: countErr } = await db.rpc("increment_topic_doc_count", { p_topic_id: topic.id, p_delta: (docThemes ?? []).length });
    if (countErr) throw countErr;
  } else if (row.kind === "merge") {
    const payload = row.payload as unknown as MergePayload;
    await mergeItems(payload);
  }

  await markConfirmed(id, decidedBy);
  const { data: updated, error: reloadErr } = await db.from("suggestions").select("*").eq("id", id).single();
  if (reloadErr) throw reloadErr;
  return mapSuggestion(updated);
}

async function tagSourceDocumentsThemeOnly(sourceDocumentIds: string[], themeId: string, confidence: number) {
  const db = client();
  for (const documentId of sourceDocumentIds) {
    const { error } = await db
      .from("document_themes")
      .upsert({ document_id: documentId, theme_id: themeId, confidence }, { onConflict: "document_id,theme_id" });
    if (error) throw error;
  }
}

async function mergeItems(payload: MergePayload) {
  const db = client();

  // repoint B's document links to A, skipping ones A already has (unique constraint), then drop leftover B links
  if (payload.itemType === "topic") {
    const { data: bLinks, error: linksErr } = await db.from("document_topics").select("*").eq("topic_id", payload.bId);
    if (linksErr) throw linksErr;
    for (const link of bLinks ?? []) {
      const { error: updateErr } = await db.from("document_topics").update({ topic_id: payload.aId }).eq("id", link.id);
      if (updateErr && updateErr.code !== "23505") throw updateErr; // 23505 = unique violation, A already had this document
    }
    await db.from("document_topics").delete().eq("topic_id", payload.bId);

    const { error: countErr } = await db.from("topics").update({ doc_count: payload.aCount + payload.bCount }).eq("id", payload.aId);
    if (countErr) throw countErr;
    const { error: deleteErr } = await db.from("topics").delete().eq("id", payload.bId);
    if (deleteErr) throw deleteErr;
    return;
  }

  const { data: bLinks, error: linksErr } = await db.from("document_themes").select("*").eq("theme_id", payload.bId);
  if (linksErr) throw linksErr;
  for (const link of bLinks ?? []) {
    const { error: updateErr } = await db.from("document_themes").update({ theme_id: payload.aId }).eq("id", link.id);
    if (updateErr && updateErr.code !== "23505") throw updateErr;
  }
  await db.from("document_themes").delete().eq("theme_id", payload.bId);

  const { error: countErr } = await db.from("themes").update({ doc_count: payload.aCount + payload.bCount }).eq("id", payload.aId);
  if (countErr) throw countErr;
  const { error: deleteErr } = await db.from("themes").delete().eq("id", payload.bId);
  if (deleteErr) throw deleteErr;
}
