import { supabase } from "../supabase";
import { getStarterModel } from "../starterModels";
import type { StarterTopicSeed } from "../types";
import { uploadDocument } from "./documents";
import { createProject } from "./projects";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

async function seedTopics(projectId: string, seeds: StarterTopicSeed[], parentId: string | null, depth: 1 | 2 | 3) {
  for (const seed of seeds) {
    const { data: topic, error } = await client()
      .from("topics")
      .insert({ project_id: projectId, parent_id: parentId, name: seed.name, depth, keywords: seed.keywords })
      .select("*")
      .single();
    if (error) throw error;
    if (seed.children?.length && depth < 3) {
      await seedTopics(projectId, seed.children, topic.id, (depth + 1) as 1 | 2 | 3);
    }
  }
}

/** Creates a new project, optionally seeded from one of the built-in starter
 * models (taxonomy + sample documents). Passing `starterKey: null` creates a
 * blank project with no topics/themes/documents. */
export async function createProjectFromStarter(name: string, starterKey: string | null): Promise<string> {
  const project = await createProject(name);

  if (starterKey) {
    const model = getStarterModel(starterKey);
    if (!model) throw new Error(`Unknown starter model: ${starterKey}`);

    await seedTopics(project.id, model.topics, null, 1);

    for (const theme of model.themes) {
      const { error } = await client()
        .from("themes")
        .insert({ project_id: project.id, name: theme.name, keywords: theme.keywords });
      if (error) throw error;
    }

    for (const doc of model.documents) {
      await uploadDocument(project.id, doc.name, doc.content, doc.docKey);
    }
  }

  return project.id;
}
