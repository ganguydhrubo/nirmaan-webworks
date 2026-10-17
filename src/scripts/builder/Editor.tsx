import { useEffect, useRef, useState } from "preact/hooks";
import { exportChecklist, exportZip } from "@/lib/builder/export";
import { slugify } from "@/lib/builder/sanitize";
import { getSectionDef } from "@/lib/builder/catalog";
import { useEditor, undo, redo, setViewport, selectPage, getState, findSection, replaceDoc, replaceSection, currentPage, type Viewport } from "./store";
import { saveNow, loadLatest, overwriteWithMine, retrySave } from "./autosave";
import { backupBlob, downloadBlob } from "./persistence";
import { editWithAi, newRequestId } from "./api";
import { previewDocument } from "./preview";
import { Canvas } from "./Canvas";
import { LeftPanel } from "./LeftPanel";
import { Properties } from "./Properties";
import { Icon, Modal, toast } from "./ui";

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
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
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
        <button type="button" class="atb-btn atb-btn-primary atb-btn-sm" onClick={props.onExport}>
          <Icon name="download" size={16} /> <span class="atb-hide-xs">Download</span>
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

function ExportDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const issues = exportChecklist(doc);
  const [done, setDone] = useState(false);

  const download = () => {
    try {
      const { bytes, fileName } = exportZip(getState().doc);
      downloadBlob(new Blob([bytes], { type: "application/zip" }), fileName);
      setDone(true);
    } catch (err) {
      console.error(err);
      toast("Couldn't create the ZIP file. Please try again.", "error");
    }
  };

  return (
    <Modal title="Download your website" onClose={onClose}>
      <p>
        You'll get a <strong>.zip</strong> file with your website as plain HTML and CSS files ({doc.pages.length} page{doc.pages.length === 1 ? "" : "s"}). It's yours: it works on any web host and needs no ATITTLE account or subscription.
      </p>
      {issues.length > 0 && (
        <div class="atb-checklist">
          <p>
            <strong>Before you publish</strong>
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
      <div class="atb-modal-actions atb-stack-sm">
        <button type="button" class="atb-btn atb-btn-primary atb-btn-lg" onClick={download}>
          <Icon name="download" /> Download website (.zip)
        </button>
        <button
          type="button"
          class="atb-btn atb-btn-ghost"
          onClick={() => downloadBlob(backupBlob(getState().doc), `${slugify(getState().doc.name, "website")}.atittle-project.json`)}
          title="A file you can import later to keep editing this project, on any device."
        >
          <Icon name="save" /> Download project backup
        </button>
      </div>
      {done && (
        <p class="atb-success" role="status">
          <Icon name="check" /> Downloaded. Unzip it and open <code>index.html</code> to check it, then upload the files to your hosting.
        </p>
      )}
      <p class="atb-muted atb-small">
        Not sure how to put it online?{" "}
        <a href="/free-website-builder/hosting-guide" target="_blank" rel="noopener">
          Read the step-by-step hosting guide (GoDaddy and others)
        </a>
        . The project backup is only for re-opening this project in the builder — don't upload it to your website.
      </p>
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
