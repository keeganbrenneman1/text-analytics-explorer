import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "../lib/errorMessage";
import { AlertTriangle, FileText, Sparkles, UploadCloud } from "lucide-react";
import { C, bodyFont, monoFont } from "./theme";
import { SectionHeading, LoadingState, ErrorState } from "./Shared";
import { listDocuments, uploadDocument } from "../lib/api/documents";
import { listProjectAttributes } from "../lib/api/attributes";
import type { AttributeValue, DocFilter, DocumentSummary, ProjectAttribute } from "../lib/types";

const STATE_STYLE: Record<DocumentSummary["state"], { color: string; label: string }> = {
  tagged: { color: C.verdigris, label: "Tagged" },
  orphaned: { color: C.amber, label: "Orphaned" },
  untagged: { color: C.clay, label: "Untagged" },
};

interface UploadNote {
  id: string;
  fileName: string;
  status: "created" | "replaced" | "blocked_duplicate" | "error";
  detail?: string;
}

function AttributeInputs({
  attributes,
  values,
  onChange,
}: {
  attributes: ProjectAttribute[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (attributes.length === 0) return null;
  return (
    <div className="flex gap-3 flex-wrap mb-4">
      {attributes.map((attr) => (
        <label key={attr.id} className="flex flex-col gap-1">
          <span style={{ ...monoFont, fontSize: 10.5, color: C.mutedDark, letterSpacing: "0.06em" }} className="uppercase">
            {attr.label}
          </span>
          {attr.type === "select" ? (
            <select
              value={values[attr.key] ?? ""}
              onChange={(e) => onChange(attr.key, e.target.value)}
              className="px-2 py-1.5 rounded-sm text-xs"
              style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}
            >
              <option value="">—</option>
              {attr.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={values[attr.key] ?? ""}
              onChange={(e) => onChange(attr.key, e.target.value)}
              type={attr.type === "number" ? "number" : attr.type === "date" ? "date" : "text"}
              placeholder={attr.label}
              className="px-2 py-1.5 rounded-sm text-xs"
              style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function attributesToPayload(attributes: ProjectAttribute[], values: Record<string, string>): Record<string, AttributeValue> {
  const payload: Record<string, AttributeValue> = {};
  for (const attr of attributes) {
    const raw = values[attr.key];
    if (!raw) continue;
    payload[attr.key] = attr.type === "number" ? Number(raw) : raw;
  }
  return payload;
}

export function UploadScreen({
  projectId,
  onUploaded,
  onFilterDocuments,
}: {
  projectId: string;
  onUploaded: () => void;
  onFilterDocuments: (filter: DocFilter) => void;
}) {
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [attributes, setAttributes] = useState<ProjectAttribute[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<UploadNote[]>([]);
  const [uploadAttrValues, setUploadAttrValues] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualAttrValues, setManualAttrValues] = useState<Record<string, string>>({});
  const [manualBusy, setManualBusy] = useState(false);
  const [manualNote, setManualNote] = useState<UploadNote | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, attrs] = await Promise.all([listDocuments(projectId, "all"), listProjectAttributes(projectId)]);
      setDocs(list);
      setAttributes(attrs);
    } catch (err) {
      setError(describeError(err));
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const attrPayload = attributesToPayload(attributes, uploadAttrValues);
    const nextNotes: UploadNote[] = [];
    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const result = await uploadDocument(projectId, file.name, content, file.name, attrPayload);
        nextNotes.push({ id: `${file.name}-${Date.now()}`, fileName: file.name, status: result.status });
      } catch (err) {
        nextNotes.push({
          id: `${file.name}-${Date.now()}`,
          fileName: file.name,
          status: "error",
          detail: describeError(err),
        });
      }
    }
    setNotes(nextNotes);
    setBusy(false);
    await load();
    onUploaded();
  };

  const handleManualCreate = async () => {
    if (!manualName.trim() || !manualContent.trim()) return;
    setManualBusy(true);
    setManualNote(null);
    try {
      const attrPayload = attributesToPayload(attributes, manualAttrValues);
      const result = await uploadDocument(projectId, manualName.trim(), manualContent, manualName.trim(), attrPayload);
      setManualNote({ id: `manual-${Date.now()}`, fileName: manualName.trim(), status: result.status });
      setManualName("");
      setManualContent("");
      setManualAttrValues({});
      await load();
      onUploaded();
    } catch (err) {
      setManualNote({ id: `manual-${Date.now()}`, fileName: manualName.trim(), status: "error", detail: describeError(err) });
    } finally {
      setManualBusy(false);
    }
  };

  if (error) return <ErrorState text={error} />;

  return (
    <div>
      <SectionHeading eyebrow="Ingestion" title="Upload Documents" />

      <AttributeInputs attributes={attributes} values={uploadAttrValues} onChange={(key, value) => setUploadAttrValues((v) => ({ ...v, [key]: value }))} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="rounded-md flex flex-col items-center justify-center py-14 mb-4 cursor-pointer"
        style={{ border: `2px dashed ${dragOver ? C.verdigrisDeep : C.panelBorder}` }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,text/plain"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <UploadCloud size={30} color={C.muted} className="mb-3" />
        <p style={{ ...bodyFont, color: C.paper, fontSize: 14 }} className="mb-1">
          {busy ? "Uploading…" : "Drop files here, or click to browse"}
        </p>
        <p style={{ ...bodyFont, color: C.mutedDark, fontSize: 12 }}>
          A document that matches an existing file name will replace the prior version
        </p>
      </div>

      {notes.length > 0 && (
        <div className="mb-8 flex flex-col gap-1.5">
          {notes.map((n) => (
            <p key={n.id} style={{ ...monoFont, fontSize: 11.5, color: noteColor(n.status) }}>
              {n.fileName} — {noteLabel(n.status)}
              {n.detail ? `: ${n.detail}` : ""}
            </p>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowManual((s) => !s)}
        className="mb-8 text-xs uppercase tracking-wide"
        style={{ ...monoFont, color: C.mutedDark }}
      >
        {showManual ? "− Hide" : "+"} Create a document manually
      </button>

      {showManual && (
        <div className="rounded-md p-5 mb-8" style={{ border: `1px solid ${C.panelBorder}`, background: C.panel }}>
          <p style={{ ...bodyFont, color: C.muted, fontSize: 12.5 }} className="mb-3">
            Type or paste text directly — it's extracted and saved the same way a file upload would be, once you commit it.
          </p>
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Document name..."
            className="w-full rounded-sm px-3 py-2 mb-3 outline-none"
            style={{ ...bodyFont, background: C.ink, border: `1px solid ${C.panelBorder}`, color: C.paper, fontSize: 13.5 }}
          />
          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            rows={4}
            placeholder="Document text..."
            className="w-full rounded-sm p-3 mb-3 outline-none resize-none"
            style={{ ...bodyFont, background: C.ink, border: `1px solid ${C.panelBorder}`, color: C.paper, fontSize: 13.5 }}
          />
          <AttributeInputs attributes={attributes} values={manualAttrValues} onChange={(key, value) => setManualAttrValues((v) => ({ ...v, [key]: value }))} />
          <button
            onClick={() => void handleManualCreate()}
            disabled={manualBusy || !manualName.trim() || !manualContent.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wide disabled:opacity-60"
            style={{ ...bodyFont, background: C.verdigrisDeep, color: "white" }}
          >
            <Sparkles size={13} /> {manualBusy ? "Committing…" : "Commit document"}
          </button>
          {manualNote && (
            <p style={{ ...monoFont, fontSize: 11.5, color: noteColor(manualNote.status) }} className="mt-3">
              {manualNote.fileName} — {noteLabel(manualNote.status)}
              {manualNote.detail ? `: ${manualNote.detail}` : ""}
            </p>
          )}
        </div>
      )}

      <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-3">
        Recent uploads
      </p>

      {docs === null ? (
        <LoadingState />
      ) : docs.length === 0 ? (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>No documents uploaded yet.</p>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
          {docs.map((d, i) => {
            const stateStyle = STATE_STYLE[d.state];
            return (
              <div
                key={d.id}
                className="flex items-center justify-between px-5 py-3.5"
                style={{ background: i % 2 === 0 ? C.panel : "#181E27", borderBottom: i < docs.length - 1 ? `1px solid ${C.panelBorder}` : "none" }}
              >
                <div className="flex items-center gap-3">
                  <FileText size={15} color={C.muted} />
                  <span style={{ ...bodyFont, color: C.paper, fontSize: 13.5 }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {attributes.map((attr) => {
                    const value = d.attributes[attr.key];
                    if (value === undefined) return null;
                    return (
                      <button
                        key={attr.key}
                        onClick={() => onFilterDocuments({ kind: "attribute", key: attr.key, label: attr.label, value })}
                        title={`Filter documents by ${attr.label}: ${value}`}
                        style={{ ...monoFont, fontSize: 10.5, color: C.muted, border: `1px solid ${C.panelBorder}`, padding: "1px 6px", borderRadius: 4 }}
                      >
                        {value}
                      </button>
                    );
                  })}
                  {d.state !== "tagged" && <AlertTriangle size={13} color={stateStyle.color} />}
                  <span style={{ ...monoFont, fontSize: 11, color: stateStyle.color, letterSpacing: "0.05em" }} className="uppercase">
                    {stateStyle.label}
                  </span>
                  <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{d.topicCount} topics</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function noteColor(status: UploadNote["status"]) {
  if (status === "error") return C.clay;
  if (status === "blocked_duplicate") return C.amber;
  return C.verdigris;
}

function noteLabel(status: UploadNote["status"]) {
  if (status === "created") return "uploaded";
  if (status === "replaced") return "replaced prior version";
  if (status === "blocked_duplicate") return "blocked — identical to existing upload";
  return "failed";
}
