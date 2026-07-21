import { useEffect, useState } from "react";
import { describeError } from "../lib/errorMessage";
import { ChevronRight, Check, Sparkles } from "lucide-react";
import { C, bodyFont, displayFont, monoFont } from "./theme";
import { ActionBtn, ErrorState, LoadingState, SectionHeading } from "./Shared";
import { backfillDescriptions, buildTopicTree, createTopic, listThemes, listTopics } from "../lib/api/taxonomy";
import type { Theme, TopicNode } from "../lib/types";

const MAX_TOPIC_DEPTH = 3;

function TaxonomyNodeRow({
  node,
  path,
  depth,
  expanded,
  toggle,
  adding,
  setAdding,
  draft,
  setDraft,
  onAddChild,
  onDrillToDocuments,
}: {
  node: TopicNode;
  path: string;
  depth: number;
  expanded: string[];
  toggle: (path: string) => void;
  adding: string | null;
  setAdding: (path: string | null) => void;
  draft: string;
  setDraft: (v: string) => void;
  onAddChild: (path: string, parentId: string, name: string) => void;
  onDrillToDocuments: (topicId: string, topicName: string) => void;
}) {
  const canExpand = depth < MAX_TOPIC_DEPTH;
  const isOpen = expanded.includes(path);
  const indent = 20 + (depth - 1) * 24;

  return (
    <div>
      <button
        onClick={() => (depth === 1 ? toggle(path) : onDrillToDocuments(node.id, node.name))}
        className="w-full flex items-center justify-between pr-5 py-2.5 text-left"
        style={{ paddingLeft: indent, background: depth === 1 ? C.panel : "#181E27", borderBottom: `1px solid ${C.panelBorder}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {canExpand && node.children.length > 0 && (
            <ChevronRight
              size={depth === 1 ? 14 : 12}
              color={C.muted}
              onClick={(e) => {
                e.stopPropagation();
                toggle(path);
              }}
              style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}
            />
          )}
          <div className="min-w-0">
            <span style={{ ...(depth === 1 ? displayFont : bodyFont), fontWeight: depth === 1 ? 600 : 400, fontSize: depth === 1 ? 15.5 : 13.5, color: C.paper }}>
              {node.name}
            </span>
            {node.description && (
              <p style={{ ...bodyFont, fontSize: 11.5, color: C.mutedDark }} className="truncate">
                {node.description}
              </p>
            )}
          </div>
        </div>
        <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark, flexShrink: 0, marginLeft: 12 }}>
          {depth === 1 ? `${node.children.length} topics` : `${node.docCount} docs`}
        </span>
      </button>

      {canExpand && isOpen && (
        <div>
          {node.children.map((child) => (
            <TaxonomyNodeRow
              key={child.id}
              node={child}
              path={`${path}>${child.id}`}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              adding={adding}
              setAdding={setAdding}
              draft={draft}
              setDraft={setDraft}
              onAddChild={onAddChild}
              onDrillToDocuments={onDrillToDocuments}
            />
          ))}

          <div className="py-2.5 pr-5" style={{ paddingLeft: indent + 24, background: "#181E27", borderBottom: `1px solid ${C.panelBorder}` }}>
            {adding === path ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="New topic name..."
                  className="flex-1 bg-transparent outline-none text-sm py-1"
                  style={{ ...bodyFont, color: C.paper, borderBottom: `1px solid ${C.verdigrisDeep}` }}
                />
                <ActionBtn
                  icon={Check}
                  label="Add"
                  tone="confirm"
                  onClick={() => {
                    onAddChild(path, node.id, draft);
                    setAdding(null);
                    setDraft("");
                  }}
                />
              </div>
            ) : (
              <button onClick={() => setAdding(path)} style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.05em" }} className="uppercase">
                + Add {depth === 1 ? "topic" : "subtopic"} under {node.name}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeRow({ theme, isLast }: { theme: Theme; isLast: boolean }) {
  return (
    <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderBottom: isLast ? "none" : `1px solid ${C.panelBorder}` }}>
      <div className="min-w-0">
        <span style={{ ...bodyFont, fontWeight: 600, fontSize: 13.5, color: C.paper }}>{theme.name}</span>
        {theme.description && (
          <p style={{ ...bodyFont, fontSize: 11.5, color: C.mutedDark }} className="truncate">
            {theme.description}
          </p>
        )}
      </div>
      <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark, flexShrink: 0, marginLeft: 12 }}>{theme.docCount} docs</span>
    </div>
  );
}

export function TaxonomyScreen({
  projectId,
  refreshKey,
  onDrillToDocuments,
}: {
  projectId: string;
  refreshKey: number;
  onDrillToDocuments: (topicId: string, topicName: string) => void;
}) {
  const [tree, setTree] = useState<TopicNode[] | null>(null);
  const [themes, setThemes] = useState<Theme[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const [topics, themeList] = await Promise.all([listTopics(projectId), listThemes(projectId)]);
      const built = buildTopicTree(topics);
      setTree(built);
      setThemes(themeList);
      setExpanded((prev) => (prev.length > 0 ? prev : built.map((t) => t.id)));
    } catch (err) {
      setError(describeError(err));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshKey]);

  const toggle = (path: string) => setExpanded((e) => (e.includes(path) ? e.filter((x) => x !== path) : [...e, path]));

  const addChild = async (path: string, parentId: string, name: string) => {
    if (!name.trim()) return;
    try {
      await createTopic(projectId, name.trim(), parentId);
      setExpanded((e) => [...e, path]);
      await load();
    } catch (err) {
      setError(describeError(err));
    }
  };

  const addRootTopic = async (name: string) => {
    if (!name.trim()) return;
    try {
      await createTopic(projectId, name.trim(), null);
      await load();
    } catch (err) {
      setError(describeError(err));
    }
  };

  const runBackfill = async () => {
    setBackfilling(true);
    setBackfillMessage(null);
    try {
      const { updated } = await backfillDescriptions(projectId);
      setBackfillMessage(updated === 0 ? "Every topic and theme already has a current description." : `Generated ${updated} description${updated > 1 ? "s" : ""}.`);
      await load();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBackfilling(false);
    }
  };

  if (error) return <ErrorState text={error} />;
  if (tree === null || themes === null) return <LoadingState />;

  return (
    <div>
      <SectionHeading eyebrow="Manual Ontology" title="Taxonomy" meta={`Click a topic to see its documents · up to ${MAX_TOPIC_DEPTH} levels deep`} />

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => void runBackfill()}
          disabled={backfilling}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium disabled:opacity-60"
          style={{ ...bodyFont, color: C.paper, border: `1px solid ${C.panelBorder}` }}
        >
          <Sparkles size={12} /> {backfilling ? "Generating…" : "Generate/refresh descriptions"}
        </button>
        {backfillMessage && (
          <span style={{ ...bodyFont, fontSize: 12, color: C.muted }}>{backfillMessage}</span>
        )}
      </div>

      <div className="rounded-md overflow-hidden mb-4" style={{ border: `1px solid ${C.panelBorder}` }}>
        {tree.length === 0 && (
          <div className="px-5 py-6" style={{ color: C.muted }}>
            <p style={{ ...bodyFont, fontSize: 13.5 }}>No topics yet — add one below to start the taxonomy.</p>
          </div>
        )}
        {tree.map((node) => (
          <TaxonomyNodeRow
            key={node.id}
            node={node}
            path={node.id}
            depth={1}
            expanded={expanded}
            toggle={toggle}
            adding={adding}
            setAdding={setAdding}
            draft={draft}
            setDraft={setDraft}
            onAddChild={addChild}
            onDrillToDocuments={onDrillToDocuments}
          />
        ))}
      </div>

      {adding === "__root__" ? (
        <div className="flex items-center gap-2 mb-10">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New top-level topic name..."
            className="flex-1 bg-transparent outline-none text-sm py-1"
            style={{ ...bodyFont, color: C.paper, borderBottom: `1px solid ${C.verdigrisDeep}` }}
          />
          <ActionBtn
            icon={Check}
            label="Add"
            tone="confirm"
            onClick={() => {
              void addRootTopic(draft);
              setAdding(null);
              setDraft("");
            }}
          />
        </div>
      ) : (
        <button onClick={() => setAdding("__root__")} style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.05em" }} className="uppercase mb-10 block">
          + Add top-level topic
        </button>
      )}

      <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-3">
        Themes
      </p>
      {themes.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>
          No themes yet — themes surface on their own as mining spots recurring patterns in your documents.
        </p>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
          {themes.map((theme, i) => (
            <ThemeRow key={theme.id} theme={theme} isLast={i === themes.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
