import { useEffect, useState } from "react";
import { Check, ChevronRight, FileText, Merge, Pencil, X } from "lucide-react";
import { C, bodyFont, displayFont, monoFont } from "./theme";
import { ActionBtn, Card, Confidence, EmptyState, ErrorState, LoadingState, SectionHeading, StampBadge } from "./Shared";
import { confirmSuggestion, denySuggestion, listSuggestions, renameSuggestion } from "../lib/api/suggestions";
import type { MergePayload, PromotionPayload, Suggestion, ThemeCreationPayload, TopicCreationPayload } from "../lib/types";

type Tab = "creation" | "promotion" | "merge";

export function SuggestionReview({ projectId, onChange }: { projectId: string; onChange: () => void }) {
  const [tab, setTab] = useState<Tab>("creation");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const list = await listSuggestions(projectId, { status: "pending" });
      setSuggestions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (error) return <ErrorState text={error} />;
  if (suggestions === null) return <LoadingState />;

  const creation = suggestions.filter((s) => s.kind === "topic_creation" || s.kind === "theme_creation");
  const promotion = suggestions.filter((s) => s.kind === "promotion");
  const merge = suggestions.filter((s) => s.kind === "merge");

  const tabs: { key: Tab; label: string; icon: typeof FileText; count: number }[] = [
    { key: "creation", label: "Creation", icon: FileText, count: creation.length },
    { key: "promotion", label: "Promotion", icon: ChevronRight, count: promotion.length },
    { key: "merge", label: "Merge", icon: Merge, count: merge.length },
  ];

  const withBusy = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      await load();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirm = (id: string) => withBusy(id, () => confirmSuggestion(id));
  const deny = (id: string) => withBusy(id, () => denySuggestion(id));
  const saveRename = (id: string) =>
    withBusy(id, async () => {
      await renameSuggestion(id, nameDraft);
      setEditingId(null);
    });

  return (
    <div>
      <SectionHeading eyebrow="Project Inbox" title="Suggestion Review" meta="Each queue is reviewed independently" />

      <div className="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors"
            style={{
              ...bodyFont,
              background: tab === t.key ? C.paper : "transparent",
              color: tab === t.key ? C.inkText : C.muted,
              border: tab === t.key ? `1px solid ${C.paperEdge}` : "1px solid transparent",
              borderBottom: tab === t.key ? `1px solid ${C.paper}` : "1px solid transparent",
            }}
          >
            <t.icon size={15} />
            {t.label}
            <span style={{ ...monoFont, fontSize: 11, background: tab === t.key ? C.ink : C.panelBorder, color: tab === t.key ? C.paper : C.muted, padding: "1px 6px", borderRadius: 20 }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "creation" && (
        <div className="grid gap-4 md:grid-cols-2">
          {creation.length === 0 && (
            <div className="md:col-span-2">
              <EmptyState text="No new topics or themes waiting on review." />
            </div>
          )}
          {creation.map((s) => {
            const isTopic = s.kind === "topic_creation";
            const payload = s.payload as TopicCreationPayload | ThemeCreationPayload;
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between mb-3">
                  <StampBadge label={isTopic ? "topic" : "theme"} color={isTopic ? C.verdigris : C.amber} deep={isTopic ? C.verdigrisDeep : "#8A6A25"} />
                </div>

                {editingId === s.id ? (
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    style={{ ...displayFont, fontSize: 19, color: C.inkText, borderBottom: `2px solid ${C.verdigrisDeep}` }}
                    className="w-full bg-transparent outline-none mb-1 pb-1"
                  />
                ) : (
                  <h3 style={{ ...displayFont, fontSize: 19, fontWeight: 600 }} className="mb-1">
                    {payload.name}
                  </h3>
                )}

                {isTopic && (payload as TopicCreationPayload).parentName && (
                  <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark }} className="mb-2">
                    under {(payload as TopicCreationPayload).parentName}
                  </p>
                )}

                <p style={{ ...bodyFont, fontStyle: "italic", fontSize: 13.5, color: "#4A4438" }} className="mb-3 leading-snug">
                  "{payload.excerpt}"
                </p>

                <div className="flex items-center justify-between mb-4">
                  <Confidence value={s.confidence} />
                  <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>seen in {payload.docCount} docs</span>
                </div>

                <div className="flex gap-2">
                  <ActionBtn icon={Check} label="Confirm" tone="confirm" disabled={busyId === s.id} onClick={() => void confirm(s.id)} />
                  <ActionBtn icon={X} label="Deny" tone="deny" disabled={busyId === s.id} onClick={() => void deny(s.id)} />
                  {editingId === s.id ? (
                    <ActionBtn icon={Pencil} label="Save name" tone="neutral" disabled={busyId === s.id} onClick={() => void saveRename(s.id)} />
                  ) : (
                    <ActionBtn
                      icon={Pencil}
                      label="Rename"
                      tone="neutral"
                      onClick={() => {
                        setEditingId(s.id);
                        setNameDraft(payload.name);
                      }}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "promotion" && (
        <div className="grid gap-4 md:grid-cols-2">
          {promotion.length === 0 && (
            <div className="md:col-span-2">
              <EmptyState text="No themes have crossed the promotion threshold." />
            </div>
          )}
          {promotion.map((s) => {
            const payload = s.payload as PromotionPayload;
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between mb-3">
                  <StampBadge label="promotion" color={C.amber} deep="#8A6A25" />
                </div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ ...bodyFont, fontSize: 13, color: C.mutedDark, textDecoration: "line-through" }}>{payload.themeName}</span>
                  <ChevronRight size={14} color={C.mutedDark} />
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      style={{ ...displayFont, fontSize: 18, color: C.inkText, borderBottom: `2px solid ${C.verdigrisDeep}` }}
                      className="bg-transparent outline-none"
                    />
                  ) : (
                    <span style={{ ...displayFont, fontSize: 18, fontWeight: 600 }}>{payload.proposedTopicName}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mb-4 mt-3">
                  <Confidence value={s.confidence} />
                  <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
                    {payload.occurrences} occurrences · {payload.daysActive} days active
                  </span>
                </div>
                <div className="flex gap-2">
                  <ActionBtn icon={Check} label="Confirm promotion" tone="confirm" disabled={busyId === s.id} onClick={() => void confirm(s.id)} />
                  <ActionBtn icon={X} label="Deny" tone="deny" disabled={busyId === s.id} onClick={() => void deny(s.id)} />
                  {editingId === s.id ? (
                    <ActionBtn icon={Pencil} label="Save name" tone="neutral" disabled={busyId === s.id} onClick={() => void saveRename(s.id)} />
                  ) : (
                    <ActionBtn
                      icon={Pencil}
                      label="Edit name"
                      tone="neutral"
                      onClick={() => {
                        setEditingId(s.id);
                        setNameDraft(payload.proposedTopicName);
                      }}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "merge" && (
        <div className="grid gap-4 md:grid-cols-2">
          {merge.length === 0 && (
            <div className="md:col-span-2">
              <EmptyState text="Nothing looks similar enough to merge right now." />
            </div>
          )}
          {merge.map((s) => {
            const payload = s.payload as MergePayload;
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between mb-3">
                  <StampBadge label={`merge · ${payload.itemType}`} color={C.clay} deep={C.clayDeep} />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 text-center py-2 rounded-sm" style={{ background: C.paperEdge }}>
                    <p style={{ ...displayFont, fontWeight: 600, fontSize: 15 }}>{payload.aName}</p>
                    <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{payload.aCount} docs</p>
                  </div>
                  <Merge size={16} color={C.mutedDark} />
                  <div className="flex-1 text-center py-2 rounded-sm" style={{ background: C.paperEdge }}>
                    <p style={{ ...displayFont, fontWeight: 600, fontSize: 15 }}>{payload.bName}</p>
                    <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{payload.bCount} docs</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <Confidence value={s.confidence} />
                  <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>merges into "{payload.aName}"</span>
                </div>
                <div className="flex gap-2">
                  <ActionBtn icon={Check} label="Confirm merge" tone="confirm" disabled={busyId === s.id} onClick={() => void confirm(s.id)} />
                  <ActionBtn icon={X} label="Deny" tone="deny" disabled={busyId === s.id} onClick={() => void deny(s.id)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
