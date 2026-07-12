import type { ReactNode, CSSProperties } from "react";
import { CircleSlash, type LucideIcon } from "lucide-react";
import { C, bodyFont, displayFont, monoFont } from "./theme";

export function PerforatedEdge() {
  return (
    <div className="absolute -top-2 left-0 right-0 h-4 flex justify-around px-3" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="block w-2 h-2 rounded-full" style={{ background: C.ink }} />
      ))}
    </div>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="relative rounded-md p-5 shadow-lg"
      style={{ background: C.paper, border: `1px solid ${C.paperEdge}`, color: C.inkText, ...style }}
    >
      <PerforatedEdge />
      {children}
    </div>
  );
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: C.paperEdge }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.verdigrisDeep }} />
      </div>
      <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{pct}% match</span>
    </div>
  );
}

export function StampBadge({ label, color, deep }: { label: string; color: string; deep: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium uppercase tracking-wider rounded-sm"
      style={{
        color: deep,
        border: `1.5px solid ${color}`,
        background: `${color}18`,
        transform: "rotate(-1deg)",
        letterSpacing: "0.08em",
        ...monoFont,
        fontSize: "11px",
      }}
    >
      {label}
    </span>
  );
}

export function ActionBtn({
  icon: Icon,
  label,
  onClick,
  tone,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: "confirm" | "deny" | "edit" | "neutral";
  disabled?: boolean;
}) {
  const map: Record<string, string> = {
    confirm: C.verdigrisDeep,
    deny: C.clayDeep,
    edit: "#5B6472",
    neutral: "#5B6472",
  };
  const color = map[tone] || "#5B6472";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors disabled:opacity-50"
      style={{ color: "white", background: color, ...bodyFont }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </button>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-md" style={{ border: `1px dashed ${C.panelBorder}`, color: C.muted }}>
      <CircleSlash size={28} strokeWidth={1.5} className="mb-3" />
      <p style={{ ...bodyFont, fontSize: 14 }}>{text}</p>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between flex-wrap gap-2">
      <div>
        <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-1">
          {eyebrow}
        </p>
        <h1 style={{ ...displayFont, color: C.paper, fontSize: 28, fontWeight: 600 }}>{title}</h1>
      </div>
      {meta && <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>{meta}</p>}
    </div>
  );
}

export function LoadingState({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16" style={{ color: C.muted }}>
      <p style={{ ...bodyFont, fontSize: 14 }}>{text}</p>
    </div>
  );
}

export function ErrorState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-md" style={{ border: `1px dashed ${C.clay}`, color: C.clay }}>
      <p style={{ ...bodyFont, fontSize: 14 }}>{text}</p>
    </div>
  );
}
