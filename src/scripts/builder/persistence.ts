/**
 * Guest-mode project storage: projects are saved in this browser's
 * IndexedDB (not localStorage — uploaded images quickly exceed its ~5 MB
 * limit). There are no ATITTLE accounts yet, so nothing is stored on our
 * servers; the UI says so plainly and offers a downloadable backup file for
 * moving or safeguarding a project. See docs/AI-WEBSITE-BUILDER.md for the
 * planned server-side, account-backed storage.
 *
 * Concurrency: every record carries a revision. A save states the revision
 * it was based on; if another tab has saved a newer revision in between, the
 * save is refused as a conflict instead of silently overwriting it.
 */
import { normalizeDoc, type SiteDoc } from "@/lib/builder/schema";

export interface ProjectRecord {
  id: string;
  name: string;
  doc: SiteDoc;
  rev: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  pageCount: number;
}

export class ConflictError extends Error {
  constructor(public latest: ProjectRecord) {
    super("This project was changed in another tab or window.");
    this.name = "ConflictError";
  }
}

const DB_NAME = "atittle-builder";
const STORE = "projects";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open storage"));
    req.onblocked = () => reject(new Error("Storage is blocked by another tab"));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        let result: T | undefined;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error ?? new Error("Storage error"));
        t.onabort = () => reject(t.error ?? new Error("Storage write was aborted"));
      }),
  );
}

export async function storageAvailable(): Promise<boolean> {
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const all = (await tx<ProjectRecord[]>("readonly", (s) => s.getAll() as IDBRequest<ProjectRecord[]>)) ?? [];
  return all
    .map((r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt, pageCount: r.doc?.pages?.length ?? 0 }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const rec = await tx<ProjectRecord>("readonly", (s) => s.get(id) as IDBRequest<ProjectRecord>);
  if (!rec) return null;
  // Stored data is re-validated on load like any other untrusted input.
  return { ...rec, doc: normalizeDoc(rec.doc).doc };
}

export async function createProject(doc: SiteDoc): Promise<ProjectRecord> {
  const now = Date.now();
  const rec: ProjectRecord = { id: `p-${crypto.randomUUID()}`, name: doc.name, doc, rev: 1, createdAt: now, updatedAt: now };
  await tx("readwrite", (s) => s.add(rec));
  return rec;
}

/**
 * Save `doc` as revision `newRev`, provided the stored record is still at
 * `baseRev` (the revision this editor last loaded or saved).
 */
export async function saveProject(id: string, doc: SiteDoc, baseRev: number, newRev: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    let conflict: ProjectRecord | null = null;
    const getReq = store.get(id) as IDBRequest<ProjectRecord | undefined>;
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing && existing.rev !== baseRev) {
        conflict = existing;
        return;
      }
      const now = Date.now();
      store.put({ id, name: doc.name, doc, rev: newRev, createdAt: existing?.createdAt ?? now, updatedAt: now } satisfies ProjectRecord);
    };
    t.oncomplete = () => (conflict ? reject(new ConflictError(conflict)) : resolve());
    t.onerror = () => reject(t.error ?? new Error("Storage error"));
    t.onabort = () => reject(t.error ?? new Error("Storage write was aborted"));
  });
}

export async function deleteProject(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export function describeStorageError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";
  if (name === "QuotaExceededError") return "Your browser's storage is full. Remove large images or old projects, and download a backup of this project.";
  return "Couldn't save in this browser. Download a backup so you don't lose your work.";
}

// ---------------------------------------------------------------------------
// Backup files
// ---------------------------------------------------------------------------

const BACKUP_FORMAT = "atittle-site-backup";

export function backupBlob(doc: SiteDoc): Blob {
  return new Blob([JSON.stringify({ format: BACKUP_FORMAT, version: 1, savedAt: new Date().toISOString(), doc })], { type: "application/json" });
}

export const MAX_BACKUP_BYTES = 40_000_000;

export async function readBackup(file: File): Promise<{ doc: SiteDoc; warnings: string[] }> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("That file is too large to be a project backup.");
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a valid project backup.");
  }
  const obj = data as { format?: unknown; doc?: unknown };
  if (!obj || obj.format !== BACKUP_FORMAT || !obj.doc) throw new Error("That file isn't an ATITTLE website project backup.");
  return normalizeDoc(obj.doc);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
