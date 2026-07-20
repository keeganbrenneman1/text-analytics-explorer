import { supabase } from "../supabase";
import type { Theme, Topic, TopicNode } from "../types";
import type { Database } from "../database.types";
import type { TaxonomySnapshot } from "../extraction";
import { generateThemeDescription, generateTopicDescription } from "../extraction";

type TopicRow = Database["public"]["Tables"]["topics"]["Row"];
type ThemeRow = Database["public"]["Tables"]["themes"]["Row"];

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

function mapTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    name: row.name,
    depth: row.depth,
    keywords: row.keywords,
    description: row.description,
    docCount: row.doc_count,
    createdAt: row.created_at,
  };
}

function mapTheme(row: ThemeRow): Theme {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    keywords: row.keywords,
    description: row.description,
    docCount: row.doc_count,
    firstSeenAt: row.first_seen_at,
    createdAt: row.created_at,
  };
}

export async function listTopics(projectId: string): Promise<Topic[]> {
  const { data, error } = await client().from("topics").select("*").eq("project_id", projectId).order("name");
  if (error) throw error;
  return (data ?? []).map(mapTopic);
}

export async function listThemes(projectId: string): Promise<Theme[]> {
  const { data, error } = await client().from("themes").select("*").eq("project_id", projectId).order("name");
  if (error) throw error;
  return (data ?? []).map(mapTheme);
}

/** Both flat lists, shaped for the extraction module's `TaxonomySnapshot`. */
export async function loadTaxonomySnapshot(projectId: string): Promise<TaxonomySnapshot> {
  const [topics, themes] = await Promise.all([listTopics(projectId), listThemes(projectId)]);
  return {
    topics: topics.map((t) => ({ id: t.id, name: t.name, parentId: t.parentId, depth: t.depth, keywords: t.keywords, docCount: t.docCount })),
    themes: themes.map((t) => ({ id: t.id, name: t.name, keywords: t.keywords, docCount: t.docCount, firstSeenAt: t.firstSeenAt })),
  };
}

export function buildTopicTree(topics: Topic[]): TopicNode[] {
  const byId = new Map<string, TopicNode>(topics.map((t) => [t.id, { ...t, children: [] }]));
  const roots: TopicNode[] = [];
  for (const topic of byId.values()) {
    if (topic.parentId) {
      const parent = byId.get(topic.parentId);
      if (parent) {
        parent.children.push(topic);
        continue;
      }
    }
    roots.push(topic);
  }
  const sortByName = (nodes: TopicNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortByName(n.children));
  };
  sortByName(roots);
  return roots;
}

export async function createTopic(projectId: string, name: string, parentId: string | null): Promise<Topic> {
  let depth: 1 | 2 | 3 = 1;
  let parentName: string | null = null;
  if (parentId) {
    const { data: parent, error } = await client().from("topics").select("depth, name").eq("id", parentId).single();
    if (error) throw error;
    if (parent.depth >= 3) throw new Error("Topics can only nest up to 3 levels deep.");
    depth = (parent.depth + 1) as 1 | 2 | 3;
    parentName = parent.name;
  }
  const keywords = deriveKeywords(name);
  const description = generateTopicDescription({ name, keywords, parentName });
  const { data, error } = await client()
    .from("topics")
    .insert({ project_id: projectId, parent_id: parentId, name, depth, keywords, description })
    .select("*")
    .single();
  if (error) throw error;
  return mapTopic(data);
}

export async function renameTopic(topicId: string, name: string): Promise<Topic> {
  const { data, error } = await client().from("topics").update({ name }).eq("id", topicId).select("*").single();
  if (error) throw error;
  return mapTopic(data);
}

export async function createTheme(projectId: string, name: string): Promise<Theme> {
  const keywords = deriveKeywords(name);
  const description = generateThemeDescription({ name, keywords });
  const { data, error } = await client()
    .from("themes")
    .insert({ project_id: projectId, name, keywords, description })
    .select("*")
    .single();
  if (error) throw error;
  return mapTheme(data);
}

/** Cheap keyword seed so a manually-created topic/theme is still matchable by the mock extractor. */
export function deriveKeywords(name: string): string[] {
  return [name.toLowerCase()];
}

/** Fills in descriptions for any topics/themes that don't have one yet (e.g. rows created before this feature, or via suggestion-confirm paths that don't set one). */
export async function backfillDescriptions(projectId: string): Promise<{ updated: number }> {
  const db = client();
  let updated = 0;

  const [{ data: topics, error: topicErr }, { data: themes, error: themeErr }] = await Promise.all([
    db.from("topics").select("id, name, parent_id, keywords, description").eq("project_id", projectId),
    db.from("themes").select("id, name, keywords, description").eq("project_id", projectId),
  ]);
  if (topicErr) throw topicErr;
  if (themeErr) throw themeErr;

  const topicNameById = new Map((topics ?? []).map((t) => [t.id, t.name]));

  for (const topic of topics ?? []) {
    if (topic.description) continue;
    const parentName = topic.parent_id ? (topicNameById.get(topic.parent_id) ?? null) : null;
    const description = generateTopicDescription({ name: topic.name, keywords: topic.keywords, parentName });
    const { error } = await db.from("topics").update({ description }).eq("id", topic.id);
    if (error) throw error;
    updated += 1;
  }

  for (const theme of themes ?? []) {
    if (theme.description) continue;
    const description = generateThemeDescription({ name: theme.name, keywords: theme.keywords });
    const { error } = await db.from("themes").update({ description }).eq("id", theme.id);
    if (error) throw error;
    updated += 1;
  }

  return { updated };
}
