import { supabase } from "../supabase";
import { extractDocument, type ExtractionResult } from "../extraction";
import { loadTaxonomySnapshot } from "./taxonomy";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

/**
 * Non-persistent preview: runs the same `extractDocument` seam a real upload
 * would use, against the project's current taxonomy, but writes nothing —
 * no document, no suggestion, no count change.
 */
export async function analyzeSandboxText(projectId: string, text: string): Promise<ExtractionResult> {
  const [{ data: project, error }, taxonomy] = await Promise.all([
    client().from("projects").select("detection_threshold").eq("id", projectId).single(),
    loadTaxonomySnapshot(projectId),
  ]);
  if (error) throw error;

  return extractDocument({ text, taxonomy, detectionThreshold: project.detection_threshold });
}
