import { supabase } from "../supabase";
import type { Project, ThresholdLevel } from "../types";
import type { Database } from "../database.types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    detectionThreshold: row.detection_threshold,
    promotionThreshold: row.promotion_threshold,
    mergeThreshold: row.merge_threshold,
    createdAt: row.created_at,
  };
}

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await client().from("projects").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProject);
}

export async function createProject(name: string): Promise<Project> {
  const { data, error } = await client().from("projects").insert({ name }).select("*").single();
  if (error) throw error;
  return mapProject(data);
}

export async function updateProjectThresholds(
  projectId: string,
  thresholds: Partial<{ detectionThreshold: ThresholdLevel; promotionThreshold: ThresholdLevel; mergeThreshold: ThresholdLevel }>,
): Promise<Project> {
  const patch: Database["public"]["Tables"]["projects"]["Update"] = {};
  if (thresholds.detectionThreshold) patch.detection_threshold = thresholds.detectionThreshold;
  if (thresholds.promotionThreshold) patch.promotion_threshold = thresholds.promotionThreshold;
  if (thresholds.mergeThreshold) patch.merge_threshold = thresholds.mergeThreshold;

  const { data, error } = await client().from("projects").update(patch).eq("id", projectId).select("*").single();
  if (error) throw error;
  return mapProject(data);
}
