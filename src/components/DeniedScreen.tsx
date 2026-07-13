import { useEffect, useState } from "react";
import { describeError } from "../lib/errorMessage";
import { RotateCcw } from "lucide-react";
import { C, bodyFont, monoFont } from "./theme";
import { ErrorState, LoadingState, SectionHeading } from "./Shared";
import { listSuggestions, undenySuggestion } from "../lib/api/suggestions";
import type { Suggestion } from "../lib/types";
import { describeSuggestion, KIND_LABEL } from "./suggestionDisplay";

export function DeniedScreen({ projectId, onChange }: { projectId: string; onChange: () => void }) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const list = await listSuggestions(projectId, { status: "denied", sinceDays: 30 });
      setItems(list.sort((a, b) => new Date(b.decidedAt ?? b.createdAt).getTime() - new Date(a.decidedAt ?? a.createdAt).getTime()));
    } catch (err) {
      setError(describeError(err));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const undeny = async (id: string) => {
    setBusyId(id);
    try {
      await undenySuggestion(id);
      await load();
      onChange();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState text={error} />;
  if (items === null) return <LoadingState />;

  return (
    <div>
      <SectionHeading eyebrow="Suppression Log" title="Denied Items" meta="Rolling 30-day window · suppresses similar re-suggestions" />
      {items.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>Nothing denied in the last 30 days.</p>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
          {items.map((it, i) => (
            <div
              key={it.id}
              className="flex items-center justify-between px-5 py-3.5"
              style={{ background: i % 2 === 0 ? C.panel : "#181E27", borderBottom: i < items.length - 1 ? `1px solid ${C.panelBorder}` : "none" }}
            >
              <div className="flex items-center gap-4">
                <span style={{ ...monoFont, fontSize: 10.5, color: C.clay, letterSpacing: "0.06em" }} className="uppercase">
                  {KIND_LABEL[it.kind]}
                </span>
                <span style={{ ...bodyFont, color: C.paper, fontSize: 14, textDecoration: "line-through", textDecorationColor: C.mutedDark }}>
                  {describeSuggestion(it)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
                  denied {it.decidedAt ? new Date(it.decidedAt).toLocaleDateString() : "—"} · {it.decidedBy ?? "unknown"}
                </span>
                <button
                  onClick={() => void undeny(it.id)}
                  disabled={busyId === it.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium disabled:opacity-50"
                  style={{ ...bodyFont, color: C.paper, border: `1px solid ${C.panelBorder}` }}
                >
                  <RotateCcw size={12} /> Undeny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
