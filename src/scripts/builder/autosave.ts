/**
 * Debounced autosave of the editor document to browser storage, with
 * explicit saving / saved / failed / conflict states.
 */
import { getState, setState, subscribe, initEditor } from "./store";
import { ConflictError, describeStorageError, getProject, saveProject } from "./persistence";

const DEBOUNCE_MS = 1200;
let timer: number | undefined;
let inFlight: Promise<void> | null = null;
let started = false;

export function startAutosave(): void {
  if (started) return;
  started = true;
  subscribe(() => {
    const s = getState();
    if (!s.projectId || s.rev === s.savedRev || s.saveState === "conflict" || s.saveState === "unavailable") return;
    if (s.saveState !== "saving") {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void saveNow(), DEBOUNCE_MS);
    }
  });
  window.addEventListener("beforeunload", (e) => {
    const s = getState();
    if (s.projectId && s.rev !== s.savedRev && s.saveState !== "unavailable") {
      void saveNow();
      e.preventDefault();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void saveNow();
  });
}

export async function saveNow(): Promise<void> {
  window.clearTimeout(timer);
  if (inFlight) await inFlight;
  const s = getState();
  if (!s.projectId || s.rev === s.savedRev || s.saveState === "conflict" || s.saveState === "unavailable") return;
  const { projectId, doc, rev, savedRev } = s;
  setState({ saveState: "saving", saveMessage: "" });
  inFlight = saveProject(projectId, doc, savedRev, rev)
    .then(() => {
      const now = getState();
      // Only mark saved if no newer save superseded this one.
      if (now.projectId === projectId) {
        setState({ savedRev: rev, saveState: now.rev === rev ? "saved" : "idle", saveMessage: "" });
        if (now.rev !== rev) timer = window.setTimeout(() => void saveNow(), DEBOUNCE_MS);
      }
    })
    .catch((err) => {
      if (err instanceof ConflictError) setState({ saveState: "conflict", saveMessage: err.message });
      else setState({ saveState: "error", saveMessage: describeStorageError(err) });
    })
    .finally(() => {
      inFlight = null;
    });
  await inFlight;
}

/** Conflict resolution: discard local changes and load the other tab's version. */
export async function loadLatest(): Promise<void> {
  const s = getState();
  if (!s.projectId) return;
  const rec = await getProject(s.projectId);
  if (rec) initEditor(rec.doc, rec.id, rec.rev);
}

/** Conflict resolution: keep this tab's version and overwrite the stored one. */
export async function overwriteWithMine(): Promise<void> {
  const s = getState();
  if (!s.projectId) return;
  const rec = await getProject(s.projectId);
  setState({ savedRev: rec?.rev ?? s.savedRev, rev: Math.max(s.rev, (rec?.rev ?? 0) + 1), saveState: "idle" });
  await saveNow();
}

export function retrySave(): void {
  setState({ saveState: "idle" });
  void saveNow();
}
