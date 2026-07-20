import { useEffect, useState } from "react";
import { describeError } from "../lib/errorMessage";
import { ChevronRight, FileText } from "lucide-react";
import { C, bodyFont, displayFont, monoFont } from "./theme";
import { Card, ErrorState, LoadingState, SectionHeading } from "./Shared";
import { getDocumentDetail, listDocuments, listDocumentsByAttribute, listDocumentsByTheme, listDocumentsByTopic } from "../lib/api/documents";
import { listTopics, listThemes } from "../lib/api/taxonomy";
import { listProjectAttributes, summarizeAttributeValues } from "../lib/api/attributes";
import type { DocFilter, DocumentDetail as DocumentDetailType, DocumentSummary, ProjectAttribute, Theme, Topic } from "../lib/types";

const STATE_STYLE: Record<DocumentSummary["state"], { color: string; label: string }> = {
  tagged: { color: C.verdigris, label: "Tagged" },
  orphaned: { color: C.amber, label: "Orphaned" },
  untagged: { color: C.clay, label: "Untagged" },
};

function MatchPill({ match }: { match: DocumentDetailType["matches"][number] }) {
  const color = match.kind === "topic" ? C.verdigris : C.amber;
  const deep = match.kind === "topic" ? C.verdigrisDeep : "#8A6A25";
  return (
    <div
      className="px-3 py-2.5 rounded-sm mb-2"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}`,
        borderStyle: match.pending ? "dashed" : "solid",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ ...displayFont, fontWeight: 600, fontSize: 14, color: deep }}>
          {match.label}
          {match.orphan && " (parent — no child matched)"}
        </span>
        {match.pending && (
          <span style={{ ...monoFont, fontSize: 10, color: C.amber, letterSpacing: "0.06em" }} className="uppercase">
            pending
          </span>
        )}
      </div>
      {match.description && (
        <p style={{ ...bodyFont, fontSize: 12, color: C.mutedDark }} className="mb-1">
          {match.description}
        </p>
      )}
      {match.excerpt && <p style={{ ...bodyFont, fontSize: 12.5, color: C.mutedDark, fontStyle: "italic" }}>"{match.excerpt}"</p>}
    </div>
  );
}

function DocumentDetailView({ documentId, onBack }: { documentId: string; onBack: () => void }) {
  const [doc, setDoc] = useState<DocumentDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocumentDetail(documentId)
      .then(setDoc)
      .catch((err) => setError(describeError(err)));
  }, [documentId]);

  if (error) return <ErrorState text={error} />;
  if (doc === null) return <LoadingState />;

  const stateStyle = STATE_STYLE[doc.state];
  const topicMatches = doc.matches.filter((m) => m.kind === "topic");
  const themeMatches = doc.matches.filter((m) => m.kind === "theme");
  const attributeEntries = Object.entries(doc.attributes);

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm" style={{ ...bodyFont, color: C.muted }}>
        <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Back to documents
      </button>
      <SectionHeading eyebrow={doc.docKey} title={doc.name} meta={new Date(doc.createdAt).toLocaleDateString()} />

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs uppercase"
          style={{ ...monoFont, color: stateStyle.color, border: `1.5px solid ${stateStyle.color}` }}
        >
          {stateStyle.label}
        </span>
        {doc.pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs" style={{ ...monoFont, color: C.amber, border: `1px dashed ${C.amber}` }}>
            {doc.pendingCount} pending suggestion{doc.pendingCount > 1 ? "s" : ""} from this document
          </span>
        )}
        {attributeEntries.map(([key, value]) => (
          <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs" style={{ ...monoFont, color: C.muted, border: `1px solid ${C.panelBorder}` }}>
            {key}: {value}
          </span>
        ))}
      </div>

      <Card>
        <p style={{ ...bodyFont, fontSize: 15, lineHeight: 1.9, color: C.inkText, whiteSpace: "pre-wrap" }}>{doc.content}</p>
      </Card>

      {(topicMatches.length > 0 || themeMatches.length > 0) && (
        <div className="mt-6">
          <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-3">
            What matched, and why
          </p>
          {topicMatches.map((m) => (
            <MatchPill key={`t-${m.id}`} match={m} />
          ))}
          {themeMatches.map((m) => (
            <MatchPill key={`th-${m.id}`} match={m} />
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-4" style={{ color: C.mutedDark }}>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: `${C.verdigris}40` }} />
          <span style={{ ...bodyFont, fontSize: 12 }}>Topic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: `${C.amber}40` }} />
          <span style={{ ...bodyFont, fontSize: 12 }}>Theme</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ border: `1px dashed ${C.amber}` }} />
          <span style={{ ...bodyFont, fontSize: 12 }}>Pending decision</span>
        </div>
      </div>
    </div>
  );
}

function flattenTopics(topics: Topic[]): Topic[] {
  return [...topics].sort((a, b) => (a.depth !== b.depth ? a.depth - b.depth : a.name.localeCompare(b.name)));
}

export function DocumentsScreen({ projectId, initialFilter, refreshKey }: { projectId: string; initialFilter: DocFilter; refreshKey: number }) {
  const [filter, setFilter] = useState<DocFilter>(initialFilter);
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [attributes, setAttributes] = useState<ProjectAttribute[]>([]);

  const quickFilters: { key: DocFilter; label: string }[] = [
    { key: { kind: "state", state: "all" }, label: "All" },
    { key: { kind: "state", state: "tagged" }, label: "Tagged" },
    { key: { kind: "state", state: "orphaned" }, label: "Orphaned" },
    { key: { kind: "state", state: "untagged" }, label: "Untagged" },
    { key: { kind: "pending" }, label: "Has pending" },
  ];

  const isSameFilter = (a: DocFilter, b: DocFilter) => a.kind === "pending" && b.kind === "pending" ? true : a.kind === "state" && b.kind === "state" ? a.state === b.state : false;

  useEffect(() => {
    Promise.all([listTopics(projectId), listThemes(projectId), listProjectAttributes(projectId)])
      .then(([t, th, attrs]) => {
        setTopics(t);
        setThemes(th);
        setAttributes(attrs);
      })
      .catch((err) => setError(describeError(err)));
  }, [projectId, refreshKey]);

  useEffect(() => {
    setDocs(null);
    let request: Promise<DocumentSummary[]>;
    if (filter.kind === "topic") request = listDocumentsByTopic(projectId, filter.topicId);
    else if (filter.kind === "theme") request = listDocumentsByTheme(projectId, filter.themeId);
    else if (filter.kind === "attribute") request = listDocumentsByAttribute(projectId, filter.key, filter.value);
    else request = listDocuments(projectId, filter.kind === "pending" ? "pending" : filter.state);
    request.then(setDocs).catch((err) => setError(describeError(err)));
  }, [projectId, filter, refreshKey]);

  if (openDocId) return <DocumentDetailView documentId={openDocId} onBack={() => setOpenDocId(null)} />;
  if (error) return <ErrorState text={error} />;

  const filterLabel =
    filter.kind === "topic" ? `Topic: ${filter.topicName}` : filter.kind === "theme" ? `Theme: ${filter.themeName}` : filter.kind === "attribute" ? `${filter.label}: ${filter.value}` : null;

  return (
    <div>
      <SectionHeading eyebrow="All Documents" title={filterLabel ? `Documents — ${filterLabel}` : "Documents"} meta={docs ? `${docs.length} shown` : undefined} />

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {quickFilters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              ...bodyFont,
              background: isSameFilter(filter, f.key) ? C.verdigrisDeep : "transparent",
              color: isSameFilter(filter, f.key) ? "white" : C.muted,
              border: `1px solid ${isSameFilter(filter, f.key) ? C.verdigrisDeep : C.panelBorder}`,
            }}
          >
            {f.label}
          </button>
        ))}
        {filterLabel && (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}>
            {filterLabel}
          </span>
        )}
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <p style={{ ...monoFont, fontSize: 10.5, color: C.mutedDark, letterSpacing: "0.06em" }} className="uppercase">
          Drill into a specific match:
        </p>
        <select
          value={filter.kind === "topic" ? filter.topicId : ""}
          onChange={(e) => {
            const topic = topics.find((t) => t.id === e.target.value);
            if (topic) setFilter({ kind: "topic", topicId: topic.id, topicName: topic.name });
          }}
          className="px-2 py-1.5 rounded-sm text-xs"
          style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}
        >
          <option value="">Topic…</option>
          {flattenTopics(topics).map((t) => (
            <option key={t.id} value={t.id}>
              {"—".repeat(t.depth - 1)} {t.name}
            </option>
          ))}
        </select>
        <select
          value={filter.kind === "theme" ? filter.themeId : ""}
          onChange={(e) => {
            const theme = themes.find((t) => t.id === e.target.value);
            if (theme) setFilter({ kind: "theme", themeId: theme.id, themeName: theme.name });
          }}
          className="px-2 py-1.5 rounded-sm text-xs"
          style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}
        >
          <option value="">Theme…</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {attributes.map((attr) => (
          <AttributeFilterSelect
            key={attr.id}
            projectId={projectId}
            attribute={attr}
            active={filter.kind === "attribute" && filter.key === attr.key ? filter.value : ""}
            onSelect={(value) => setFilter({ kind: "attribute", key: attr.key, label: attr.label, value })}
          />
        ))}
      </div>

      {docs === null ? (
        <LoadingState />
      ) : docs.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>No documents match this filter.</p>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
          {docs.map((d, i) => {
            const stateStyle = STATE_STYLE[d.state];
            return (
              <button
                key={d.id}
                onClick={() => setOpenDocId(d.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                style={{ background: i % 2 === 0 ? C.panel : "#181E27", borderBottom: i < docs.length - 1 ? `1px solid ${C.panelBorder}` : "none" }}
              >
                <div className="flex items-center gap-3">
                  <FileText size={15} color={C.muted} />
                  <span style={{ ...bodyFont, color: C.paper, fontSize: 13.5 }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {d.pendingCount > 0 && (
                    <span style={{ ...monoFont, fontSize: 10.5, color: C.amber, border: `1px dashed ${C.amber}`, padding: "1px 6px", borderRadius: 4 }}>
                      {d.pendingCount} pending
                    </span>
                  )}
                  <span style={{ ...monoFont, fontSize: 11, color: stateStyle.color, letterSpacing: "0.05em" }} className="uppercase">
                    {stateStyle.label}
                  </span>
                  <ChevronRight size={14} color={C.mutedDark} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttributeFilterSelect({
  projectId,
  attribute,
  active,
  onSelect,
}: {
  projectId: string;
  attribute: ProjectAttribute;
  active: string | number;
  onSelect: (value: string) => void;
}) {
  const [options, setOptions] = useState<string[]>(attribute.options);

  useEffect(() => {
    if (attribute.options.length > 0) return;
    summarizeAttributeValues(projectId, attribute.key).then((rows) => setOptions(rows.map((r) => String(r.value))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, attribute.key]);

  return (
    <select
      value={active}
      onChange={(e) => onSelect(e.target.value)}
      className="px-2 py-1.5 rounded-sm text-xs"
      style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}
    >
      <option value="">{attribute.label}…</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
