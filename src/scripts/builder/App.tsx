import { useEffect, useRef, useState } from "preact/hooks";
import type { BriefShape as Brief } from "@/lib/builder/options";
import { templateDoc } from "@/lib/builder/templates";
import { MAX_ASSETS, validateAsset, type SiteDoc } from "@/lib/builder/schema";
import { fieldAtPath } from "@/lib/builder/catalog";
import { initEditor, getState, setState, setUploadedImage, findSection } from "./store";
import { startAutosave, saveNow } from "./autosave";
import { createProject, deleteProject, getProject, listProjects, readBackup, storageAvailable, type ProjectSummary } from "./persistence";
import { generateSite, newRequestId } from "./api";
import { StartScreen, Wizard, Generating, EMPTY_BRIEF } from "./Onboarding";
import { Editor } from "./Editor";
import { Toasts, toast, confirmDialog } from "./ui";
import { initNav, pushRoute, replaceRoute, routeFromLocation, canGoBackInApp, leaveBuilder, type Route } from "./nav";
import "./builder.css";

type Screen = { name: "loading" } | { name: "start"; showTemplates?: boolean } | { name: "wizard" } | { name: "generating"; error: { code: string; message: string; retryable: boolean } | null } | { name: "editor" };

const BRIEF_DRAFT_KEY = "atittle-builder-brief";


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
  const lastAttempt = useRef<{ key: string; id: string; reuse: boolean } | null>(null);

  const refreshProjects = async () => {
    try {
      setProjects(await listProjects());
    } catch {
      setProjects([]);
    }
  };

  const openDoc = async (doc: SiteDoc, message?: string, push = false) => {
    if (storageOk) {
      try {
        const rec = await createProject(doc);
        initEditor(rec.doc, rec.id, rec.rev);
        (push ? pushRoute : replaceRoute)({ name: "editor", project: rec.id });
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
        replaceRoute({ name: "start" });
        setScreen({ name: "start" });
        return;
      }
      initEditor(rec.doc, rec.id, rec.rev);
      replaceRoute({ name: "editor", project: rec.id });
      setScreen({ name: "editor" });
    } catch {
      toast("Couldn't open that project.", "error");
      setScreen({ name: "start" });
    }
  };

  /** Show the screen for a route (used on load and on browser Back/Forward). */
  const showRoute = async (route: Route) => {
    if (route.name === "editor") return openProject(route.project);
    if (route.name === "wizard") return setScreen({ name: "wizard" });
    await refreshProjects();
    setScreen({ name: "start", showTemplates: !!route.templates });
  };

  useEffect(() => {
    const onPop = () => {
      // Leaving a running generation via Back cancels it (nothing is charged for a failed/cancelled request).
      abortRef.current?.abort();
      void saveNow().finally(() => void showRoute(routeFromLocation()));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    initNav();
    startAutosave();
    void (async () => {
      const ok = await storageAvailable();
      setStorageOk(ok);
      if (ok) await refreshProjects();
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get("project");
      const template = params.get("template");
      if (projectId && ok) {
        await openProject(projectId);
        try {
          const rawLogo = localStorage.getItem("atb_imported_logo");
          if (rawLogo) {
            const { src, targetSection, targetPath, projectId: logoProject } = JSON.parse(rawLogo);
            const section = findSection(targetSection);
            const asset = validateAsset({ name: "Brand Studio Logo", mime: "image/png", dataUrl: src, source: "upload" });
            if (asset && section && (!logoProject || logoProject === projectId) && fieldAtPath(section.type, targetPath)?.kind === "image" && Object.keys(getState().doc.assets).length < MAX_ASSETS) {
              setUploadedImage(targetSection, targetPath, asset, "Brand Studio Logo");
              await saveNow();
              localStorage.removeItem("atb_imported_logo");
              toast("Logo imported from Brand Studio!", "success");
            } else toast("The logo could not be imported. Check its size and the target image field.", "error");
          }
        } catch {}
        return;
      }
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
    // Same brief retried after a dropped connection → same request id, so the
    // server can hand back a site it already generated instead of paying twice.
    const key = JSON.stringify(b);
    if (!lastAttempt.current || lastAttempt.current.key !== key || !lastAttempt.current.reuse) lastAttempt.current = { key, id: newRequestId(), reuse: false };
    const result = await generateSite(b, lastAttempt.current.id, controller.signal);
    lastAttempt.current.reuse = !result.ok && (result.code === "network" || result.code === "bad_response");
    inFlight.current = false;
    abortRef.current = null;
    if (typeof result.remaining === "number") setRemaining(result.remaining);
    if (!result.ok) {
      // Cancelled, or left via browser Back: show whatever screen the URL now points at.
      if (result.code === "aborted") return void showRoute(routeFromLocation());
      return setScreen({ name: "generating", error: { code: result.code, message: result.message, retryable: result.retryable !== false } });
    }
    await openDoc(result.doc, "Your website is ready! Click any text to edit it, or select a section to change its layout.");
  };

  const exitEditor = async () => {
    await saveNow();
    const s = getState();
    if (!s.projectId && !confirmDialog("This project isn't saved in this browser. Leave anyway? Download a backup first if you want to keep it.")) return;
    // Use real history when the previous entry is a builder screen, so Back/Forward stay consistent.
    if (canGoBackInApp()) return history.back();
    replaceRoute({ name: "start" });
    await refreshProjects();
    setScreen({ name: "start" });
  };

  const goWizard = () => {
    pushRoute({ name: "wizard" });
    setScreen({ name: "wizard" });
  };
  const wizardBack = () => {
    if (canGoBackInApp()) return history.back();
    replaceRoute({ name: "start" });
    void showRoute({ name: "start" });
  };
  const goTemplates = () => {
    replaceRoute({ name: "start", templates: true });
    void showRoute({ name: "start", templates: true });
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
          onAi={goWizard}
          onLeave={leaveBuilder}
          onTemplate={(id) => {
            const doc = templateDoc(id);
            if (doc) void openDoc(doc, "Template loaded. Click any text in the preview to change it.", true);
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
      {screen.name === "wizard" && <Wizard initial={brief} remaining={remaining} onBack={wizardBack} onSubmit={(b) => void generate(b)} />}
      {screen.name === "generating" && (
        <Generating
          brief={brief}
          error={screen.error}
          onCancel={() => abortRef.current?.abort()}
          onRetry={() => void generate(brief)}
          onEdit={() => setScreen({ name: "wizard" })}
          onTemplates={goTemplates}
        />
      )}
      {screen.name === "editor" && <Editor onExit={() => void exitEditor()} remaining={remaining} setRemaining={setRemaining} storageOk={storageOk} />}
      <Toasts />
    </div>
  );
}
