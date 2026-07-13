import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "../lib/errorMessage";
import { AlertTriangle, FileText, UploadCloud } from "lucide-react";
import { C, bodyFont, monoFont } from "./theme";
import { SectionHeading, LoadingState, ErrorState } from "./Shared";
import { listDocuments, uploadDocument } from "../lib/api/documents";
import type { DocumentSummary } from "../lib/types";

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

export function UploadScreen({ projectId, onUploaded }: { projectId: string; onUploaded: () => void }) {
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<UploadNote[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const list = await listDocuments(projectId, "all");
      setDocs(list);
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
    const nextNotes: UploadNote[] = [];
    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const result = await uploadDocument(projectId, file.name, content);
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

  if (error) return <ErrorState text={error} />;

  return (
    <div>
      <SectionHeading eyebrow="Ingestion" title="Upload Documents" />

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
                <div className="flex items-center gap-4">
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
