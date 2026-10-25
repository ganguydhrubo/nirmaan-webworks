import { useEffect, useRef, useState } from "preact/hooks";
import { buildSiteFiles, exportChecklist, exportZip, siteVersion } from "@/lib/builder/export";
import { slugify } from "@/lib/builder/sanitize";
import { getSectionDef } from "@/lib/builder/catalog";
import { useEditor, undo, redo, setViewport, selectPage, getState, findSection, replaceDoc, replaceSection, currentPage, type Viewport } from "./store";
import { saveNow, loadLatest, overwriteWithMine, retrySave } from "./autosave";
import { backupBlob, downloadBlob, getPublishInfo, setPublishInfo, type PublishInfo } from "./persistence";
import {
  publishBlocker,
  publishSite,
  unpublishSite,
  waitUntilLive,
  connectCustomDomain,
  searchDomainAvailability,
  startRazorpayPayment,
  type PublishPhase,
  type CustomDomainResult,
  type DomainSearchResult,
} from "./publish";
import { editWithAi, newRequestId } from "./api";
import { previewDocument } from "./preview";
import { Canvas } from "./Canvas";
import { LeftPanel } from "./LeftPanel";
import { Properties } from "./Properties";
import { Icon, Modal, toast, confirmDialog } from "./ui";

type MobilePane = "panel" | "preview" | "edit";

export function Editor(props: { onExit: () => void; remaining: number | null; setRemaining: (n: number) => void; storageOk: boolean }) {
  const [pane, setPane] = useState<MobilePane>("preview");
  const [dialog, setDialog] = useState<null | "ai" | "export" | "preview">(null);
  const saveState = useEditor((s) => s.saveState);
  const selectedId = useEditor((s) => s.selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        void saveNow().then(() => getState().saveState === "saved" && toast("Saved in this browser.", "success", undefined, 2000));
      } else if (!inField && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (!inField && k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On small screens, picking a section jumps to its properties.
  const prevSelected = useRef(selectedId);
  useEffect(() => {
    if (selectedId && selectedId !== prevSelected.current && window.matchMedia("(max-width: 959px)").matches) setPane("edit");
    prevSelected.current = selectedId;
  }, [selectedId]);

  return (
    <div class={`atb-editor atb-pane-${pane}`}>
      <Toolbar onExit={props.onExit} onAi={() => setDialog("ai")} onExport={() => setDialog("export")} onPreview={() => setDialog("preview")} />
      {(saveState === "conflict" || saveState === "error" || !props.storageOk) && <SaveBanner storageOk={props.storageOk} onExport={() => setDialog("export")} />}
      <TipBar />
      <div class="atb-mobile-tabs" role="tablist" aria-label="Editor view">
        {(
          [
            ["panel", "Sections & design"],
            ["preview", "Preview"],
            ["edit", "Edit selected"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={pane === id} onClick={() => setPane(id)}>
            {label}
          </button>
        ))}
      </div>
      <div class="atb-workspace">
        <aside class="atb-col atb-col-left" aria-label="Sections, pages and design">
          <LeftPanel onSelected={() => undefined} />
        </aside>
        <main class="atb-col atb-col-canvas" aria-label="Website preview">
          <Canvas />
        </main>
        <aside class="atb-col atb-col-right" aria-label="Selected section properties">
          <Properties onAskAi={() => setDialog("ai")} />
        </aside>
      </div>
      {dialog === "ai" && <AskAiDialog onClose={() => setDialog(null)} remaining={props.remaining} setRemaining={props.setRemaining} />}
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} storageOk={props.storageOk} />}
      {dialog === "preview" && <PreviewDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

const TIP_KEY = "atittle-builder-tips-dismissed";

function TipBar() {
  const [show, setShow] = useState(() => {
    try {
      return localStorage.getItem(TIP_KEY) !== "1";
    } catch {
      return true;
    }
  });
  if (!show) return null;
  return (
    <div class="atb-tipbar" role="note">
      <span>
        <b>Tip:</b> click any text in the preview to type over it
      </span>
      <span class="atb-hide-sm">· click a photo slot to add your image</span>
      <span class="atb-hide-sm">· drag sections on the left to reorder</span>
      <span class="atb-hide-sm">· Download when you're happy</span>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem(TIP_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        Got it
      </button>
    </div>
  );
}

function Toolbar(props: { onExit: () => void; onAi: () => void; onExport: () => void; onPreview: () => void }) {
  const name = useEditor((s) => s.doc.name);
  const pages = useEditor((s) => s.doc.pages);
  const pageId = useEditor((s) => s.pageId);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const viewport = useEditor((s) => s.viewport);

  return (
    <header class="atb-toolbar">
      <div class="atb-tb-group">
        <button type="button" class="atb-back-link" onClick={props.onExit} title="Back to your projects">
          <Icon name="back" size={16} /> <span class="atb-hide-sm">Projects</span>
        </button>
        <span class="atb-tb-name" title={name}>
          {name}
        </span>
        {pages.length > 1 && (
          <label class="atb-tb-page">
            <span class="atb-sr">Page</span>
            <select value={pageId} onChange={(e) => selectPage(e.currentTarget.value)}>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div class="atb-tb-group">
        <button type="button" class="atb-icon-btn" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
          <Icon name="undo" />
        </button>
        <button type="button" class="atb-icon-btn" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
          <Icon name="redo" />
        </button>
        <div class="atb-seg atb-seg-icons atb-hide-sm" role="radiogroup" aria-label="Preview size">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={viewport === v} aria-label={`${v[0]!.toUpperCase()}${v.slice(1)} preview`} title={`${v[0]!.toUpperCase()}${v.slice(1)} preview`} onClick={() => setViewport(v)}>
              <Icon name={v} />
            </button>
          ))}
        </div>
        <SaveStatus />
      </div>
      <div class="atb-tb-group">
        <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm atb-hide-sm" onClick={props.onPreview}>
          <Icon name="eye" size={16} /> Preview
        </button>
        <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={props.onAi}>
          <Icon name="sparkles" size={16} /> <span class="atb-hide-sm">Ask AI</span>
        </button>
        <button type="button" class="atb-btn atb-btn-primary atb-btn-sm" onClick={props.onExport} aria-label="Publish" title="Publish live or download your website">
          <Icon name="globe" size={16} /> <span class="atb-hide-xs">Publish</span>
        </button>
      </div>
    </header>
  );
}

function SaveStatus() {
  const saveState = useEditor((s) => s.saveState);
  const dirty = useEditor((s) => s.rev !== s.savedRev);
  const label =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Not saved"
        : saveState === "conflict"
          ? "Conflict"
          : saveState === "unavailable"
            ? "Not saving"
            : dirty
              ? "Unsaved changes"
              : "Saved";
  return (
    <button
      type="button"
      class={`atb-save atb-save-${saveState === "saved" && !dirty ? "ok" : saveState}`}
      onClick={() => void saveNow()}
      title="Projects are saved in this browser automatically. Click to save now (Ctrl+S)."
      aria-live="polite"
    >
      <Icon name={saveState === "error" || saveState === "conflict" ? "alert" : saveState === "saved" && !dirty ? "check" : "save"} size={15} />
      <span class="atb-hide-xs">{label}</span>
    </button>
  );
}

function SaveBanner({ storageOk, onExport }: { storageOk: boolean; onExport: () => void }) {
  const saveState = useEditor((s) => s.saveState);
  const message = useEditor((s) => s.saveMessage);
  if (!storageOk) {
    return (
      <div class="atb-banner atb-banner-warn" role="alert">
        <Icon name="alert" /> This browser isn't letting the builder save your project (private browsing can do this). Download a project backup before closing this tab.
        <button type="button" class="atb-link-btn" onClick={onExport}>
          Download backup
        </button>
      </div>
    );
  }
  if (saveState === "conflict") {
    return (
      <div class="atb-banner atb-banner-warn" role="alert">
        <Icon name="alert" /> {message} Which version do you want to keep?
        <button type="button" class="atb-link-btn" onClick={() => void loadLatest()}>
          Load the other version
        </button>
        <button type="button" class="atb-link-btn" onClick={() => void overwriteWithMine()}>
          Keep this version
        </button>
      </div>
    );
  }
  return (
    <div class="atb-banner atb-banner-error" role="alert">
      <Icon name="alert" /> {message}
      <button type="button" class="atb-link-btn" onClick={retrySave}>
        Try again
      </button>
      <button type="button" class="atb-link-btn" onClick={onExport}>
        Download backup
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ask AI
// ---------------------------------------------------------------------------

const AI_EXAMPLES_SITE = ["Change the website to a premium, elegant style", "Add a services section", "Make all the text shorter and simpler", "Change the colour scheme to green", "Add an FAQ section about pricing and timings"];
const AI_EXAMPLES_SECTION = ["Rewrite this to sound warmer and more personal", "Make this shorter", "Make the headline more specific", "Add two more items"];

function AskAiDialog({ onClose, remaining, setRemaining }: { onClose: () => void; remaining: number | null; setRemaining: (n: number) => void }) {
  const selectedId = useEditor((s) => s.selectedId);
  const selected = useEditor((s) => findSection(s.selectedId, s));
  const [scope, setScope] = useState<"section" | "site">(selected ? "section" : "site");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const attempt = useRef<{ key: string; id: string; reuse: boolean } | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async () => {
    if (busy || instruction.trim().length < 3) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    const state = getState();
    const key = `${scope}:${selectedId}:${instruction.trim()}`;
    if (!attempt.current || attempt.current.key !== key || !attempt.current.reuse) attempt.current = { key, id: newRequestId(), reuse: false };
    const result = await editWithAi(state.doc, instruction.trim(), scope === "section" ? selectedId : null, attempt.current.id, controller.signal);
    attempt.current.reuse = !result.ok && (result.code === "network" || result.code === "bad_response");
    setBusy(false);
    if (!result.ok) {
      if (typeof result.remaining === "number") setRemaining(result.remaining);
      if (result.code !== "aborted") setError(result.message);
      return;
    }
    setRemaining(result.remaining);
    // Don't apply onto a document that changed while the request was running.
    if (getState().doc !== state.doc) {
      setError("You edited the website while the AI was working, so its result wasn't applied (to avoid overwriting your changes). Please try again.");
      return;
    }
    if (result.section) replaceSection(result.section);
    else if (result.doc) replaceDoc(result.doc);
    onClose();
    toast("AI changes applied.", "success", { label: "Undo", run: undo }, 9000);
  };

  const examples = scope === "section" ? AI_EXAMPLES_SECTION : AI_EXAMPLES_SITE;
  return (
    <Modal title="Ask AI to edit" onClose={onClose}>
      <div class="atb-seg atb-full" role="radiogroup" aria-label="What should the AI change?">
        <button type="button" role="radio" aria-checked={scope === "section"} disabled={!selected} onClick={() => setScope("section")}>
          {selected ? `This section (${getSectionDef(selected.type)?.label})` : "Select a section first"}
        </button>
        <button type="button" role="radio" aria-checked={scope === "site"} onClick={() => setScope("site")}>
          Whole website
        </button>
      </div>
      <label class="atb-field">
        <span>What would you like to change?</span>
        <textarea rows={3} maxLength={500} value={instruction} onInput={(e) => setInstruction(e.currentTarget.value)} placeholder={examples[0]} disabled={busy} />
      </label>
      <div class="atb-chips">
        {examples.map((ex) => (
          <button key={ex} type="button" class="atb-chip" disabled={busy} onClick={() => setInstruction(ex)}>
            {ex}
          </button>
        ))}
      </div>
      {error && (
        <p class="atb-error" role="alert">
          <Icon name="alert" /> {error}
        </p>
      )}
      <div class="atb-modal-actions">
        <span class="atb-muted atb-small">
          Uses 1 free AI request{remaining !== null ? ` (${remaining} left today)` : ""} — failed attempts are free. Your current website stays as it is until a change succeeds, and you can undo it.
        </span>
        {busy ? (
          <button type="button" class="atb-btn atb-btn-ghost" onClick={() => abortRef.current?.abort()}>
            Cancel
          </button>
        ) : null}
        <button type="button" class="atb-btn atb-btn-primary" disabled={busy || instruction.trim().length < 3} onClick={() => void run()}>
          {busy ? (
            <>
              <span class="atb-spinner atb-spinner-sm" aria-hidden="true" /> Working…
            </>
          ) : (
            <>
              <Icon name="sparkles" /> Apply
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const PUBLISH_STEPS: { phase: PublishPhase; label: string }[] = [
  { phase: "validating", label: "Checking your website" },
  { phase: "preparing", label: "Preparing files" },
  { phase: "uploading", label: "Uploading" },
  { phase: "deploying", label: "Deploying" },
  { phase: "verifying", label: "Confirming it's live" },
];

function ExportDialog({ onClose, storageOk }: { onClose: () => void; storageOk: boolean }) {
  const doc = useEditor((s) => s.doc);
  const projectId = useEditor((s) => s.projectId);
  const issues = exportChecklist(doc);
  const blocker = publishBlocker(doc);
  const [activeTab, setActiveTab] = useState<"plans" | "domain" | "video">("plans");
  const [downloaded, setDownloaded] = useState(false);
  const [info, setInfo] = useState<PublishInfo | null>(null);
  const [phase, setPhase] = useState<PublishPhase | "idle">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ code: string; message: string; retryable: boolean } | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busy = phase !== "idle" && phase !== "published" && phase !== "failed";

  // Domain connection state
  const [domainInput, setDomainInput] = useState("");
  const [domainConnecting, setDomainConnecting] = useState(false);
  const [domainResult, setDomainResult] = useState<CustomDomainResult | null>(null);

  // Domain search state
  const [domainSearchInput, setDomainSearchInput] = useState("");
  const [domainSearching, setDomainSearching] = useState(false);
  const [domainSearchResult, setDomainSearchResult] = useState<DomainSearchResult | null>(null);

  const remember = async (next: PublishInfo | null) => {
    setInfo(next);
    if (projectId && storageOk) await setPublishInfo(projectId, next).catch(() => toast("Couldn't save the publish details in this browser.", "error"));
  };

  useEffect(() => {
    let alive = true;
    void siteVersion(buildSiteFiles(getState().doc)).then((v) => alive && setCurrentVersion(v));
    if (projectId && storageOk) {
      void getPublishInfo(projectId).then((saved) => {
        if (!alive || !saved) return;
        setInfo(saved);
        setPhase(saved.status === "published" ? "published" : "idle");
        if (saved.status === "verifying") void verifyAgain(saved);
      });
    }
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, []);

  const download = () => {
    try {
      const { bytes, fileName } = exportZip(getState().doc);
      downloadBlob(new Blob([bytes], { type: "application/zip" }), fileName);
      setDownloaded(true);
      toast("Website downloaded successfully!", "success");
    } catch (err) {
      console.error(err);
      toast("Couldn't create the ZIP file. Please try again.", "error");
    }
  };

  const publish = async () => {
    await saveNow();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    try {
      const result = await publishSite(
        getState().doc,
        info,
        (p) => {
          setPhase(p.phase);
          if (p.progress !== undefined) setProgress(p.progress);
        },
        controller.signal,
      );
      if (result.info) await remember(result.info);
      if (result.ok) {
        setPhase("published");
        setCurrentVersion(result.info.version);
        toast("Your website is live!", "success");
      } else {
        setError({ code: result.code, message: result.message, retryable: result.retryable });
        setPhase("failed");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError({ code: "unknown", message: "Something went wrong while publishing. Please try again.", retryable: true });
        setPhase("failed");
      }
    }
  };

  const verifyAgain = async (target: PublishInfo) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setPhase("verifying");
    try {
      const live = await waitUntilLive(target.slug, target.version, controller.signal, 45_000);
      if (live) {
        await remember({ ...target, status: "published" });
        setPhase("published");
      } else {
        setError({ code: "verify_timeout", message: "Your website isn't showing at its address yet. Please wait a minute and check again.", retryable: true });
        setPhase("failed");
      }
    } catch {
      /* dialog closed */
    }
  };

  const copyLink = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy. Select the link and copy it yourself.", "error");
    }
  };

  const takeOffline = async () => {
    if (!info || !confirmDialog("Take this website offline? Its link will stop working. You can publish again later.")) return;
    const r = await unpublishSite(info);
    if (r.ok) {
      await remember(null);
      setPhase("idle");
      toast("Your website is offline.", "success");
    } else toast(r.message ?? "Couldn't take the website offline. Please try again.", "error");
  };

  // Razorpay payment trigger with fallback
  const handlePayPlan = (plan: "download" | "host" | "domain", targetDomain?: string) => {
    void startRazorpayPayment({
      plan,
      siteName: doc.name || "My Website",
      domain: targetDomain,
      onSuccess: (paymentId) => {
        toast(`Payment successful (${paymentId}). Processing order!`, "success");
        if (plan === "download") {
          download();
          setActiveTab("video");
        } else if (plan === "host") {
          void publish();
        } else if (plan === "domain") {
          if (targetDomain) {
            void connectCustomDomain(targetDomain, info?.slug || slugify(doc.name, "site")).then((res) => {
              setDomainResult(res);
              setActiveTab("domain");
              toast("Domain registration initiated! Checking DNS & SSL.", "success");
            });
          }
          void publish();
        }
      },
    });
  };

  const handleDomainSearch = async (e: Event) => {
    e.preventDefault();
    if (!domainSearchInput.trim()) return;
    setDomainSearching(true);
    const res = await searchDomainAvailability(domainSearchInput.trim());
    setDomainSearchResult(res);
    setDomainSearching(false);
  };

  const handleDomainConnect = async (e: Event) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    setDomainConnecting(true);
    const slug = info?.slug || slugify(doc.name, "site");
    const res = await connectCustomDomain(domainInput.trim(), slug);
    setDomainResult(res);
    setDomainConnecting(false);
  };

  const stepIndex = PUBLISH_STEPS.findIndex((s) => s.phase === (phase === "retrying" ? "uploading" : phase));
  const live = phase === "published" && info?.status === "published";
  const outdated = live && currentVersion !== null && currentVersion !== info!.version;

  return (
    <Modal title="Publish, Custom Domain & Export" onClose={onClose} wide>
      {/* Top Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1.5px solid var(--atb-line)", paddingBottom: "12px", marginBottom: "20px" }} role="tablist">
        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: activeTab === "plans" ? 700 : 500,
            background: activeTab === "plans" ? "#1c1917" : "transparent",
            color: activeTab === "plans" ? "#d4af37" : "#555",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.92rem",
          }}
        >
          <span>🚀 Launch & Hosting Plans</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("domain")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: activeTab === "domain" ? 700 : 500,
            background: activeTab === "domain" ? "#1c1917" : "transparent",
            color: activeTab === "domain" ? "#d4af37" : "#555",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.92rem",
          }}
        >
          <span>🌐 Connect Custom Domain</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("video")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: activeTab === "video" ? 700 : 500,
            background: activeTab === "video" ? "#1c1917" : "transparent",
            color: activeTab === "video" ? "#d4af37" : "#555",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.92rem",
          }}
        >
          <span>🎥 Video Guide & Steps</span>
        </button>
      </div>

      {/* Tab 1: Pricing & Launch Plans */}
      {activeTab === "plans" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px", color: "#1c1917" }}>Choose how you would like to take your website live</h3>
            <p class="atb-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Razorpay secure checkout · Instant setup · Zero coding required</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            {/* Card 1: Direct Fast Hosting (₹750) */}
            <div style={{ border: "2px solid #c85a32", borderRadius: "14px", padding: "18px", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
              <span style={{ position: "absolute", top: "-10px", right: "14px", background: "#c85a32", color: "#fff", fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", textTransform: "uppercase" }}>
                Most Popular
              </span>
              <div>
                <strong style={{ fontSize: "1.05rem", color: "#1c1917", display: "block" }}>Direct Fast Hosting</strong>
                <p class="atb-muted atb-small" style={{ margin: "4px 0 12px" }}>Hosted directly on ATITTLE ultra-fast Cloudflare Edge with 99.99% uptime.</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1c1917" }}>₹750</span>
                  <span class="atb-muted" style={{ fontSize: "0.8rem" }}>/ year</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", fontSize: "0.82rem", display: "grid", gap: "6px", color: "#444" }}>
                  <li>✓ Free SSL Security Certificate (HTTPS)</li>
                  <li>✓ Sub-50ms Global Edge Speed</li>
                  <li>✓ Unlimited updates & mobile optimization</li>
                  <li>✓ Zero DevOps or cPanel headaches</li>
                </ul>
              </div>
              <button
                type="button"
                class="atb-btn atb-btn-primary"
                onClick={() => handlePayPlan("host")}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Pay ₹750 & Host Direct
              </button>
            </div>

            {/* Card 2: Custom Domain + Live Hosting (₹1,000) */}
            <div style={{ border: "1.5px solid #d4af37", borderRadius: "14px", padding: "18px", background: "#fdfaf3", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
              <span style={{ position: "absolute", top: "-10px", right: "14px", background: "#1c1917", color: "#d4af37", fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", textTransform: "uppercase" }}>
                Domain Included
              </span>
              <div>
                <strong style={{ fontSize: "1.05rem", color: "#1c1917", display: "block" }}>Custom Domain + Hosting</strong>
                <p class="atb-muted atb-small" style={{ margin: "4px 0 12px" }}>Flat ₹499 website build + brand new custom domain (.in / .com) registered for you.</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1c1917" }}>₹1,000</span>
                  <span class="atb-muted" style={{ fontSize: "0.8rem" }}>all-inclusive</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", fontSize: "0.82rem", display: "grid", gap: "6px", color: "#444" }}>
                  <li>✓ Custom domain registration (.in / .com)</li>
                  <li>✓ 1-Click DNS automatic configuration</li>
                  <li>✓ 1 Full year fast Cloudflare Edge hosting</li>
                  <li>✓ Professional brand email forward setup</li>
                </ul>
              </div>
              <button
                type="button"
                class="atb-btn"
                style={{ width: "100%", justifyContent: "center", background: "#1c1917", color: "#d4af37", fontWeight: 700 }}
                onClick={() => {
                  setActiveTab("domain");
                  toast("Search or enter your custom domain to proceed with the ₹1,000 plan.", "info");
                }}
              >
                Search Domain (₹1,000 Plan)
              </button>
            </div>

            {/* Card 3: Download Website Source Code (Flat ₹499) */}
            <div style={{ border: "1.5px solid var(--atb-line)", borderRadius: "14px", padding: "18px", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <strong style={{ fontSize: "1.05rem", color: "#1c1917", display: "block" }}>Download Source Code</strong>
                <p class="atb-muted atb-small" style={{ margin: "4px 0 12px" }}>Full ZIP package containing clean, production-ready HTML, CSS and images.</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1c1917" }}>₹499</span>
                  <span class="atb-muted" style={{ fontSize: "0.8rem" }}>one-time flat</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", fontSize: "0.82rem", display: "grid", gap: "6px", color: "#444" }}>
                  <li>✓ Complete HTML5 / CSS3 / Vanilla JS source</li>
                  <li>✓ No ongoing subscription or vendor lock-in</li>
                  <li>✓ Host on GoDaddy, Hostinger, Vercel or cPanel</li>
                  <li>✓ Step-by-step video guide included</li>
                </ul>
              </div>
              <button
                type="button"
                class="atb-btn atb-btn-soft"
                onClick={() => handlePayPlan("download")}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Icon name="download" /> Pay ₹499 & Download
              </button>
            </div>
          </div>

          {/* Free Staging Test & Live Status */}
          <div style={{ background: "#fcfbf9", border: "1px dashed var(--atb-line)", borderRadius: "12px", padding: "14px 18px", marginTop: "14px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <div>
                <strong style={{ fontSize: "0.92rem", display: "block" }}>Need to test before paying?</strong>
                <span class="atb-muted" style={{ fontSize: "0.82rem" }}>Generate a free temporary staging link to preview on your phone or share with your team.</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {live && info ? (
                  <a href={info.url} target="_blank" rel="noopener" class="atb-btn atb-btn-soft atb-btn-sm">
                    <Icon name="external" size={14} /> View Live ({info.url.replace(/^https?:\/\//, "").slice(0, 20)}…)
                  </a>
                ) : (
                  <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm" onClick={publish} disabled={!!blocker || busy}>
                    {busy ? "Deploying test…" : "Generate Free Test Link"}
                  </button>
                )}
                <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm" onClick={download}>
                  Download Free Test ZIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Custom Domain & Domain Connect */}
      {activeTab === "domain" && (
        <div>
          {/* Section A: Search & Buy New Domain (₹1,000 All-Inclusive) */}
          <div style={{ background: "#fcfbf9", border: "1px solid var(--atb-line)", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#1c1917", color: "#d4af37", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>OPTION A</span>
              <strong style={{ fontSize: "1.05rem", color: "#1c1917" }}>Search & Purchase a Brand-New Domain (₹1,000 Plan)</strong>
            </div>
            <p class="atb-muted atb-small" style={{ marginBottom: "14px" }}>
              Includes ₹499 website build + 1-year domain registration (.in / .com / .store) + free edge hosting & SSL certificate.
            </p>

            <form onSubmit={handleDomainSearch} style={{ display: "flex", gap: "8px", maxWidth: "560px" }}>
              <input
                type="text"
                placeholder="e.g. delhibakes or sharmaconsulting"
                value={domainSearchInput}
                onInput={(e) => setDomainSearchInput((e.target as HTMLInputElement).value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1.5px solid var(--atb-line)", fontSize: "0.92rem" }}
              />
              <button type="submit" class="atb-btn atb-btn-primary" disabled={domainSearching}>
                {domainSearching ? "Searching…" : "Check Availability"}
              </button>
            </form>

            {domainSearchResult && domainSearchResult.ok && (
              <div style={{ marginTop: "14px", borderTop: "1px solid var(--atb-line)", paddingTop: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "12px 14px", borderRadius: "8px", border: "1px solid #c85a32" }}>
                  <div>
                    <strong style={{ fontSize: "1.05rem", color: "#1c1917" }}>{domainSearchResult.primary.domain}</strong>
                    <span style={{ display: "block", fontSize: "0.8rem", color: "#16a34a", fontWeight: 600 }}>✓ Available to register</span>
                  </div>
                  <button
                    type="button"
                    class="atb-btn atb-btn-primary atb-btn-sm"
                    onClick={() => handlePayPlan("domain", domainSearchResult.primary.domain)}
                  >
                    Register & Connect (₹1,000)
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginTop: "10px" }}>
                  {domainSearchResult.alternatives.map((alt) => (
                    <div key={alt.domain} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--atb-line)", fontSize: "0.85rem" }}>
                      <span><strong>{alt.domain}</strong></span>
                      <button
                        type="button"
                        class="atb-btn atb-btn-ghost atb-btn-sm"
                        style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                        onClick={() => handlePayPlan("domain", alt.domain)}
                      >
                        Choose
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section B: Connect Existing Domain via Domain Connect / CNAME */}
          <div style={{ background: "#fff", border: "1.5px solid var(--atb-line)", borderRadius: "12px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#2563eb", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>OPTION B</span>
              <strong style={{ fontSize: "1.05rem", color: "#1c1917" }}>Connect Domain You Already Own (GoDaddy, Namecheap, Hostinger, etc.)</strong>
            </div>
            <p class="atb-muted atb-small" style={{ marginBottom: "14px" }}>
              Support 1-click Domain Connect protocol (GoDaddy, IONOS, Namecheap) or manual CNAME fallback for any registrar worldwide.
            </p>

            <form onSubmit={handleDomainConnect} style={{ display: "flex", gap: "8px", maxWidth: "560px" }}>
              <input
                type="text"
                placeholder="e.g. mybakery.in or yourcompany.com"
                value={domainInput}
                onInput={(e) => setDomainInput((e.target as HTMLInputElement).value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1.5px solid var(--atb-line)", fontSize: "0.92rem" }}
              />
              <button type="submit" class="atb-btn atb-btn-primary" disabled={domainConnecting}>
                {domainConnecting ? "Detecting DNS…" : "Connect Domain"}
              </button>
            </form>

            {domainResult && domainResult.ok && (
              <div style={{ marginTop: "16px", background: "#fbf6ee", border: "1px solid #e2dacb", borderRadius: "10px", padding: "16px" }}>
                {domainResult.domainConnectUrl ? (
                  <div style={{ marginBottom: "14px", padding: "12px", background: "#e0f2fe", border: "1px solid #7dd3fc", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <div>
                        <strong style={{ color: "#0369a1", fontSize: "0.95rem", display: "block" }}>⚡ 1-Click Domain Connect Detected!</strong>
                        <span style={{ fontSize: "0.82rem", color: "#075985" }}>Your provider supports automated DNS setup without copy-pasting records.</span>
                      </div>
                      <a
                        href={domainResult.domainConnectUrl}
                        target="_blank"
                        rel="noopener"
                        class="atb-btn atb-btn-primary atb-btn-sm"
                        style={{ background: "#0284c7", whiteSpace: "nowrap" }}
                      >
                        Authorize via Provider ↗
                      </a>
                    </div>
                  </div>
                ) : null}

                <strong style={{ fontSize: "0.9rem", color: "#1c1917", display: "block", marginBottom: "8px" }}>DNS Record Configuration:</strong>
                <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse", background: "#fff", borderRadius: "6px", overflow: "hidden" }}>
                  <thead>
                    <tr style={{ background: "#f3ede3", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px" }}>Type</th>
                      <th style={{ padding: "8px 10px" }}>Host / Name</th>
                      <th style={{ padding: "8px 10px" }}>Target / Value</th>
                      <th style={{ padding: "8px 10px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainResult.dnsRecords?.map((rec, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>{rec.type}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{rec.name}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{rec.value}</td>
                        <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600 }}>Active Route</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", fontSize: "0.82rem" }}>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>
                    <Icon name="check" size={14} /> Cloudflare for SaaS Edge Provisioned · SSL: Active (Let's Encrypt DV)
                  </span>
                  <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm" onClick={handleDomainConnect}>
                    <Icon name="refresh" size={14} /> Refresh Status
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Step-by-Step Video Guide */}
      {activeTab === "video" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px", color: "#1c1917" }}>Step-by-Step Guide: What to do after downloading</h3>
            <p class="atb-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Follow these 4 simple steps to have your downloaded site live on any hosting.</p>
          </div>

          {/* Interactive Video Demonstration Container */}
          <div style={{ background: "#1c1917", borderRadius: "14px", overflow: "hidden", color: "#fff", marginBottom: "20px", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.25)" }}>
            <div style={{ aspectRatio: "16 / 9", background: "linear-gradient(135deg, #1c1917 0%, #2a2420 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#c85a32", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(200,90,50,0.4)" }}>
                <span style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "16px solid #fff", marginLeft: "4px" }} />
              </div>
              <strong style={{ fontSize: "1.1rem", marginTop: "14px", letterSpacing: "0.02em" }}>VIDEO DEMONSTRATION (3 MINUTES)</strong>
              <span style={{ fontSize: "0.85rem", color: "#d4af37", marginTop: "4px" }}>"How to Upload Your ATITTLE Website to GoDaddy cPanel & Connect Your Domain"</span>
              <div style={{ position: "absolute", bottom: "12px", right: "16px", fontSize: "0.75rem", background: "rgba(0,0,0,0.6)", padding: "3px 8px", borderRadius: "4px" }}>
                1080p HD · Step-by-Step
              </div>
            </div>
          </div>

          {/* 4 Illustrated Action Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
            <div style={{ border: "1px solid var(--atb-line)", borderRadius: "10px", padding: "14px", background: "#fff" }}>
              <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", background: "#1c1917", color: "#fff", textAlign: "center", lineHeight: "24px", fontSize: "0.8rem", fontWeight: 700, marginBottom: "8px" }}>1</span>
              <strong style={{ fontSize: "0.92rem", display: "block", color: "#1c1917" }}>Unzip the Download</strong>
              <p class="atb-muted" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>Right-click your downloaded ZIP file and click "Extract All". You'll get your HTML, CSS and images.</p>
            </div>

            <div style={{ border: "1px solid var(--atb-line)", borderRadius: "10px", padding: "14px", background: "#fff" }}>
              <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", background: "#1c1917", color: "#fff", textAlign: "center", lineHeight: "24px", fontSize: "0.8rem", fontWeight: 700, marginBottom: "8px" }}>2</span>
              <strong style={{ fontSize: "0.92rem", display: "block", color: "#1c1917" }}>Preview in Browser</strong>
              <p class="atb-muted" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>Double-click <code>index.html</code> to test your entire website locally on your computer with zero internet required.</p>
            </div>

            <div style={{ border: "1px solid var(--atb-line)", borderRadius: "10px", padding: "14px", background: "#fff" }}>
              <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", background: "#1c1917", color: "#fff", textAlign: "center", lineHeight: "24px", fontSize: "0.8rem", fontWeight: 700, marginBottom: "8px" }}>3</span>
              <strong style={{ fontSize: "0.92rem", display: "block", color: "#1c1917" }}>Upload to Host</strong>
              <p class="atb-muted" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>Upload the unzipped files to your GoDaddy cPanel (public_html), Hostinger, or drag & drop into Cloudflare Pages / Netlify.</p>
            </div>

            <div style={{ border: "1px solid var(--atb-line)", borderRadius: "10px", padding: "14px", background: "#fff" }}>
              <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", background: "#1c1917", color: "#fff", textAlign: "center", lineHeight: "24px", fontSize: "0.8rem", fontWeight: 700, marginBottom: "8px" }}>4</span>
              <strong style={{ fontSize: "0.92rem", display: "block", color: "#1c1917" }}>100% Live Worldwide</strong>
              <p class="atb-muted" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>Your domain immediately serves your website with zero monthly subscriptions. You own the code forever.</p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <a
              href="/free-website-builder/hosting-guide"
              target="_blank"
              rel="noopener"
              class="atb-btn atb-btn-soft"
              style={{ display: "inline-flex" }}
            >
              Read Full Hosting & GoDaddy Documentation ↗
            </a>
          </div>
        </div>
      )}

      {/* Checklist notices */}
      {issues.length > 0 && (
        <div class="atb-checklist" style={{ marginTop: "18px" }}>
          <p>
            <strong>Before you go live:</strong>
          </p>
          <ul>
            {issues.map((i) => (
              <li key={i.message} class={i.level === "warning" ? "atb-warn" : ""}>
                <Icon name={i.level === "warning" ? "alert" : "check"} size={16} /> {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div class="atb-modal-actions atb-stack-sm" style={{ marginTop: "18px", borderTop: "1px solid var(--atb-line)", paddingTop: "14px" }}>
        <button
          type="button"
          class="atb-btn atb-btn-ghost atb-btn-sm"
          onClick={() => downloadBlob(backupBlob(getState().doc), `${slugify(getState().doc.name, "website")}.atittle-project.json`)}
          title="Download project backup file to resume editing on any computer."
        >
          <Icon name="save" size={14} /> Backup Project (.json)
        </button>
      </div>
    </Modal>
  );
}

function PreviewDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const startPage = useEditor((s) => currentPage(s));
  const [pageId, setPageId] = useState(startPage.id);
  const [viewport, setVp] = useState<Viewport>("desktop");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const page = doc.pages.find((p) => p.id === pageId) ?? doc.pages[0]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const m = e.data as { __atb?: number; type?: string; slug?: string };
      if (m?.__atb === 1 && m.type === "navigate") {
        const target = doc.pages.find((p) => p.slug === m.slug);
        if (target) setPageId(target.id);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [doc]);

  return (
    <div class="atb-preview-full" role="dialog" aria-modal="true" aria-label="Website preview">
      <div class="atb-preview-bar">
        <strong>Preview</strong>
        <select value={pageId} onChange={(e) => setPageId(e.currentTarget.value)} aria-label="Page">
          {doc.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <div class="atb-seg atb-seg-icons" role="radiogroup" aria-label="Preview size">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={viewport === v} aria-label={`${v} preview`} onClick={() => setVp(v)}>
              <Icon name={v} />
            </button>
          ))}
        </div>
        <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm" onClick={onClose} autoFocus>
          <Icon name="close" size={16} /> Close preview
        </button>
      </div>
      <div class="atb-preview-stage">
        <iframe
          ref={frameRef}
          title={`Preview of ${page.title}`}
          sandbox="allow-scripts"
          srcdoc={previewDocument(doc, page, false)}
          style={{ width: viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "390px" }}
        />
      </div>
    </div>
  );
}
