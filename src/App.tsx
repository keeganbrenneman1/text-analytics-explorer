import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Inbox, Clock, Archive, SlidersHorizontal, BarChart3, UploadCloud,
  FileText, Search, FlaskConical, LayoutGrid, ChevronDown,
} from "lucide-react";
import { C, bodyFont, displayFont, monoFont, useFonts } from "./components/theme";
import { LoadingState, ErrorState } from "./components/Shared";
import { isSupabaseConfigured } from "./lib/supabase";
import { listProjects } from "./lib/api/projects";
import { describeError } from "./lib/errorMessage";
import type { DocFilter, DocumentState, Project } from "./lib/types";
import { ColdStartScreen } from "./components/ColdStartScreen";
import { UploadScreen } from "./components/UploadScreen";
import { TaxonomyScreen } from "./components/TaxonomyScreen";
import { SuggestionReview } from "./components/SuggestionReview";
import { PendingScreen } from "./components/PendingScreen";
import { DeniedScreen } from "./components/DeniedScreen";
import { SandboxScreen } from "./components/SandboxScreen";
import { DocumentsScreen } from "./components/DocumentsScreen";
import { ReportsScreen } from "./components/ReportsScreen";
import { SettingsScreen } from "./components/SettingsScreen";

function ConnectSupabaseNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: C.ink, ...bodyFont }}>
      <div className="max-w-md rounded-md p-6" style={{ border: `1px solid ${C.panelBorder}`, background: C.panel }}>
        <h1 style={{ ...displayFont, color: C.paper, fontSize: 22, fontWeight: 600 }} className="mb-3">
          Connect Supabase
        </h1>
        <p style={{ color: C.muted, fontSize: 13.5 }} className="mb-3 leading-relaxed">
          This app needs a Supabase project to persist data. Copy <code style={{ ...monoFont }}>.env.example</code> to{" "}
          <code style={{ ...monoFont }}>.env.local</code>, fill in your project URL and anon key, run the SQL in{" "}
          <code style={{ ...monoFont }}>supabase/migrations/0001_init.sql</code> against it, then restart the dev server.
        </p>
        <p style={{ color: C.mutedDark, fontSize: 12 }}>See README.md for the full setup walkthrough.</p>
      </div>
    </div>
  );
}

type Section = "upload" | "textAnalytics" | "documents" | "reports" | "settings";
type TaTab = "taxonomy" | "suggestions" | "pending" | "denied" | "sandbox";

export default function App() {
  useFonts();

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showColdStart, setShowColdStart] = useState(false);
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);

  const [section, setSection] = useState<Section>("textAnalytics");
  const [taTab, setTaTab] = useState<TaTab>("taxonomy");
  const [docFilter, setDocFilter] = useState<DocFilter>({ kind: "state", state: "all" });
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = async () => {
    try {
      const list = await listProjects();
      setProjects(list);
      setCurrentProjectId((prev) => prev ?? list[0]?.id ?? null);
    } catch (err) {
      setLoadError(describeError(err));
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) void reload();
  }, []);

  if (!isSupabaseConfigured) return <ConnectSupabaseNotice />;
  if (loadError) return <ErrorState text={loadError} />;
  if (projects === null) return <LoadingState text="Loading projects…" />;

  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  const handleProjectCreated = async (projectId: string) => {
    setShowColdStart(false);
    await reload();
    setCurrentProjectId(projectId);
  };

  if (projects.length === 0 || showColdStart) {
    return (
      <div className="flex min-h-screen" style={{ background: C.ink, ...bodyFont }}>
        <div className="flex-1 px-10 py-8 max-w-3xl mx-auto">
          <ColdStartScreen
            allowCancel={projects.length > 0}
            onCancel={() => setShowColdStart(false)}
            onCreated={handleProjectCreated}
          />
        </div>
      </div>
    );
  }

  if (!currentProject) return <LoadingState />;

  const nav: { key: Section; label: string; icon: typeof UploadCloud }[] = [
    { key: "upload", label: "Upload", icon: UploadCloud },
    { key: "textAnalytics", label: "Text Analytics", icon: LayoutGrid },
    { key: "documents", label: "Documents", icon: Search },
    { key: "reports", label: "Reports", icon: BarChart3 },
    { key: "settings", label: "Settings", icon: SlidersHorizontal },
  ];

  const taSubTabs: { key: TaTab; label: string; icon: typeof FileText }[] = [
    { key: "taxonomy", label: "Taxonomy", icon: FileText },
    { key: "suggestions", label: "Suggestions", icon: Inbox },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "denied", label: "Denied", icon: Archive },
    { key: "sandbox", label: "Sandbox", icon: FlaskConical },
  ];

  const goToTopicDocuments = (topicId: string, topicName: string) => {
    setDocFilter({ kind: "topic", topicId, topicName });
    setSection("documents");
  };

  const goToDocuments = (target: { topicId: string; topicName: string } | { state: "all" | DocumentState }) => {
    if ("topicId" in target) setDocFilter({ kind: "topic", topicId: target.topicId, topicName: target.topicName });
    else setDocFilter({ kind: "state", state: target.state });
    setSection("documents");
  };

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const taScreens: Record<TaTab, ReactNode> = {
    suggestions: <SuggestionReview projectId={currentProject.id} onChange={bumpRefresh} />,
    taxonomy: <TaxonomyScreen projectId={currentProject.id} refreshKey={refreshKey} onDrillToDocuments={goToTopicDocuments} />,
    pending: <PendingScreen projectId={currentProject.id} refreshKey={refreshKey} />,
    denied: <DeniedScreen projectId={currentProject.id} onChange={bumpRefresh} />,
    sandbox: <SandboxScreen projectId={currentProject.id} threshold={currentProject.detectionThreshold} />,
  };

  const topScreens: Record<Section, ReactNode> = {
    upload: <UploadScreen projectId={currentProject.id} onUploaded={bumpRefresh} />,
    textAnalytics: (
      <div>
        <div className="flex gap-1 mb-8 flex-wrap">
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
    documents: (
      <DocumentsScreen
        key={docFilter.kind === "topic" ? docFilter.topicId : docFilter.kind === "pending" ? "pending" : docFilter.state}
        projectId={currentProject.id}
        initialFilter={docFilter}
        refreshKey={refreshKey}
      />
    ),
    reports: <ReportsScreen projectId={currentProject.id} refreshKey={refreshKey} onDrillToDocuments={goToDocuments} />,
    settings: <SettingsScreen project={currentProject} onChange={reload} onMined={bumpRefresh} />,
  };

  return (
    <div className="flex min-h-screen" style={{ background: C.ink, ...bodyFont }}>
      <div className="w-60 shrink-0 flex flex-col py-6 px-4" style={{ borderRight: `1px solid ${C.panelBorder}` }}>
        <div className="mb-8 px-1">
          <p style={{ ...displayFont, color: C.paper, fontSize: 19, fontWeight: 600 }}>Text Analytics</p>
          <p style={{ ...monoFont, color: C.mutedDark, fontSize: 10.5, letterSpacing: "0.08em" }} className="uppercase mt-0.5">
            Explorer
          </p>
        </div>

        <div className="relative mb-2">
          <button
            onClick={() => setProjectSwitcherOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-1 py-1"
            style={{ color: C.muted }}
          >
            <span className="flex items-center gap-2 truncate">
              <Search size={13} />
              <span style={{ fontSize: 12.5 }} className="truncate">{currentProject.name}</span>
            </span>
            <ChevronDown size={13} />
          </button>
          {projectSwitcherOpen && (
            <div
              className="absolute left-0 right-0 mt-1 rounded-sm overflow-hidden z-20"
              style={{ background: C.panel, border: `1px solid ${C.panelBorder}` }}
            >
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentProjectId(p.id);
                    setProjectSwitcherOpen(false);
                    setSection("textAnalytics");
                  }}
                  className="w-full text-left px-3 py-2 text-xs"
                  style={{
                    ...bodyFont,
                    color: p.id === currentProject.id ? C.paper : C.muted,
                    background: p.id === currentProject.id ? C.panelBorder : "transparent",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
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
              style={{ background: section === n.key ? C.panel : "transparent", color: section === n.key ? C.paper : C.muted, fontWeight: section === n.key ? 600 : 400 }}
            >
              <n.icon size={16} />
              {n.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 px-10 py-8 max-w-5xl">{topScreens[section]}</div>
    </div>
  );
}
