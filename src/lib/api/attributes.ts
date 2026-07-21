import { supabase } from "../supabase";
import type { AttributeValue, ProjectAttribute } from "../types";
import type { Database } from "../database.types";

type AttributeRow = Database["public"]["Tables"]["project_attributes"]["Row"];

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

function mapAttribute(row: AttributeRow): ProjectAttribute {
  return {
    id: row.id,
    projectId: row.project_id,
    key: row.key,
    label: row.label,
    type: row.type,
    options: row.options,
    createdAt: row.created_at,
  };
}

/** Projects created before the structured-attribute registry existed have zero
 * rows here, which would silently hide the Source field and Reports'
 * attribute breakdown. Self-heal by seeding one default attribute the first
 * time a project with none is loaded. */
async function ensureDefaultAttribute(projectId: string): Promise<ProjectAttribute[]> {
  const { error } = await client().from("project_attributes").insert({ project_id: projectId, key: "source", label: "Source", type: "text" });
  // 23505 = unique violation — another concurrent call already seeded it, fine to ignore.
  if (error && error.code !== "23505") throw error;
  const { data, error: refetchErr } = await client().from("project_attributes").select("*").eq("project_id", projectId).order("created_at");
  if (refetchErr) throw refetchErr;
  return (data ?? []).map(mapAttribute);
}

export async function listProjectAttributes(projectId: string): Promise<ProjectAttribute[]> {
  const { data, error } = await client().from("project_attributes").select("*").eq("project_id", projectId).order("created_at");
  if (error) throw error;
  if ((data ?? []).length === 0) return ensureDefaultAttribute(projectId);
  return data.map(mapAttribute);
}

export async function createProjectAttribute(
  projectId: string,
  key: string,
  label: string,
  type: ProjectAttribute["type"] = "text",
  options: string[] = [],
): Promise<ProjectAttribute> {
  const { data, error } = await client()
    .from("project_attributes")
    .insert({ project_id: projectId, key, label, type, options })
    .select("*")
    .single();
  if (error) throw error;
  return mapAttribute(data);
}

/** Distinct values for one attribute across a project's documents, with document counts —
 * powers the Upload screen's clickthrough and Reports' attribute breakdown/filter. */
export async function summarizeAttributeValues(projectId: string, key: string): Promise<{ value: AttributeValue; count: number }[]> {
  const { data, error } = await client().from("documents").select("attributes").eq("project_id", projectId);
  if (error) throw error;

  const counts = new Map<AttributeValue, number>();
  for (const row of data ?? []) {
    const value = row.attributes[key];
    if (value === undefined || value === null || value === "") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}
