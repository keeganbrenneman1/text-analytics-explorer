import { useEffect, useState } from "react";
import { describeError } from "../lib/errorMessage";
import { C, bodyFont, displayFont, monoFont } from "./theme";
import { ErrorState, LoadingState, SectionHeading } from "./Shared";
import { getStateBreakdown } from "../lib/api/documents";
import { listThemes, listTopics } from "../lib/api/taxonomy";
import { listProjectAttributes, summarizeAttributeValues } from "../lib/api/attributes";
import { computeTopicCooccurrence, type CooccurrencePair } from "../lib/api/reports";
import type { AttributeValue, DocumentState, ProjectAttribute, Theme, Topic } from "../lib/types";

interface Breakdown {
  tagged: number;
  orphaned: number;
  untagged: number;
  total: number;
}

export type ReportsDrillTarget =
  | { topicId: string; topicName: string }
  | { themeId: string; themeName: string }
  | { state: "all" | DocumentState }
  | { attributeKey: string; attributeLabel: string; attributeValue: AttributeValue };

function CountBars<T extends { id: string; name: string; docCount: number }>({
  items,
  onClick,
  color,
}: {
  items: T[];
  onClick: (item: T) => void;
  color: string;
}) {
  const max = Math.max(1, ...items.map((t) => t.docCount));
  return (
    <div className="space-y-4">
      {items.map((t) => (
        <button key={t.id} onClick={() => onClick(t)} className="w-full text-left block">
          <div className="flex justify-between mb-1">
            <span style={{ ...bodyFont, color: C.paper, fontSize: 13.5 }}>{t.name}</span>
            <span style={{ ...monoFont, color: C.muted, fontSize: 12 }}>{t.docCount}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: C.panel }}>
            <div className="h-full rounded-full" style={{ width: `${(t.docCount / max) * 100}%`, background: color }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function AttributeBreakdown({ projectId, attribute, onDrill }: { projectId: string; attribute: ProjectAttribute; onDrill: (target: ReportsDrillTarget) => void }) {
  const [rows, setRows] = useState<{ value: AttributeValue; count: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    summarizeAttributeValues(projectId, attribute.key)
      .then(setRows)
      .catch((err) => setError(describeError(err)));
  }, [projectId, attribute.key]);

  if (error) return <ErrorState text={error} />;
  if (rows === null) return <LoadingState />;
  if (rows.length === 0) return <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>No documents have a {attribute.label.toLowerCase()} value yet.</p>;

  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <button
          key={String(r.value)}
          onClick={() => onDrill({ attributeKey: attribute.key, attributeLabel: attribute.label, attributeValue: r.value })}
          className="w-full text-left block"
        >
          <div className="flex justify-between mb-1">
            <span style={{ ...bodyFont, color: C.paper, fontSize: 13 }}>{r.value}</span>
            <span style={{ ...monoFont, color: C.muted, fontSize: 12 }}>{r.count}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: C.panel }}>
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: C.amber }} />
          </div>
        </button>
      ))}
    </div>
  );
}

export function ReportsScreen({
  projectId,
  refreshKey,
  onDrillToDocuments,
}: {
  projectId: string;
  refreshKey: number;
  onDrillToDocuments: (target: ReportsDrillTarget) => void;
}) {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [themes, setThemes] = useState<Theme[] | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [attributes, setAttributes] = useState<ProjectAttribute[]>([]);
  const [cooccurrence, setCooccurrence] = useState<CooccurrencePair[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTopics(projectId), listThemes(projectId), getStateBreakdown(projectId), listProjectAttributes(projectId), computeTopicCooccurrence(projectId)])
      .then(([t, th, b, attrs, cooc]) => {
        setTopics(t);
        setThemes(th);
        setBreakdown(b);
        setAttributes(attrs);
        setCooccurrence(cooc);
      })
      .catch((err) => setError(describeError(err)));
  }, [projectId, refreshKey]);

  if (error) return <ErrorState text={error} />;
  if (topics === null || themes === null || breakdown === null || cooccurrence === null) return <LoadingState />;

  const topTopics = [...topics].filter((t) => t.docCount > 0).sort((a, b) => b.docCount - a.docCount).slice(0, 8);
  const topThemes = [...themes].filter((t) => t.docCount > 0).sort((a, b) => b.docCount - a.docCount).slice(0, 8);
  const pct = (n: number) => (breakdown.total === 0 ? "0%" : `${Math.round((n / breakdown.total) * 100)}%`);

  return (
    <div>
      <SectionHeading eyebrow="Reporting" title="Topic Counts" meta="Accumulated across all batches" />
      {topTopics.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }} className="mb-10">
          No tagged documents yet — counts will show up here once documents match a topic.
        </p>
      ) : (
        <div className="mb-10">
          <CountBars items={topTopics} color={C.verdigrisDeep} onClick={(t) => onDrillToDocuments({ topicId: t.id, topicName: t.name })} />
        </div>
      )}

      <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-4">
        Theme counts
      </p>
      {topThemes.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }} className="mb-10">
          No themes tagged yet.
        </p>
      ) : (
        <div className="mb-10">
          <CountBars items={topThemes} color={C.amber} onClick={(t) => onDrillToDocuments({ themeId: t.id, themeName: t.name })} />
        </div>
      )}

      <p style={{ ...bodyFont, fontSize: 12, color: C.mutedDark }} className="mb-3">
        Click a tile to see the underlying documents
      </p>
      <div className="grid grid-cols-3 gap-4 mb-10">
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

      <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-2">
        Topic co-occurrence
      </p>
      <p style={{ ...bodyFont, fontSize: 12, color: C.mutedDark }} className="mb-4">
        Topic pairs that show up tagged on the same document, most frequent first.
      </p>
      {cooccurrence.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }} className="mb-10">
          Not enough overlapping tags yet to show co-occurring topics.
        </p>
      ) : (
        <div className="rounded-md overflow-hidden mb-10" style={{ border: `1px solid ${C.panelBorder}` }}>
          {cooccurrence.map((pair, i) => (
            <div
              key={`${pair.aId}-${pair.bId}`}
              className="flex items-center justify-between px-5 py-3"
              style={{ background: i % 2 === 0 ? C.panel : "#181E27", borderBottom: i < cooccurrence.length - 1 ? `1px solid ${C.panelBorder}` : "none" }}
            >
              <span style={{ ...bodyFont, color: C.paper, fontSize: 13 }}>
                {pair.aName} <span style={{ color: C.mutedDark }}>+</span> {pair.bName}
              </span>
              <span style={{ ...monoFont, color: C.muted, fontSize: 12 }}>{pair.count} docs</span>
            </div>
          ))}
        </div>
      )}

      {attributes.length > 0 && (
        <>
          <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-4">
            By structured attribute
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {attributes.map((attr) => (
              <div key={attr.id}>
                <p style={{ ...bodyFont, color: C.paper, fontSize: 13.5, fontWeight: 600 }} className="mb-3">
                  {attr.label}
                </p>
                <AttributeBreakdown projectId={projectId} attribute={attr} onDrill={onDrillToDocuments} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
