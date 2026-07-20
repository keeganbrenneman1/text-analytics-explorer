import { supabase } from "../supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export interface CooccurrencePair {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  count: number;
}

/** Topic pairs that show up tagged on the same document, ranked by frequency —
 * computed client-side from the existing single taxonomy's document_topics
 * links (no separate "topic model" concept needed for this). */
export async function computeTopicCooccurrence(projectId: string, limit = 15): Promise<CooccurrencePair[]> {
  const db = client();

  const { data: docs, error: docErr } = await db.from("documents").select("id").eq("project_id", projectId);
  if (docErr) throw docErr;
  const docIds = (docs ?? []).map((d) => d.id);
  if (docIds.length === 0) return [];

  const { data: links, error } = await db.from("document_topics").select("document_id, topic_id").eq("orphan", false).in("document_id", docIds);
  if (error) throw error;

  const topicIdsByDoc = new Map<string, string[]>();
  for (const link of links ?? []) {
    const arr = topicIdsByDoc.get(link.document_id) ?? [];
    arr.push(link.topic_id);
    topicIdsByDoc.set(link.document_id, arr);
  }

  const pairCounts = new Map<string, number>();
  for (const topicIds of topicIdsByDoc.values()) {
    const unique = [...new Set(topicIds)].sort();
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = `${unique[i]}|${unique[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }
  if (pairCounts.size === 0) return [];

  const involvedTopicIds = new Set<string>();
  for (const key of pairCounts.keys()) {
    const [a, b] = key.split("|");
    involvedTopicIds.add(a);
    involvedTopicIds.add(b);
  }
  const { data: topicRows, error: tErr } = await db.from("topics").select("id, name").in("id", [...involvedTopicIds]);
  if (tErr) throw tErr;
  const nameById = new Map((topicRows ?? []).map((t) => [t.id, t.name]));

  return [...pairCounts.entries()]
    .map(([key, count]) => {
      const [aId, bId] = key.split("|");
      return { aId, aName: nameById.get(aId) ?? "Unknown", bId, bName: nameById.get(bId) ?? "Unknown", count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
