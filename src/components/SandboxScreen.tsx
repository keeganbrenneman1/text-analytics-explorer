import { useState } from "react";
import { describeError } from "../lib/errorMessage";
import { Sparkles } from "lucide-react";
import { C, bodyFont, monoFont, displayFont } from "./theme";
import { Card, Confidence, SectionHeading, StampBadge } from "./Shared";
import { analyzeSandboxText } from "../lib/api/sandbox";
import type { ExtractionResult, ThresholdLevel } from "../lib/extraction";

const STATE_META: Record<ExtractionResult["state"], { color: string; label: string }> = {
  tagged: { color: C.verdigris, label: "Would be tagged" },
  orphaned: { color: C.amber, label: "Would be orphaned" },
  untagged: { color: C.clay, label: "Would be untagged" },
};

export function SandboxScreen({ projectId, threshold }: { projectId: string; threshold: ThresholdLevel }) {
  const [text, setText] = useState("The attendants were super friendly and leaving the airport was fast, but my bag showed up a day late.");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await analyzeSandboxText(projectId, text);
      setResult(r);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionHeading eyebrow="Sandbox" title="Try a Sentence" meta={`Threshold: ${threshold}`} />
      <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }} className="mb-4 max-w-xl">
        Type any text and see how it would be classified against this project's current taxonomy. Nothing here is saved — no document is created, no
        suggestion enters a queue, no count changes.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Type a sentence or paste a short passage..."
        className="w-full rounded-md p-4 mb-3 outline-none resize-none"
        style={{ ...bodyFont, background: C.panel, border: `1px solid ${C.panelBorder}`, color: C.paper, fontSize: 14 }}
      />
      <button
        onClick={() => void run()}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wide mb-8 disabled:opacity-60"
        style={{ ...bodyFont, background: C.verdigrisDeep, color: "white" }}
      >
        <Sparkles size={14} /> {loading ? "Analyzing…" : "Analyze"}
      </button>

      {error && (
        <p style={{ ...bodyFont, color: C.clay, fontSize: 13 }} className="mb-4">
          {error}
        </p>
      )}

      {result && (
        <div className="relative">
          <div
            className="absolute -top-3 right-4 px-3 py-1 rounded-sm z-10"
            style={{ ...monoFont, fontSize: 10.5, letterSpacing: "0.1em", background: C.ink, color: C.amber, border: `1px solid ${C.amber}`, transform: "rotate(2deg)" }}
          >
            PREVIEW · NOT SAVED
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <StampBadge label={STATE_META[result.state].label} color={STATE_META[result.state].color} deep={STATE_META[result.state].color} />
              <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>evaluated at "{threshold}" sensitivity</span>
            </div>

            <p style={{ ...bodyFont, fontStyle: "italic", fontSize: 14, color: "#4A4438" }} className="mb-5 leading-snug">
              "{text}"
            </p>

            <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.08em" }} className="uppercase mb-2">
              Matched topics
            </p>
            {result.matchedTopics.length === 0 ? (
              <p style={{ ...bodyFont, fontSize: 13, color: C.mutedDark }} className="mb-4">
                No existing topic matched this text.
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {result.matchedTopics.map((t) => (
                  <div key={t.topicId} className="flex items-center justify-between py-2 px-3 rounded-sm" style={{ background: C.paperEdge }}>
                    <span style={{ ...displayFont, fontWeight: 600, fontSize: 14.5 }}>{t.name}</span>
                    <Confidence value={t.confidence} />
                  </div>
                ))}
              </div>
            )}

            {result.orphanParent && (
              <p style={{ ...bodyFont, fontSize: 13, color: C.amber }} className="mb-4">
                Matched parent bucket "{result.orphanParent.name}" but no specific child topic — would be flagged for mining.
              </p>
            )}

            <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.08em" }} className="uppercase mb-2">
              Theme signal (why/how)
            </p>
            {result.matchedThemes.length === 0 ? (
              <p style={{ ...bodyFont, fontSize: 13, color: C.mutedDark }} className="mb-2">
                No existing theme matched this text.
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap mb-2">
                {result.matchedThemes.map((t) => (
                  <span key={t.themeId} className="px-2.5 py-1 rounded-sm text-xs font-medium" style={{ ...monoFont, background: `${C.amber}25`, color: "#8A6A25" }}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {result.candidateTerms.length > 0 && (
              <>
                <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.08em" }} className="uppercase mb-2 mt-4">
                  Unmatched terms (mining candidates)
                </p>
                <div className="flex gap-2 flex-wrap">
                  {result.candidateTerms.map((term) => (
                    <span key={term} className="px-2.5 py-1 rounded-sm text-xs font-medium" style={{ ...monoFont, background: C.paperEdge, color: C.mutedDark }}>
                      {term}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
