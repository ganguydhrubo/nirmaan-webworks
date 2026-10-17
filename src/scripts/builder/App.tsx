import { useEffect, useRef, useState } from "preact/hooks";
import type { BriefShape as Brief } from "@/lib/builder/options";
import { templateDoc } from "@/lib/builder/templates";
import type { SiteDoc } from "@/lib/builder/schema";
import { initEditor, getState, setState } from "./store";
import { startAutosave, saveNow } from "./autosave";
import { createProject, deleteProject, getProject, listProjects, readBackup, storageAvailable, type ProjectSummary } from "./persistence";
import { generateSite } from "./api";
import { StartScreen, Wizard, Generating, EMPTY_BRIEF } from "./Onboarding";
import { Editor } from "./Editor";
import { Toasts, toast, confirmDialog } from "./ui";
import "./builder.css";

type Screen = { name: "loading" } | { name: "start"; showTemplates?: boolean } | { name: "wizard" } | { name: "generating"; error: { code: string; message: string } | null } | { name: "editor" };

const BRIEF_DRAFT_KEY = "atittle-builder-brief";

function setUrl(params: Record<string, string>): void {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams(params).toString();
  window.history.replaceState(null, "", url);
}

function loadBriefDraft(): Brief {
  try {
    const raw = sessionStorage.getItem(BRIEF_DRAFT_KEY);
    if (raw) return { ...EMPTY_BRIEF, ...(JSON.parse(raw) as Partial<Brief>), contact: { ...EMPTY_BRIEF.contact, ...(JSON.parse(raw) as Brief).contact } };
  } catch {
    /* storage unavailable — start empty */
  }
  return EMPTY_BRIEF;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [brief, setBrief] = useState<Brief>(loadBriefDraft);
  const [remaining, setRemaining] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlight = useRef(false);

  const refreshProjects = async () => {
    try {
      setProjects(await listProjects());
    } catch {
      setProjects([]);
    }
  };

  const openDoc = async (doc: SiteDoc, message?: string) => {
    if (storageOk) {
      try {
        const rec = await createProject(doc);
        initEditor(rec.doc, rec.id, rec.rev);
        setUrl({ project: rec.id });
      } catch {
        initEditor(doc, null);
        setState({ saveState: "unavailable" });
        setStorageOk(false);
      }
    } else {
      initEditor(doc, null);
      setState({ saveState: "unavailable" });
    }
    setScreen({ name: "editor" });
    if (message) toast(message, "success", undefined, 8000);
  };

  const openProject = async (id: string) => {
    try {
      const rec = await getProject(id);
      if (!rec) {
        toast("That project wasn't found in this browser. Projects are saved per device and browser.", "error");
        setUrl({});
        setScreen({ name: "start" });
        return;
      }
      initEditor(rec.doc, rec.id, rec.rev);
      setUrl({ project: rec.id });
      setScreen({ name: "editor" });
    } catch {
      toast("Couldn't open that project.", "error");
      setScreen({ name: "start" });
    }
  };

  useEffect(() => {
    startAutosave();
    void (async () => {
      const ok = await storageAvailable();
      setStorageOk(ok);
      if (ok) await refreshProjects();
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get("project");
      const template = params.get("template");
      if (projectId && ok) return openProject(projectId);
      if (template) {
        const doc = templateDoc(template);
        if (doc) return openDoc(doc, "Template loaded. Click any text in the preview to change it.");
      }
      if (params.get("start") === "ai") return setScreen({ name: "wizard" });
      setScreen({ name: "start", showTemplates: params.get("start") === "templates" });
    })();
  }, []);

  const generate = async (b: Brief) => {
    if (inFlight.current) return; // never fire a second paid request while one is running
    inFlight.current = true;
    setBrief(b);
    try {
      sessionStorage.setItem(BRIEF_DRAFT_KEY, JSON.stringify(b));
    } catch {
      /* ignore */
    }
    setScreen({ name: "generating", error: null });
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await generateSite(b, controller.signal);
    inFlight.current = false;
    abortRef.current = null;
    if (typeof result.remaining === "number") setRemaining(result.remaining);
    if (!result.ok) {
      if (result.code === "aborted") return setScreen({ name: "wizard" });
      return setScreen({ name: "generating", error: { code: result.code, message: result.message } });
    }
    await openDoc(result.doc, "Your website is ready! Click any text to edit it, or select a section to change its layout.");
  };

  const exitEditor = async () => {
    await saveNow();
    const s = getState();
    if (!s.projectId && !confirmDialog("This project isn't saved in this browser. Leave anyway? Download a backup first if you want to keep it.")) return;
    setUrl({});
    await refreshProjects();
    setScreen({ name: "start" });
  };

  return (
    <div class="atb-root">
      {screen.name === "loading" && (
        <div class="atb-loading" role="status">
          <span class="atb-spinner" aria-hidden="true" /> Loading the builder…
        </div>
      )}
      {screen.name === "start" && (
        <StartScreen
          projects={projects}
          storageOk={storageOk}
          showTemplates={!!screen.showTemplates}
          onAi={() => setScreen({ name: "wizard" })}
          onTemplate={(id) => {
            const doc = templateDoc(id);
            if (doc) void openDoc(doc, "Template loaded. Click any text in the preview to change it.");
          }}
          onOpen={(id) => void openProject(id)}
          onDelete={(id) => {
            const p = projects.find((x) => x.id === id);
            if (p && confirmDialog(`Permanently delete "${p.name}" from this browser? This can't be undone.`)) {
              void deleteProject(id).then(refreshProjects);
            }
          }}
          onImport={(file) => {
            readBackup(file)
              .then(({ doc, warnings }) => openDoc(doc, warnings.length ? `Project imported. Note: ${warnings[0]}` : "Project imported."))
              .catch((err: unknown) => toast(err instanceof Error ? err.message : "Couldn't import that file.", "error"));
          }}
        />
      )}
      {screen.name === "wizard" && <Wizard initial={brief} remaining={remaining} onBack={() => setScreen({ name: "start" })} onSubmit={(b) => void generate(b)} />}
      {screen.name === "generating" && (
        <Generating
          brief={brief}
          error={screen.error}
          onCancel={() => abortRef.current?.abort()}
          onRetry={() => void generate(brief)}
          onEdit={() => setScreen({ name: "wizard" })}
          onTemplates={() => setScreen({ name: "start", showTemplates: true })}
        />
      )}
      {screen.name === "editor" && <Editor onExit={() => void exitEditor()} remaining={remaining} setRemaining={setRemaining} storageOk={storageOk} />}
      <Toasts />
    </div>
  );
}
