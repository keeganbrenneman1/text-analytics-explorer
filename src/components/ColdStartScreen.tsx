import { useState } from "react";
import { describeError } from "../lib/errorMessage";
import { Sparkles } from "lucide-react";
import { C, bodyFont, displayFont, monoFont } from "./theme";
import { SectionHeading } from "./Shared";
import { STARTER_MODELS } from "../lib/starterModels";
import { createProjectFromStarter } from "../lib/api/coldStart";

export function ColdStartScreen({
  allowCancel,
  onCancel,
  onCreated,
}: {
  allowCancel: boolean;
  onCancel: () => void;
  onCreated: (projectId: string) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = STARTER_MODELS.find((m) => m.key === selected);
  const effectiveName = name.trim() || selectedModel?.name || (selected === "blank" ? "New Project" : "");

  const handleCreate = async () => {
    if (!selected || !effectiveName) return;
    setCreating(true);
    setError(null);
    try {
      const projectId = await createProjectFromStarter(effectiveName, selected === "blank" ? null : selected);
      await onCreated(projectId);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <SectionHeading eyebrow="New Project" title="Start Something New" meta="Choose a starting point" />

      {allowCancel && (
        <button onClick={onCancel} className="mb-6 text-xs" style={{ ...monoFont, color: C.mutedDark, letterSpacing: "0.06em" }}>
          ← CANCEL
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {STARTER_MODELS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            className="text-left rounded-md p-5"
            style={{ background: selected === m.key ? C.panel : "transparent", border: `1.5px solid ${selected === m.key ? C.verdigrisDeep : C.panelBorder}` }}
          >
            <Sparkles size={18} color={C.verdigris} className="mb-3" />
            <p style={{ ...displayFont, fontWeight: 600, fontSize: 16, color: C.paper }} className="mb-1.5">
              {m.name}
            </p>
            <p style={{ ...bodyFont, fontSize: 12.5, color: C.muted }} className="mb-3 leading-snug">
              {m.description}
            </p>
            <div className="flex gap-3">
              <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{countTopics(m.topics)} starter topics</span>
              <span style={{ ...monoFont, fontSize: 11, color: C.amber }}>{m.documents.length} sample documents</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setSelected("blank")}
        className="w-full text-left rounded-md p-4 mb-6"
        style={{ border: `1.5px dashed ${C.panelBorder}`, background: selected === "blank" ? C.panel : "transparent" }}
      >
        <p style={{ ...bodyFont, color: C.paper, fontSize: 13.5 }}>Start from scratch — blank taxonomy, no sample data</p>
      </button>

      {selected && (
        <div className="mb-6">
          <label style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.08em" }} className="uppercase block mb-2">
            Project name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={selectedModel?.name ?? "New Project"}
            className="w-full rounded-sm px-3 py-2 outline-none"
            style={{ ...bodyFont, background: C.panel, border: `1px solid ${C.panelBorder}`, color: C.paper, fontSize: 14 }}
          />
        </div>
      )}

      {error && (
        <p style={{ ...bodyFont, color: C.clay, fontSize: 12.5 }} className="mb-4">
          {error}
        </p>
      )}

      <button
        disabled={!selected || creating}
        onClick={handleCreate}
        className="px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wide disabled:opacity-60"
        style={{ ...bodyFont, background: selected ? C.verdigrisDeep : C.panelBorder, color: selected ? "white" : C.mutedDark }}
      >
        {creating ? "Creating…" : selected && selected !== "blank" ? "Create project with sample data" : "Create project"}
      </button>
    </div>
  );
}

function countTopics(topics: { children?: unknown[] }[]): number {
  let count = 0;
  const walk = (nodes: { children?: unknown[] }[]) => {
    for (const n of nodes) {
      count += 1;
      if (n.children?.length) walk(n.children as { children?: unknown[] }[]);
    }
  };
  walk(topics);
  return count;
}
