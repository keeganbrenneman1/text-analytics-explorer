import { supabase } from "../supabase";
import { computeSuggestions } from "../extraction";
import { loadTaxonomySnapshot } from "./taxonomy";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

/** Signatures currently pending, or denied within the last 30 days — both suppress a re-raised suggestion. */
async function suppressedSignatures(projectId: string): Promise<Set<string>> {
  const db = client();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [{ data: pending, error: pErr }, { data: denied, error: dErr }] = await Promise.all([
    db.from("suggestions").select("signature").eq("project_id", projectId).eq("status", "pending"),
    db.from("suggestions").select("signature").eq("project_id", projectId).eq("status", "denied").gte("decided_at", thirtyDaysAgo),
  ]);
  if (pErr) throw pErr;
  if (dErr) throw dErr;

  return new Set([...(pending ?? []), ...(denied ?? [])].map((r) => r.signature));
}

/**
 * Runs mining for a project: re-extracts every document against the current
 * taxonomy, aggregates the signal (recurring unmatched terms, orphan
 * clusters, theme occurrence/age, name-similar pairs), and inserts any newly
 * proposed suggestions. Safe to re-run — signatures already pending or
 * recently denied are skipped, and the active-signature unique index is a
 * second line of defense against duplicates.
 */
export async function runMining(projectId: string): Promise<{ created: number }> {
  const db = client();

  const [{ data: project, error: projErr }, taxonomy, { data: documents, error: docErr }, suppressed] = await Promise.all([
    db.from("projects").select("detection_threshold, promotion_threshold, merge_threshold").eq("id", projectId).single(),
    loadTaxonomySnapshot(projectId),
    db.from("documents").select("id, content").eq("project_id", projectId),
    suppressedSignatures(projectId),
  ]);
  if (projErr) throw projErr;
  if (docErr) throw docErr;

  const { suggestions } = await computeSuggestions({
    project: {
      detectionThreshold: project.detection_threshold,
      promotionThreshold: project.promotion_threshold,
      mergeThreshold: project.merge_threshold,
    },
    taxonomy,
    documents: (documents ?? []).map((d) => ({ id: d.id, text: d.content })),
    suppressedSignatures: suppressed,
  });

  if (suggestions.length === 0) return { created: 0 };

  const { error: insertErr } = await db.from("suggestions").insert(
    suggestions.map((s) => ({
      project_id: projectId,
      kind: s.kind,
      signature: s.signature,
      confidence: s.confidence,
      payload: s.payload,
    })),
  );
  // Unique-index conflicts mean another pending suggestion with the same signature
  // slipped in between our suppression check and this insert — safe to ignore.
  if (insertErr && insertErr.code !== "23505") throw insertErr;

  return { created: suggestions.length };
}
