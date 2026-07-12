import React, { useState, useEffect } from "react";
import {
  Inbox, Clock, Archive, SlidersHorizontal, BarChart3, UploadCloud,
  Check, X, Pencil, Merge, RotateCcw, FileText, AlertTriangle,
  CircleSlash, ChevronRight, Search, FlaskConical, Sparkles, LayoutGrid
} from "lucide-react";

// ---- design tokens ----
const C = {
  ink: "#14181F",
  panel: "#1B212B",
  panelBorder: "#2A323E",
  paper: "#F1ECDF",
  paperEdge: "#E3DCC8",
  inkText: "#2A2620",
  muted: "#8B93A1",
  mutedDark: "#5B6472",
  verdigris: "#4FA898",
  verdigrisDeep: "#3A8577",
  amber: "#D89B3C",
  clay: "#B85C4A",
  clayDeep: "#95493A",
};

function useFonts() {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);
}

const displayFont = { fontFamily: "'Fraunces', serif" };
const bodyFont = { fontFamily: "'IBM Plex Sans', sans-serif" };
const monoFont = { fontFamily: "'IBM Plex Mono', monospace" };

// ---- mock data ----
const seedCreation = [
  { id: "TC-0042", kind: "topic", name: "Seat Upgrade Requests", parent: "In-flight", confidence: 0.88, excerpt: "asked twice if we could move to an exit row since my knees were jammed against the seat in front", count: 14 },
  { id: "TH-0117", kind: "theme", name: "Long hold times", confidence: 0.74, excerpt: "was on hold for forty minutes before anyone picked up, which felt absurd for a simple rebooking", count: 6 },
  { id: "TC-0043", kind: "topic", name: "Lounge Access", parent: "Pre-flight", confidence: 0.81, excerpt: "the lounge pass that came with the ticket ended up being the best part of the whole trip", count: 9 },
];

const seedPromotion = [
  { id: "TH-0089", name: "Wifi reliability", confidence: 0.91, occurrences: 47, days: 12, excerpt: "the wifi dropped three separate times during a six hour flight, each time losing my place in a work call", proposedTopicName: "In-Flight Connectivity" },
  { id: "TH-0102", name: "Gate change confusion", confidence: 0.79, occurrences: 33, days: 8, excerpt: "the gate changed twice on the app but the overhead board never updated, so half the line was standing at the wrong door", proposedTopicName: "Gate Change Communication" },
];

const seedMerge = [
  { id: "MG-0015", a: { name: "Baggage delay", count: 61 }, b: { name: "Late luggage arrival", count: 22 }, confidence: 0.86 },
  { id: "MG-0016", a: { name: "Rude attendant", count: 18 }, b: { name: "Attendant tone", count: 11 }, confidence: 0.68 },
];

const seedPending = [
  { id: "TC-0043", type: "Topic creation", label: "Lounge Access", age: 2 },
  { id: "TH-0117", type: "Theme creation", label: "Long hold times", age: 5 },
  { id: "TH-0089", type: "Promotion", label: "Wifi reliability → topic", age: 12 },
  { id: "MG-0015", type: "Merge", label: "Baggage delay + Late luggage arrival", age: 3 },
  { id: "TC-0044", type: "Topic creation", label: "Priority Boarding Confusion", age: 41 },
];

const seedDenied = [
  { id: "TH-0071", type: "Theme creation", label: "Weather sympathy", deniedOn: "Jun 29", by: "K. Reyes" },
  { id: "MG-0009", type: "Merge", label: "Cold food + Meal quality", deniedOn: "Jul 2", by: "K. Reyes" },
  { id: "TC-0038", type: "Topic creation", label: "Seat Recline Etiquette", deniedOn: "Jul 6", by: "S. Okafor" },
];

// simple taxonomy for the sandbox's mock matching
const taxonomy = [
  { name: "Pricing", parent: "Pre-flight", keywords: ["price", "expensive", "cheap", "cost", "fare"] },
  { name: "Check-in", parent: "Pre-flight", keywords: ["check-in", "check in", "boarding pass", "kiosk"] },
  { name: "Attendants", parent: "In-flight", keywords: ["attendant", "crew", "flight attendant", "staff"] },
  { name: "Cleanliness", parent: "In-flight", keywords: ["clean", "dirty", "disgusting", "mess"] },
  { name: "Baggage", parent: "Post-flight", keywords: ["bag", "luggage", "baggage", "suitcase"] },
  { name: "Airport departure", parent: "Post-flight", keywords: ["exit", "departure", "leaving the airport"] },
];
const themeWords = {
  positive: ["great", "friendly", "fast", "smooth", "easy", "breeze", "loved", "amazing"],
  negative: ["rude", "slow", "terrible", "awful", "delayed", "disgusting", "worst", "broke"],
};

function hashConfidence(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000;
  return 0.55 + (h % 400) / 1000; // 0.55 - 0.95
}

function analyzeSentence(text) {
  const lower = text.toLowerCase();
  const matchedTopics = taxonomy
    .filter((t) => t.keywords.some((k) => lower.includes(k)))
    .map((t) => ({ ...t, confidence: hashConfidence(t.name + text) }));

  const matchedThemeWords = [
    ...themeWords.positive.filter((w) => lower.includes(w)).map((w) => ({ word: w, tone: "positive" })),
    ...themeWords.negative.filter((w) => lower.includes(w)).map((w) => ({ word: w, tone: "negative" })),
  ];

  let state = "untagged";
  if (matchedTopics.length > 0) state = "tagged";
  if (matchedTopics.length === 0 && matchedThemeWords.length > 0) state = "untagged";
  // orphaned: mock rule - mentions a parent bucket word without a specific child keyword
  const parentHints = ["pre-flight", "in-flight", "post-flight", "flight"];
  if (matchedTopics.length === 0 && parentHints.some((p) => lower.includes(p))) state = "orphaned";

  return { matchedTopics, matchedThemeWords, state };
}

// hierarchical taxonomy for the Taxonomy screen — supports nesting up to 3 levels deep
const MAX_TOPIC_DEPTH = 3;
const taxonomyTree = [
  {
    name: "Pre-flight",
    children: [
      { name: "Pricing", count: 74, children: [] },
      { name: "Discovery", count: 12, children: [] },
      { name: "Purchase", count: 58, children: [] },
      { name: "Airport arrival", count: 29, children: [] },
      {
        name: "Check-in",
        count: 118,
        children: [
          { name: "Online check-in", count: 40, children: [] },
          { name: "Kiosk check-in", count: 22, children: [] },
        ],
      },
    ],
  },
  {
    name: "In-flight",
    children: [
      { name: "Cleanliness", count: 51, children: [] },
      { name: "Timeliness", count: 63, children: [] },
      { name: "Attendants", count: 142, children: [] },
    ],
  },
  {
    name: "Post-flight",
    children: [
      { name: "Baggage", count: 97, children: [] },
      { name: "Airport departure", count: 41, children: [] },
    ],
  },
];

// documents with inline-tagged segments for the detail view
const documentLibrary = [
  {
    id: "DOC-04812",
    name: "flight_review_04812.txt",
    state: "tagged",
    date: "Jul 8, 2026",
    pendingCount: 1,
    segments: [
      { text: "The attendants were ", type: "plain" },
      { text: "super friendly", type: "theme", label: "Positive sentiment", pending: false },
      { text: " and ", type: "plain" },
      { text: "leaving the airport was fast", type: "topic", label: "Airport departure", pending: false },
      { text: ", though my ", type: "plain" },
      { text: "bag showed up a day late", type: "topic", label: "Baggage", pending: true },
      { text: ".", type: "plain" },
    ],
  },
  {
    id: "DOC-2214",
    name: "support_call_2214.txt",
    state: "orphaned",
    date: "Jul 7, 2026",
    pendingCount: 2,
    segments: [
      { text: "Everything about the ", type: "plain" },
      { text: "in-flight experience", type: "topic", label: "In-flight (parent — no child matched)", pending: false, orphan: true },
      { text: " felt rushed, and the ", type: "plain" },
      { text: "wifi kept dropping", type: "theme", label: "Wifi reliability (proposed promotion)", pending: true },
      { text: " every twenty minutes or so.", type: "plain" },
    ],
  },
  {
    id: "DOC-0093",
    name: "survey_response_0093.txt",
    state: "untagged",
    date: "Jul 6, 2026",
    pendingCount: 0,
    segments: [
      { text: "It was fine, nothing memorable either way.", type: "plain" },
    ],
  },
];

const starterModels = [
  {
    key: "airline",
    name: "Airline Customer Experience",
    desc: "Pre-flight, in-flight, and post-flight topics covering booking, service, and logistics.",
    topics: 11,
    sample: "42 sample reviews",
  },
  {
    key: "hotel",
    name: "Hotel Guest Experience",
    desc: "Booking, stay, and checkout topics covering rooms, amenities, and staff interactions.",
    topics: 9,
    sample: "35 sample reviews",
  },
  {
    key: "support",
    name: "Support Ticket Triage",
    desc: "Issue categories and resolution patterns for inbound customer support tickets.",
    topics: 14,
    sample: "60 sample tickets",
  },
];

const docStates = [
  { name: "flight_review_04812.txt", state: "tagged", topics: 3 },
  { name: "support_call_2214.txt", state: "orphaned", topics: 1 },
  { name: "survey_response_0093.txt", state: "untagged", topics: 0 },
  { name: "flight_review_04813.txt", state: "tagged", topics: 2 },
];

function StampBadge({ label, color, deep }) {
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

function PerforatedEdge() {
  return (
    <div
      className="absolute -top-2 left-0 right-0 h-4 flex justify-around px-3"
      aria-hidden="true"
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="block w-2 h-2 rounded-full"
          style={{ background: C.ink }}
        />
      ))}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      className="relative rounded-md p-5 shadow-lg"
      style={{
        background: C.paper,
        border: `1px solid ${C.paperEdge}`,
        color: C.inkText,
        ...style,
      }}
    >
      <PerforatedEdge />
      {children}
    </div>
  );
}

function Confidence({ value }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-16 rounded-full overflow-hidden"
        style={{ background: C.paperEdge }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: C.verdigrisDeep }}
        />
      </div>
      <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
        {pct}% match
      </span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, tone }) {
  const map = {
    confirm: C.verdigrisDeep,
    deny: C.clayDeep,
    edit: "#5B6472",
    neutral: "#5B6472",
  };
  const color = map[tone] || "#5B6472";
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors"
      style={{
        color: "white",
        background: color,
        ...bodyFont,
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-md"
      style={{ border: `1px dashed ${C.panelBorder}`, color: C.muted }}
    >
      <CircleSlash size={28} strokeWidth={1.5} className="mb-3" />
      <p style={{ ...bodyFont, fontSize: 14 }}>{text}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, meta }) {
  return (
    <div className="mb-6 flex items-end justify-between flex-wrap gap-2">
      <div>
        <p
          style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }}
          className="uppercase mb-1"
        >
          {eyebrow}
        </p>
        <h1 style={{ ...displayFont, color: C.paper, fontSize: 28, fontWeight: 600 }}>
          {title}
        </h1>
      </div>
      {meta && (
        <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }}>{meta}</p>
      )}
    </div>
  );
}

// ---- Suggestion Review screen ----
function SuggestionReview() {
  const [tab, setTab] = useState("creation");
  const [creation, setCreation] = useState(seedCreation);
  const [promotion, setPromotion] = useState(seedPromotion);
  const [merge, setMerge] = useState(seedMerge);
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");

  const tabs = [
    { key: "creation", label: "Creation", icon: FileText, count: creation.length },
    { key: "promotion", label: "Promotion", icon: ChevronRight, count: promotion.length },
    { key: "merge", label: "Merge", icon: Merge, count: merge.length },
  ];

  const act = (list, setList, id) => setList(list.filter((x) => x.id !== id));

  return (
    <div>
      <SectionHeading
        eyebrow="Airline Feedback — Project Inbox"
        title="Suggestion Review"
        meta="Each queue is reviewed independently"
      />

      <div className="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors"
            style={{
              ...bodyFont,
              background: tab === t.key ? C.paper : "transparent",
              color: tab === t.key ? C.inkText : C.muted,
              border: tab === t.key ? `1px solid ${C.paperEdge}` : "1px solid transparent",
              borderBottom: tab === t.key ? `1px solid ${C.paper}` : "1px solid transparent",
            }}
          >
            <t.icon size={15} />
            {t.label}
            <span
              style={{
                ...monoFont,
                fontSize: 11,
                background: tab === t.key ? C.ink : C.panelBorder,
                color: tab === t.key ? C.paper : C.muted,
                padding: "1px 6px",
                borderRadius: 20,
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Creation queue */}
      {tab === "creation" && (
        <div className="grid gap-4 md:grid-cols-2">
          {creation.length === 0 && (
            <div className="md:col-span-2">
              <EmptyState text="No new topics or themes waiting on review." />
            </div>
          )}
          {creation.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between mb-3">
                <StampBadge
                  label={s.kind}
                  color={s.kind === "topic" ? C.verdigris : C.amber}
                  deep={s.kind === "topic" ? C.verdigrisDeep : "#8A6A25"}
                />
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{s.id}</span>
              </div>

              {editingId === s.id ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  style={{ ...displayFont, fontSize: 19, color: C.inkText, borderBottom: `2px solid ${C.verdigrisDeep}` }}
                  className="w-full bg-transparent outline-none mb-1 pb-1"
                />
              ) : (
                <h3 style={{ ...displayFont, fontSize: 19, fontWeight: 600 }} className="mb-1">
                  {s.name}
                </h3>
              )}

              {s.parent && (
                <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark }} className="mb-2">
                  under {s.parent}
                </p>
              )}

              <p style={{ ...bodyFont, fontStyle: "italic", fontSize: 13.5, color: "#4A4438" }} className="mb-3 leading-snug">
                "{s.excerpt}"
              </p>

              <div className="flex items-center justify-between mb-4">
                <Confidence value={s.confidence} />
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
                  seen in {s.count} docs
                </span>
              </div>

              <div className="flex gap-2">
                <ActionBtn icon={Check} label="Confirm" tone="confirm" onClick={() => act(creation, setCreation, s.id)} />
                <ActionBtn icon={X} label="Deny" tone="deny" onClick={() => act(creation, setCreation, s.id)} />
                {editingId === s.id ? (
                  <ActionBtn
                    icon={Pencil}
                    label="Save name"
                    tone="neutral"
                    onClick={() => {
                      setCreation(creation.map((x) => (x.id === s.id ? { ...x, name: nameDraft } : x)));
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <ActionBtn
                    icon={Pencil}
                    label="Rename"
                    tone="neutral"
                    onClick={() => {
                      setEditingId(s.id);
                      setNameDraft(s.name);
                    }}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Promotion queue */}
      {tab === "promotion" && (
        <div className="grid gap-4 md:grid-cols-2">
          {promotion.length === 0 && (
            <div className="md:col-span-2">
              <EmptyState text="No themes have crossed the promotion threshold." />
            </div>
          )}
          {promotion.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between mb-3">
                <StampBadge label="promotion" color={C.amber} deep="#8A6A25" />
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{s.id}</span>
              </div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span style={{ ...bodyFont, fontSize: 13, color: C.mutedDark, textDecoration: "line-through" }}>
                  {s.name}
                </span>
                <ChevronRight size={14} color={C.mutedDark} />
                <span style={{ ...displayFont, fontSize: 18, fontWeight: 600 }}>
                  {s.proposedTopicName}
                </span>
              </div>
              <p style={{ ...bodyFont, fontStyle: "italic", fontSize: 13.5, color: "#4A4438" }} className="mb-3 mt-2 leading-snug">
                "{s.excerpt}"
              </p>
              <div className="flex items-center justify-between mb-4">
                <Confidence value={s.confidence} />
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
                  {s.occurrences} occurrences · {s.days} days active
                </span>
              </div>
              <div className="flex gap-2">
                <ActionBtn icon={Check} label="Confirm promotion" tone="confirm" onClick={() => act(promotion, setPromotion, s.id)} />
                <ActionBtn icon={X} label="Deny" tone="deny" onClick={() => act(promotion, setPromotion, s.id)} />
                <ActionBtn icon={Pencil} label="Edit name" tone="neutral" onClick={() => {}} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Merge queue */}
      {tab === "merge" && (
        <div className="grid gap-4 md:grid-cols-2">
          {merge.length === 0 && (
            <div className="md:col-span-2">
              <EmptyState text="Nothing looks similar enough to merge right now." />
            </div>
          )}
          {merge.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between mb-3">
                <StampBadge label="merge" color={C.clay} deep={C.clayDeep} />
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{s.id}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 text-center py-2 rounded-sm" style={{ background: C.paperEdge }}>
                  <p style={{ ...displayFont, fontWeight: 600, fontSize: 15 }}>{s.a.name}</p>
                  <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{s.a.count} docs</p>
                </div>
                <Merge size={16} color={C.mutedDark} />
                <div className="flex-1 text-center py-2 rounded-sm" style={{ background: C.paperEdge }}>
                  <p style={{ ...displayFont, fontWeight: 600, fontSize: 15 }}>{s.b.name}</p>
                  <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{s.b.count} docs</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <Confidence value={s.confidence} />
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
                  merges into "{s.a.name}"
                </span>
              </div>
              <div className="flex gap-2">
                <ActionBtn icon={Check} label="Confirm merge" tone="confirm" onClick={() => act(merge, setMerge, s.id)} />
                <ActionBtn icon={X} label="Deny" tone="deny" onClick={() => act(merge, setMerge, s.id)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SandboxScreen({ threshold }) {
  const [text, setText] = useState(
    "The attendants were super friendly and leaving the airport was fast, but my bag showed up a day late."
  );
  const [result, setResult] = useState(null);

  const run = () => {
    if (!text.trim()) return;
    setResult(analyzeSentence(text));
  };

  const stateMeta = {
    tagged: { color: C.verdigris, label: "Would be tagged" },
    orphaned: { color: C.amber, label: "Would be orphaned" },
    untagged: { color: C.clay, label: "Would be untagged" },
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Airline Feedback — Sandbox"
        title="Try a Sentence"
        meta={`Threshold: ${threshold}`}
      />
      <p style={{ ...bodyFont, color: C.muted, fontSize: 13 }} className="mb-4 max-w-xl">
        Type any text and see how it would be classified against this project's current taxonomy.
        Nothing here is saved — no document is created, no suggestion enters a queue, no count changes.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Type a sentence or paste a short passage..."
        className="w-full rounded-md p-4 mb-3 outline-none resize-none"
        style={{
          ...bodyFont,
          background: C.panel,
          border: `1px solid ${C.panelBorder}`,
          color: C.paper,
          fontSize: 14,
        }}
      />
      <button
        onClick={run}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wide mb-8"
        style={{ ...bodyFont, background: C.verdigrisDeep, color: "white" }}
      >
        <Sparkles size={14} /> Analyze
      </button>

      {result && (
        <div className="relative">
          <div
            className="absolute -top-3 right-4 px-3 py-1 rounded-sm z-10"
            style={{
              ...monoFont,
              fontSize: 10.5,
              letterSpacing: "0.1em",
              background: C.ink,
              color: C.amber,
              border: `1px solid ${C.amber}`,
              transform: "rotate(2deg)",
            }}
          >
            PREVIEW · NOT SAVED
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <StampBadge
                label={stateMeta[result.state].label}
                color={stateMeta[result.state].color}
                deep={stateMeta[result.state].color}
              />
              <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
                evaluated at "{threshold}" sensitivity
              </span>
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
                  <div key={t.name} className="flex items-center justify-between py-2 px-3 rounded-sm" style={{ background: C.paperEdge }}>
                    <div>
                      <span style={{ ...displayFont, fontWeight: 600, fontSize: 14.5 }}>{t.name}</span>
                      <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }} className="ml-2">
                        under {t.parent}
                      </span>
                    </div>
                    <Confidence value={t.confidence} />
                  </div>
                ))}
              </div>
            )}

            <p style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.08em" }} className="uppercase mb-2">
              Theme signal (why/how)
            </p>
            {result.matchedThemeWords.length === 0 ? (
              <p style={{ ...bodyFont, fontSize: 13, color: C.mutedDark }}>
                No sentiment or pattern language detected.
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {result.matchedThemeWords.map((w) => (
                  <span
                    key={w.word}
                    className="px-2.5 py-1 rounded-sm text-xs font-medium"
                    style={{
                      ...monoFont,
                      background: w.tone === "positive" ? `${C.verdigris}25` : `${C.clay}25`,
                      color: w.tone === "positive" ? C.verdigrisDeep : C.clayDeep,
                    }}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function PendingScreen() {
  const [items] = useState(seedPending);
  return (
    <div>
      <SectionHeading eyebrow="Airline Feedback — Prioritization" title="Pending Queue" meta="Rolling 90-day window" />
      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            className="flex items-center justify-between px-5 py-3.5"
            style={{
              background: i % 2 === 0 ? C.panel : "#181E27",
              borderBottom: i < items.length - 1 ? `1px solid ${C.panelBorder}` : "none",
            }}
          >
            <div className="flex items-center gap-4">
              <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark, width: 70 }}>{it.id}</span>
              <span
                style={{ ...monoFont, fontSize: 10.5, color: C.amber, letterSpacing: "0.06em" }}
                className="uppercase"
              >
                {it.type}
              </span>
              <span style={{ ...bodyFont, color: C.paper, fontSize: 14 }}>{it.label}</span>
            </div>
            <span style={{ ...monoFont, fontSize: 12, color: it.age > 30 ? C.clay : C.muted }}>
              {it.age}d pending
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeniedScreen() {
  const [items, setItems] = useState(seedDenied);
  return (
    <div>
      <SectionHeading eyebrow="Airline Feedback — Suppression Log" title="Denied Items" meta="Rolling 30-day window · suppresses similar re-suggestions" />
      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            className="flex items-center justify-between px-5 py-3.5"
            style={{
              background: i % 2 === 0 ? C.panel : "#181E27",
              borderBottom: i < items.length - 1 ? `1px solid ${C.panelBorder}` : "none",
            }}
          >
            <div className="flex items-center gap-4">
              <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark, width: 70 }}>{it.id}</span>
              <span style={{ ...monoFont, fontSize: 10.5, color: C.clay, letterSpacing: "0.06em" }} className="uppercase">
                {it.type}
              </span>
              <span style={{ ...bodyFont, color: C.paper, fontSize: 14, textDecoration: "line-through", textDecorationColor: C.mutedDark }}>
                {it.label}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
                denied {it.deniedOn} · {it.by}
              </span>
              <button
                onClick={() => setItems(items.filter((x) => x.id !== it.id))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium"
                style={{ ...bodyFont, color: C.paper, border: `1px solid ${C.panelBorder}` }}
              >
                <RotateCcw size={12} /> Undeny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsScreen() {
  const levels = ["Conservative", "Balanced", "Aggressive"];
  const [detection, setDetection] = useState(1);
  const [promotion, setPromotion] = useState(0);
  const [mergeSetting, setMergeSetting] = useState(1);

  const Row = ({ label, desc, value, setValue }) => (
    <div className="mb-8">
      <p style={{ ...displayFont, fontSize: 17, fontWeight: 600, color: C.paper }} className="mb-1">
        {label}
      </p>
      <p style={{ ...bodyFont, fontSize: 13, color: C.muted }} className="mb-3 max-w-md">
        {desc}
      </p>
      <div className="inline-flex rounded-sm overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
        {levels.map((l, i) => (
          <button
            key={l}
            onClick={() => setValue(i)}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{
              ...bodyFont,
              letterSpacing: "0.05em",
              background: value === i ? C.verdigrisDeep : "transparent",
              color: value === i ? "white" : C.muted,
              borderRight: i < 2 ? `1px solid ${C.panelBorder}` : "none",
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <SectionHeading eyebrow="Airline Feedback — Project Settings" title="Mining Thresholds" meta="Applies to this project only" />
      <Row
        label="Detection"
        desc="How readily new topics and themes are suggested from incoming text."
        value={detection}
        setValue={setDetection}
      />
      <Row
        label="Promotion"
        desc="How readily a recurring theme is proposed for promotion to a topic."
        value={promotion}
        setValue={setPromotion}
      />
      <Row
        label="Merging"
        desc="How readily two similar topics or themes are proposed for merging."
        value={mergeSetting}
        setValue={setMergeSetting}
      />
      <div className="flex items-center gap-2 mt-2" style={{ color: C.muted }}>
        <Clock size={14} />
        <p style={{ ...bodyFont, fontSize: 12.5 }}>Mining runs daily across this project. You can also run it manually below.</p>
      </div>
      <button
        className="mt-4 px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wide"
        style={{ ...bodyFont, background: C.panel, color: C.paper, border: `1px solid ${C.panelBorder}` }}
      >
        Run mining now
      </button>

      <div className="mt-10 pt-6" style={{ borderTop: `1px solid ${C.panelBorder}` }}>
        <p style={{ ...monoFont, color: C.mutedDark, fontSize: 11, letterSpacing: "0.1em" }} className="uppercase">
          More project settings will live here as they're added
        </p>
      </div>
    </div>
  );
}

function SegmentSpan({ seg }) {
  if (seg.type === "plain") {
    return <span style={{ color: C.paper }}>{seg.text}</span>;
  }
  const color = seg.type === "topic" ? C.verdigris : C.amber;
  const deep = seg.type === "topic" ? C.verdigrisDeep : "#8A6A25";
  const pendingBg = seg.pending
    ? {
        backgroundImage: `repeating-linear-gradient(45deg, ${color}30, ${color}30 4px, transparent 4px, transparent 8px)`,
      }
    : { background: `${color}25` };
  return (
    <span className="relative group inline">
      <span
        className="px-1 py-0.5 rounded-sm"
        style={{
          ...pendingBg,
          color: C.paper,
          border: `1px solid ${seg.pending ? color : "transparent"}`,
          borderStyle: seg.pending ? "dashed" : "solid",
        }}
      >
        {seg.text}
      </span>
      <span
        className="absolute left-0 -top-6 hidden group-hover:block whitespace-nowrap px-2 py-1 rounded-sm z-10"
        style={{ ...monoFont, fontSize: 10.5, background: C.ink, color: deep, border: `1px solid ${color}` }}
      >
        {seg.label} {seg.pending ? "· pending" : ""}
      </span>
    </span>
  );
}

function DocumentDetail({ doc, onBack }) {
  const stateMeta = {
    tagged: { color: C.verdigris, label: "Tagged" },
    orphaned: { color: C.amber, label: "Orphaned" },
    untagged: { color: C.clay, label: "Untagged" },
  }[doc.state];

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm" style={{ ...bodyFont, color: C.muted }}>
        <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Back to documents
      </button>
      <SectionHeading eyebrow={doc.id} title={doc.name} meta={doc.date} />

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <StampBadge label={stateMeta.label} color={stateMeta.color} deep={stateMeta.color} />
        {doc.pendingCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs"
            style={{ ...monoFont, color: C.amber, border: `1px dashed ${C.amber}` }}
          >
            {doc.pendingCount} pending suggestion{doc.pendingCount > 1 ? "s" : ""} from this document
          </span>
        )}
      </div>

      <Card>
        <p style={{ ...bodyFont, fontSize: 15, lineHeight: 1.9 }}>
          {doc.segments.map((seg, i) => (
            <SegmentSpan key={i} seg={seg} />
          ))}
        </p>
      </Card>

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
          <span
            className="w-3 h-3 rounded-sm"
            style={{ border: `1px dashed ${C.amber}`, backgroundImage: `repeating-linear-gradient(45deg, ${C.amber}30, ${C.amber}30 3px, transparent 3px, transparent 6px)` }}
          />
          <span style={{ ...bodyFont, fontSize: 12 }}>Pending decision</span>
        </div>
      </div>
    </div>
  );
}

function DocumentsScreen({ initialFilter }) {
  const [filter, setFilter] = useState(initialFilter || "all");
  const [openDoc, setOpenDoc] = useState(null);

  useEffect(() => {
    setFilter(initialFilter || "all");
  }, [initialFilter]);

  const filters = [
    { key: "all", label: "All" },
    { key: "tagged", label: "Tagged" },
    { key: "orphaned", label: "Orphaned" },
    { key: "untagged", label: "Untagged" },
    { key: "pending", label: "Has pending" },
  ];

  const filtered = documentLibrary.filter((d) => {
    if (filter === "all") return true;
    if (filter === "pending") return d.pendingCount > 0;
    return d.state === filter;
  });

  if (openDoc) {
    return <DocumentDetail doc={openDoc} onBack={() => setOpenDoc(null)} />;
  }

  return (
    <div>
      <SectionHeading eyebrow="Airline Feedback — All Documents" title="Documents" meta={`${filtered.length} shown`} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              ...bodyFont,
              background: filter === f.key ? C.verdigrisDeep : "transparent",
              color: filter === f.key ? "white" : C.muted,
              border: `1px solid ${filter === f.key ? C.verdigrisDeep : C.panelBorder}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
        {filtered.map((d, i) => {
          const stateMeta = {
            tagged: { color: C.verdigris, label: "Tagged" },
            orphaned: { color: C.amber, label: "Orphaned" },
            untagged: { color: C.clay, label: "Untagged" },
          }[d.state];
          return (
            <button
              key={d.id}
              onClick={() => setOpenDoc(d)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left"
              style={{
                background: i % 2 === 0 ? C.panel : "#181E27",
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.panelBorder}` : "none",
              }}
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
                <span style={{ ...monoFont, fontSize: 11, color: stateMeta.color, letterSpacing: "0.05em" }} className="uppercase">
                  {stateMeta.label}
                </span>
                <ChevronRight size={14} color={C.mutedDark} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TaxonomyNode({ node, path, depth, expanded, toggle, adding, setAdding, draft, setDraft, onAddChild, onDrillToDocuments }) {
  const canExpand = depth < MAX_TOPIC_DEPTH;
  const isOpen = expanded.includes(path);
  const indent = 20 + (depth - 1) * 24;

  return (
    <div>
      <button
        onClick={() => (depth === 1 ? toggle(path) : onDrillToDocuments(node.name))}
        className="w-full flex items-center justify-between pr-5 py-2.5 text-left"
        style={{
          paddingLeft: indent,
          background: depth === 1 ? C.panel : "#181E27",
          borderBottom: `1px solid ${C.panelBorder}`,
        }}
      >
        <div className="flex items-center gap-2">
          {canExpand && (
            <ChevronRight
              size={depth === 1 ? 14 : 12}
              color={C.muted}
              onClick={(e) => {
                e.stopPropagation();
                toggle(path);
              }}
              style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
            />
          )}
          <span
            style={{
              ...(depth === 1 ? displayFont : bodyFont),
              fontWeight: depth === 1 ? 600 : 400,
              fontSize: depth === 1 ? 15.5 : 13.5,
              color: C.paper,
            }}
          >
            {node.name}
          </span>
        </div>
        <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>
          {depth === 1 ? `${node.children.length} topics` : node.count !== undefined ? `${node.count} docs` : ""}
        </span>
      </button>

      {canExpand && isOpen && (
        <div>
          {(node.children || []).map((child, i) => (
            <TaxonomyNode
              key={child.name + i}
              node={child}
              path={`${path}>${child.name}`}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              adding={adding}
              setAdding={setAdding}
              draft={draft}
              setDraft={setDraft}
              onAddChild={onAddChild}
              onDrillToDocuments={onDrillToDocuments}
            />
          ))}

          <div className="py-2.5 pr-5" style={{ paddingLeft: indent + 24, background: "#181E27", borderBottom: `1px solid ${C.panelBorder}` }}>
            {adding === path ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="New topic name..."
                  className="flex-1 bg-transparent outline-none text-sm py-1"
                  style={{ ...bodyFont, color: C.paper, borderBottom: `1px solid ${C.verdigrisDeep}` }}
                />
                <ActionBtn
                  icon={Check}
                  label="Add"
                  tone="confirm"
                  onClick={() => {
                    onAddChild(path, draft);
                    setAdding(null);
                    setDraft("");
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setAdding(path)}
                style={{ ...monoFont, fontSize: 11, color: C.mutedDark, letterSpacing: "0.05em" }}
                className="uppercase"
              >
                + Add {depth === 1 ? "topic" : "subtopic"} under {node.name}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaxonomyScreen({ onDrillToDocuments }) {
  const [tree, setTree] = useState(taxonomyTree);
  const [expanded, setExpanded] = useState(taxonomyTree.map((t) => t.name));
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState("");

  const toggle = (path) =>
    setExpanded((e) => (e.includes(path) ? e.filter((x) => x !== path) : [...e, path]));

  const addChild = (path, name) => {
    if (!name.trim()) return;
    const parts = path.split(">");
    const insert = (nodes, depth) => {
      return nodes.map((n) => {
        if (n.name !== parts[depth]) return n;
        if (depth === parts.length - 1) {
          return { ...n, children: [...(n.children || []), { name: name.trim(), count: 0, children: [] }] };
        }
        return { ...n, children: insert(n.children || [], depth + 1) };
      });
    };
    setTree((t) => insert(t, 0));
    setExpanded((e) => [...e, path]);
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Airline Feedback — Manual Ontology"
        title="Taxonomy"
        meta={`Click a topic to see its documents · up to ${MAX_TOPIC_DEPTH} levels deep`}
      />

      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
        {tree.map((parent, i) => (
          <TaxonomyNode
            key={parent.name + i}
            node={parent}
            path={parent.name}
            depth={1}
            expanded={expanded}
            toggle={toggle}
            adding={adding}
            setAdding={setAdding}
            draft={draft}
            setDraft={setDraft}
            onAddChild={addChild}
            onDrillToDocuments={onDrillToDocuments}
          />
        ))}
      </div>
    </div>
  );
}

function ColdStartScreen({ onCreated }) {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <SectionHeading eyebrow="New Project" title="Start Something New" meta="Choose a starting point" />

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {starterModels.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            className="text-left rounded-md p-5"
            style={{
              background: selected === m.key ? C.panel : "transparent",
              border: `1.5px solid ${selected === m.key ? C.verdigrisDeep : C.panelBorder}`,
            }}
          >
            <Sparkles size={18} color={C.verdigris} className="mb-3" />
            <p style={{ ...displayFont, fontWeight: 600, fontSize: 16, color: C.paper }} className="mb-1.5">
              {m.name}
            </p>
            <p style={{ ...bodyFont, fontSize: 12.5, color: C.muted }} className="mb-3 leading-snug">
              {m.desc}
            </p>
            <div className="flex gap-3">
              <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{m.topics} starter topics</span>
              <span style={{ ...monoFont, fontSize: 11, color: C.amber }}>{m.sample}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setSelected("blank")}
        className="w-full text-left rounded-md p-4 mb-8"
        style={{ border: `1.5px dashed ${C.panelBorder}`, background: selected === "blank" ? C.panel : "transparent" }}
      >
        <p style={{ ...bodyFont, color: C.paper, fontSize: 13.5 }}>Start from scratch — blank taxonomy, no sample data</p>
      </button>

      <button
        disabled={!selected}
        onClick={onCreated}
        className="px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wide"
        style={{
          ...bodyFont,
          background: selected ? C.verdigrisDeep : C.panelBorder,
          color: selected ? "white" : C.mutedDark,
        }}
      >
        {selected && selected !== "blank" ? "Create project with sample data" : "Create project"}
      </button>
    </div>
  );
}

function UploadScreen() {
  return (
    <div>
      <SectionHeading eyebrow="Airline Feedback — Ingestion" title="Upload Documents" />
      <div
        className="rounded-md flex flex-col items-center justify-center py-14 mb-8"
        style={{ border: `2px dashed ${C.panelBorder}` }}
      >
        <UploadCloud size={30} color={C.muted} className="mb-3" />
        <p style={{ ...bodyFont, color: C.paper, fontSize: 14 }} className="mb-1">
          Drop files here, or browse
        </p>
        <p style={{ ...bodyFont, color: C.mutedDark, fontSize: 12 }}>
          A document that matches an existing key will replace the prior version
        </p>
      </div>

      <p style={{ ...monoFont, color: C.amber, fontSize: 11, letterSpacing: "0.14em" }} className="uppercase mb-3">
        Recent uploads
      </p>
      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.panelBorder}` }}>
        {docStates.map((d, i) => {
          const stateStyle = {
            tagged: { color: C.verdigris, label: "Tagged" },
            orphaned: { color: C.amber, label: "Orphaned" },
            untagged: { color: C.clay, label: "Untagged" },
          }[d.state];
          return (
            <div
              key={d.name}
              className="flex items-center justify-between px-5 py-3.5"
              style={{
                background: i % 2 === 0 ? C.panel : "#181E27",
                borderBottom: i < docStates.length - 1 ? `1px solid ${C.panelBorder}` : "none",
              }}
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
                <span style={{ ...monoFont, fontSize: 11, color: C.mutedDark }}>{d.topics} topics</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsScreen({ onDrillToDocuments }) {
  const topics = [
    { name: "Attendants", count: 142 },
    { name: "Check-in", count: 118 },
    { name: "Baggage", count: 97 },
    { name: "Pricing", count: 74 },
    { name: "Cleanliness", count: 51 },
  ];
  const max = Math.max(...topics.map((t) => t.count));
  return (
    <div>
      <SectionHeading eyebrow="Airline Feedback — Reporting" title="Topic Counts" meta="Accumulated across all batches" />
      <div className="space-y-4 mb-10">
        {topics.map((t) => (
          <button key={t.name} onClick={() => onDrillToDocuments(t.name)} className="w-full text-left block">
            <div className="flex justify-between mb-1">
              <span style={{ ...bodyFont, color: C.paper, fontSize: 13.5 }}>{t.name}</span>
              <span style={{ ...monoFont, color: C.muted, fontSize: 12 }}>{t.count}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: C.panel }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(t.count / max) * 100}%`, background: C.verdigrisDeep }}
              />
            </div>
          </button>
        ))}
      </div>

      <p style={{ ...bodyFont, fontSize: 12, color: C.mutedDark }} className="mb-3">Click a tile to see the underlying documents</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tagged", value: "89%", color: C.verdigris, filter: "tagged" },
          { label: "Orphaned", value: "7%", color: C.amber, filter: "orphaned" },
          { label: "Untagged", value: "4%", color: C.clay, filter: "untagged" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => onDrillToDocuments(s.filter)}
            className="text-left rounded-md p-4"
            style={{ border: `1px solid ${C.panelBorder}` }}
          >
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

export default function App() {
  useFonts();
  const [section, setSection] = useState("textAnalytics");
  const [taTab, setTaTab] = useState("taxonomy");
  const [threshold] = useState("Balanced");
  const [docFilterTopic, setDocFilterTopic] = useState(null);
  const [showColdStart, setShowColdStart] = useState(false);

  const nav = [
    { key: "upload", label: "Upload", icon: UploadCloud },
    { key: "textAnalytics", label: "Text Analytics", icon: LayoutGrid },
    { key: "documents", label: "Documents", icon: Search },
    { key: "reports", label: "Reports", icon: BarChart3 },
    { key: "settings", label: "Settings", icon: SlidersHorizontal },
  ];

  const taSubTabs = [
    { key: "taxonomy", label: "Taxonomy", icon: FileText },
    { key: "suggestions", label: "Suggestions", icon: Inbox },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "denied", label: "Denied", icon: Archive },
    { key: "sandbox", label: "Sandbox", icon: FlaskConical },
  ];

  const goToDocuments = (topicName) => {
    setDocFilterTopic(topicName || "all");
    setSection("documents");
  };

  const taScreens = {
    suggestions: <SuggestionReview />,
    taxonomy: <TaxonomyScreen onDrillToDocuments={goToDocuments} />,
    pending: <PendingScreen />,
    denied: <DeniedScreen />,
    sandbox: <SandboxScreen threshold={threshold} />,
  };

  if (showColdStart) {
    return (
      <div className="flex min-h-screen" style={{ background: C.ink, ...bodyFont }}>
        <div className="flex-1 px-10 py-8 max-w-3xl mx-auto">
          <ColdStartScreen onCreated={() => setShowColdStart(false)} />
        </div>
      </div>
    );
  }

  const topScreens = {
    upload: <UploadScreen />,
    textAnalytics: (
      <div>
        <div className="flex gap-1 mb-8">
          {taSubTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTaTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium"
              style={{
                ...bodyFont,
                background: taTab === t.key ? C.panel : "transparent",
                color: taTab === t.key ? C.paper : C.muted,
                border: `1px solid ${taTab === t.key ? C.panelBorder : "transparent"}`,
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
        {taScreens[taTab]}
      </div>
    ),
    documents: <DocumentsScreen initialFilter={docFilterTopic === "all" || !docFilterTopic ? "all" : docFilterTopic} />,
    reports: <ReportsScreen onDrillToDocuments={goToDocuments} />,
    settings: <SettingsScreen />,
  };

  return (
    <div className="flex min-h-screen" style={{ background: C.ink, ...bodyFont }}>
      {/* sidebar */}
      <div className="w-56 shrink-0 flex flex-col py-6 px-4" style={{ borderRight: `1px solid ${C.panelBorder}` }}>
        <div className="mb-8 px-1">
          <p style={{ ...displayFont, color: C.paper, fontSize: 19, fontWeight: 600 }}>
            Text Analytics
          </p>
          <p style={{ ...monoFont, color: C.mutedDark, fontSize: 10.5, letterSpacing: "0.08em" }} className="uppercase mt-0.5">
            Explorer
          </p>
        </div>
        <div className="mb-2 px-1 flex items-center gap-2" style={{ color: C.muted }}>
          <Search size={13} />
          <span style={{ fontSize: 12.5 }}>Airline Feedback</span>
        </div>
        <button
          onClick={() => setShowColdStart(true)}
          className="mb-6 px-1 text-left"
          style={{ ...monoFont, fontSize: 10.5, color: C.mutedDark, letterSpacing: "0.06em" }}
        >
          + NEW PROJECT
        </button>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-sm text-left"
              style={{
                background: section === n.key ? C.panel : "transparent",
                color: section === n.key ? C.paper : C.muted,
                fontWeight: section === n.key ? 600 : 400,
              }}
            >
              <n.icon size={16} />
              {n.label}
            </button>
          ))}
        </nav>
      </div>

      {/* main */}
      <div className="flex-1 px-10 py-8 max-w-5xl">{topScreens[section]}</div>
    </div>
  );
}
