import { useState } from "react";
import { Clock } from "lucide-react";
import { C, bodyFont, displayFont } from "./theme";
import { SectionHeading } from "./Shared";
import { updateProjectThresholds } from "../lib/api/projects";
import { runMining } from "../lib/api/mining";
import type { Project, ThresholdLevel } from "../lib/types";

const LEVELS: ThresholdLevel[] = ["conservative", "balanced", "aggressive"];
const LEVEL_LABEL: Record<ThresholdLevel, string> = { conservative: "Conservative", balanced: "Balanced", aggressive: "Aggressive" };

function DialRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: ThresholdLevel;
  onChange: (v: ThresholdLevel) => void;
}) {
  return (
    <div className="mb-8">
      <p style={{ ...displayFont, fontSize: 17, fontWeight: 600, color: C.paper }} className="mb-1">
        {label}
      </p>
      <p style={{ ...bodyFont, fontSize: 13, color: C.muted }} className="mb-3 max-w-md">
        {desc}
      </p>
      <div className="inline-flex rounded-sm overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
        {LEVELS.map((l, i) => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{
              ...bodyFont,
              letterSpacing: "0.05em",
              background: value === l ? C.verdigrisDeep : "transparent",
              color: value === l ? "white" : C.muted,
              borderRight: i < 2 ? `1px solid ${C.panelBorder}` : "none",
            }}
          >
            {LEVEL_LABEL[l]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsScreen({ project, onChange, onMined }: { project: Project; onChange: () => void | Promise<void>; onMined: () => void }) {
  const [mining, setMining] = useState(false);
  const [minedMessage, setMinedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setThreshold = async (key: "detectionThreshold" | "promotionThreshold" | "mergeThreshold", value: ThresholdLevel) => {
    try {
      await updateProjectThresholds(project.id, { [key]: value });
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRunMining = async () => {
    setMining(true);
    setMinedMessage(null);
    setError(null);
    try {
      const { created } = await runMining(project.id);
      setMinedMessage(created === 0 ? "Mining ran — nothing new crossed the current thresholds." : `Mining ran — ${created} new suggestion${created > 1 ? "s" : ""} added to the review queue.`);
      onMined();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMining(false);
    }
  };

  return (
    <div>
      <SectionHeading eyebrow="Project Settings" title="Mining Thresholds" meta="Applies to this project only" />
      <DialRow
        label="Detection"
        desc="How readily new topics and themes are suggested from incoming text."
        value={project.detectionThreshold}
        onChange={(v) => void setThreshold("detectionThreshold", v)}
      />
      <DialRow
        label="Promotion"
        desc="How readily a recurring theme is proposed for promotion to a topic."
        value={project.promotionThreshold}
        onChange={(v) => void setThreshold("promotionThreshold", v)}
      />
      <DialRow
        label="Merging"
        desc="How readily two similar topics or themes are proposed for merging."
        value={project.mergeThreshold}
        onChange={(v) => void setThreshold("mergeThreshold", v)}
      />

      <div className="flex items-center gap-2 mt-2" style={{ color: C.muted }}>
        <Clock size={14} />
        <p style={{ ...bodyFont, fontSize: 12.5 }}>Mining is manual in this build — run it after uploads to refresh the suggestion queues.</p>
      </div>
      <button
        onClick={() => void handleRunMining()}
        disabled={mining}
        className="mt-4 px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wide disabled:opacity-60"
        style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}
      >
        {mining ? "Running…" : "Run mining now"}
      </button>

      {minedMessage && (
        <p style={{ ...bodyFont, fontSize: 12.5, color: C.verdigris }} className="mt-3">
          {minedMessage}
        </p>
      )}
      {error && (
        <p style={{ ...bodyFont, fontSize: 12.5, color: C.clay }} className="mt-3">
          {error}
        </p>
      )}

      <div className="mt-10 pt-6" style={{ borderTop: `1px solid ${C.panelBorder}` }}>
        <p style={{ ...bodyFont, color: C.mutedDark, fontSize: 11 }} className="uppercase tracking-wide">
          More project settings will live here as they're added
        </p>
      </div>
    </div>
  );
}
