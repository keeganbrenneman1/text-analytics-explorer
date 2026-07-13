import { useEffect, useState } from "react";
import { C, bodyFont, monoFont } from "./theme";
import { ErrorState, LoadingState, SectionHeading } from "./Shared";
import { listSuggestions } from "../lib/api/suggestions";
import type { Suggestion } from "../lib/types";
import { describeSuggestion, KIND_LABEL } from "./suggestionDisplay";

export function PendingScreen({ projectId, refreshKey }: { projectId: string; refreshKey: number }) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSuggestions(projectId, { status: "pending", sinceDays: 90 })
      .then((list) => setItems(list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [projectId, refreshKey]);

  if (error) return <ErrorState text={error} />;
  if (items === null) return <LoadingState />;

  return (
    <div>
      <SectionHeading eyebrow="Prioritization" title="Pending Queue" meta="Rolling 90-day window" />
      {items.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>Nothing pending right now.</p>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
          {items.map((it, i) => {
            const ageDays = Math.floor((Date.now() - new Date(it.createdAt).getTime()) / 86_400_000);
            return (
              <div
                key={it.id}
                className="flex items-center justify-between px-5 py-3.5"
                style={{ background: i % 2 === 0 ? C.panel : "#181E27", borderBottom: i < items.length - 1 ? `1px solid ${C.panelBorder}` : "none" }}
              >
                <div className="flex items-center gap-4">
                  <span style={{ ...monoFont, fontSize: 10.5, color: C.amber, letterSpacing: "0.06em" }} className="uppercase">
                    {KIND_LABEL[it.kind]}
                  </span>
                  <span style={{ ...bodyFont, color: C.paper, fontSize: 14 }}>{describeSuggestion(it)}</span>
                </div>
                <span style={{ ...monoFont, fontSize: 12, color: ageDays > 30 ? C.clay : C.muted }}>{ageDays}d pending</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
