import { generateTopicDescription } from "../extraction";
import { supabase } from "../supabase";
import { getStarterModel } from "../starterModels";
import type { StarterTopicSeed } from "../types";
import { uploadDocument } from "./documents";
import { createProjectAttribute } from "./attributes";
import { createProject } from "./projects";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

async function seedTopics(projectId: string, seeds: StarterTopicSeed[], parentId: string | null, parentName: string | null, depth: 1 | 2 | 3) {
  for (const seed of seeds) {
    const description = seed.description || generateTopicDescription({ name: seed.name, keywords: seed.keywords, parentName });
    const { data: topic, error } = await client()
      .from("topics")
      .insert({ project_id: projectId, parent_id: parentId, name: seed.name, depth, keywords: seed.keywords, description })
      .select("*")
      .single();
    if (error) throw error;
    if (seed.children?.length && depth < 3) {
      await seedTopics(projectId, seed.children, topic.id, seed.name, (depth + 1) as 1 | 2 | 3);
    }
  }
}

/** Creates a new project, optionally seeded from one of the built-in starter
 * models (taxonomy + sample documents). Passing `starterKey: null` creates a
 * blank project with no topics/themes/documents. Every project — starter or
 * blank — gets at least a "Source" attribute so Upload has something to ask for. */
export async function createProjectFromStarter(name: string, starterKey: string | null): Promise<string> {
  const project = await createProject(name);

  if (starterKey) {
    const model = getStarterModel(starterKey);
    if (!model) throw new Error(`Unknown starter model: ${starterKey}`);

    await seedTopics(project.id, model.topics, null, null, 1);

    for (const theme of model.themes) {
      const { error } = await client()
        .from("themes")
        .insert({ project_id: project.id, name: theme.name, keywords: theme.keywords, description: theme.description });
      if (error) throw error;
    }

    for (const attribute of model.attributes) {
      await createProjectAttribute(project.id, attribute.key, attribute.label, attribute.type, attribute.options ?? []);
    }

    for (const doc of model.documents) {
      await uploadDocument(project.id, doc.name, doc.content, doc.docKey, doc.attributes ?? {});
    }
  } else {
    await createProjectAttribute(project.id, "source", "Source", "text");
  }

  return project.id;
}
