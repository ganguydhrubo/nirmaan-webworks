import { useEffect, useRef, useState } from "preact/hooks";
import { buildSiteFiles, exportChecklist, exportZip, siteVersion } from "@/lib/builder/export";
import { slugify } from "@/lib/builder/sanitize";
import { getSectionDef } from "@/lib/builder/catalog";
import { useEditor, undo, redo, setViewport, selectPage, getState, findSection, replaceDoc, replaceSection, currentPage, type Viewport } from "./store";
import { saveNow, loadLatest, overwriteWithMine, retrySave } from "./autosave";
import { backupBlob, downloadBlob, getPublishInfo, setPublishInfo, type PublishInfo } from "./persistence";
import { publishBlocker, publishSite, unpublishSite, waitUntilLive, type PublishPhase } from "./publish";
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
  const [downloaded, setDownloaded] = useState(false);
  const [info, setInfo] = useState<PublishInfo | null>(null);
  const [phase, setPhase] = useState<PublishPhase | "idle">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ code: string; message: string; retryable: boolean } | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busy = phase !== "idle" && phase !== "published" && phase !== "failed";

  const remember = async (next: PublishInfo | null) => {
    setInfo(next);
    if (projectId && storageOk) await setPublishInfo(projectId, next).catch(() => toast("Couldn't save the publish details in this browser.", "error"));
  };

  // Load where this project is published; resume a check that was interrupted.
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
    if (!info || !confirmDialog("Take this website offline? Its link will stop working. You can publish again later (it will get a new address).")) return;
    const r = await unpublishSite(info);
    if (r.ok) {
      await remember(null);
      setPhase("idle");
      toast("Your website is offline.", "success");
    } else toast(r.message ?? "Couldn't take the website offline. Please try again.", "error");
  };

  const stepIndex = PUBLISH_STEPS.findIndex((s) => s.phase === (phase === "retrying" ? "uploading" : phase));
  const live = phase === "published" && info?.status === "published";
  const outdated = live && currentVersion !== null && currentVersion !== info!.version;

  return (
    <Modal title="Download or publish your website" onClose={onClose} wide>
      <div class="atb-ship-grid">
        <section class="atb-ship-card" aria-labelledby="atb-ship-dl">
          <h3 id="atb-ship-dl">
            <Icon name="download" /> Download Website
          </h3>
          <p class="atb-muted atb-small">
            Get a ZIP file with your website as plain HTML and CSS ({doc.pages.length} page{doc.pages.length === 1 ? "" : "s"}). Upload it to any hosting — it's yours, no ATITTLE account needed.
          </p>
          <button type="button" class="atb-btn atb-btn-soft" onClick={download} data-action="download-website">
            <Icon name="download" /> Download Website
          </button>
          {downloaded && (
            <p class="atb-success atb-small" role="status">
              <Icon name="check" size={16} /> Downloaded. Unzip it and open <code>index.html</code> to check it.
            </p>
          )}
        </section>

        <section class="atb-ship-card atb-ship-live" aria-labelledby="atb-ship-pub">
          <h3 id="atb-ship-pub">
            <Icon name="globe" /> Publish Live Free
          </h3>
          <p class="atb-muted atb-small">Put your website online instantly with a free ATITTLE link you can share. No hosting or setup needed.</p>

          {live && info ? (
            <div class="atb-live" role="status" aria-live="polite">
              <p class="atb-live-badge">
                <Icon name="check" size={16} /> Published — your website is live
              </p>
              <a class="atb-live-url" href={info.url} target="_blank" rel="noopener" data-live-url>
                {info.url.replace(/^https:\/\//, "")}
              </a>
              {outdated && <p class="atb-warn atb-small">You've changed your website since it was published. Publish again to update the live site.</p>}
              <div class="atb-live-actions">
                <a class="atb-btn atb-btn-primary atb-btn-sm" href={info.url} target="_blank" rel="noopener">
                  <Icon name="external" size={16} /> Open Website
                </a>
                <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={copyLink}>
                  <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Copied" : "Copy Link"}
                </button>
                <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={download}>
                  <Icon name="download" size={16} /> Download Website
                </button>
                <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={publish}>
                  <Icon name="refresh" size={16} /> Publish Again
                </button>
              </div>
              <p class="atb-muted atb-small">
                Published {new Date(info.publishedAt).toLocaleString()}.{" "}
                <button type="button" class="atb-link-btn" onClick={takeOffline}>
                  Take offline
                </button>
              </p>
            </div>
          ) : busy ? (
            <div class="atb-publish-progress" role="status" aria-live="polite">
              <ol class="atb-steps">
                {PUBLISH_STEPS.map((s, i) => (
                  <li key={s.phase} class={i < stepIndex ? "is-done" : i === stepIndex ? "is-active" : ""}>
                    <span class="atb-step-dot" aria-hidden="true">
                      {i < stepIndex ? <Icon name="check" size={12} /> : null}
                    </span>
                    {s.label}
                    {s.phase === "uploading" && i === stepIndex && progress > 0 ? ` ${Math.round(progress * 100)}%` : ""}
                  </li>
                ))}
              </ol>
              {phase === "retrying" && <p class="atb-muted atb-small">That didn't work — retrying once…</p>}
            </div>
          ) : (
            <>
              <button type="button" class="atb-btn atb-btn-primary" onClick={publish} disabled={!!blocker} data-action="publish-live">
                <Icon name="globe" /> {info ? "Publish Again" : "Publish Live Free"}
              </button>
              {blocker && <p class="atb-muted atb-small">Not ready: {blocker}</p>}
              {!storageOk && <p class="atb-muted atb-small">This browser can't save projects, so you won't be able to update this link later — download a project backup too.</p>}
              {phase === "failed" && error && (
                <div class="atb-error-box" role="alert">
                  <p>
                    <Icon name="alert" size={16} /> <strong>Publishing failed.</strong> {error.message}
                  </p>
                  <div class="atb-live-actions">
                    {error.code === "verify_timeout" && info ? (
                      <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={() => verifyAgain(info)}>
                        <Icon name="refresh" size={16} /> Check again
                      </button>
                    ) : (
                      error.retryable && (
                        <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={publish}>
                          <Icon name="refresh" size={16} /> Try again
                        </button>
                      )
                    )}
                    <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={download}>
                      <Icon name="download" size={16} /> Download instead
                    </button>
                  </div>
                </div>
              )}
              <p class="atb-muted atb-small">Your free link ends in your business name and a short code. Free links aren't listed on Google — to get found in search, put the downloaded files on your own domain.</p>
            </>
          )}
        </section>
      </div>

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
        <button
          type="button"
          class="atb-btn atb-btn-ghost"
          onClick={() => downloadBlob(backupBlob(getState().doc), `${slugify(getState().doc.name, "website")}.atittle-project.json`)}
          title="A file you can import later to keep editing this project, on any device."
        >
          <Icon name="save" /> Download project backup
        </button>
      </div>
      <p class="atb-muted atb-small">
        Want to use your own domain?{" "}
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
