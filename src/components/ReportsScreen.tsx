import { useEffect, useState } from "react";
import { describeError } from "../lib/errorMessage";
import { C, bodyFont, displayFont, monoFont } from "./theme";
import { ErrorState, LoadingState, SectionHeading } from "./Shared";
import { getStateBreakdown } from "../lib/api/documents";
import { listTopics } from "../lib/api/taxonomy";
import type { DocumentState, Topic } from "../lib/types";

interface Breakdown {
  tagged: number;
  orphaned: number;
  untagged: number;
  total: number;
}

export function ReportsScreen({
  projectId,
  refreshKey,
  onDrillToDocuments,
}: {
  projectId: string;
  refreshKey: number;
  onDrillToDocuments: (target: { topicId: string; topicName: string } | { state: "all" | DocumentState }) => void;
}) {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTopics(projectId), getStateBreakdown(projectId)])
      .then(([t, b]) => {
        setTopics(t);
        setBreakdown(b);
      })
      .catch((err) => setError(describeError(err)));
  }, [projectId, refreshKey]);

  if (error) return <ErrorState text={error} />;
  if (topics === null || breakdown === null) return <LoadingState />;

  const topTopics = [...topics].filter((t) => t.docCount > 0).sort((a, b) => b.docCount - a.docCount).slice(0, 8);
  const max = Math.max(1, ...topTopics.map((t) => t.docCount));

  const pct = (n: number) => (breakdown.total === 0 ? "0%" : `${Math.round((n / breakdown.total) * 100)}%`);

  return (
    <div>
      <SectionHeading eyebrow="Reporting" title="Topic Counts" meta="Accumulated across all batches" />

      {topTopics.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }} className="mb-10">
          No tagged documents yet — counts will show up here once documents match a topic.
        </p>
      ) : (
        <div className="space-y-4 mb-10">
          {topTopics.map((t) => (
            <button key={t.id} onClick={() => onDrillToDocuments({ topicId: t.id, topicName: t.name })} className="w-full text-left block">
              <div className="flex justify-between mb-1">
                <span style={{ ...bodyFont, color: C.paper, fontSize: 13.5 }}>{t.name}</span>
                <span style={{ ...monoFont, color: C.muted, fontSize: 12 }}>{t.docCount}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: C.panel }}>
                <div className="h-full rounded-full" style={{ width: `${(t.docCount / max) * 100}%`, background: C.verdigrisDeep }} />
              </div>
            </button>
          ))}
        </div>
      )}

      <p style={{ ...bodyFont, fontSize: 12, color: C.mutedDark }} className="mb-3">
        Click a tile to see the underlying documents
      </p>
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            { label: "Tagged", value: pct(breakdown.tagged), color: C.verdigris, state: "tagged" as const },
            { label: "Orphaned", value: pct(breakdown.orphaned), color: C.amber, state: "orphaned" as const },
            { label: "Untagged", value: pct(breakdown.untagged), color: C.clay, state: "untagged" as const },
          ]
        ).map((s) => (
          <button key={s.label} onClick={() => onDrillToDocuments({ state: s.state })} className="text-left rounded-md p-4" style={{ border: `1px solid ${C.panelBorder}` }}>
            <p style={{ ...displayFont, fontSize: 26, fontWeight: 600, color: s.color }}>{s.value}</p>
            <p style={{ ...bodyFont, fontSize: 12, color: C.muted }} className="uppercase tracking-wide mt-1">
              {s.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
