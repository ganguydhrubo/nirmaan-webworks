/**
 * Editor state: the document being edited, undo/redo history, selection
 * and UI state, with a tiny subscribe/select API for Preact components.
 *
 * Updates are immutable and structural (only the changed page/section/prop
 * path is copied) so history snapshots stay cheap even when the document
 * carries uploaded images. Consecutive edits to the same field within a
 * short window collapse into one undo step, so undo reverts a typed
 * sentence rather than one keystroke.
 */
import { useEffect, useState } from "preact/hooks";
import { createSection, defaultStyleFor, type Page, type Section, type SiteDoc, MAX_PAGES, MAX_SECTIONS_PER_PAGE } from "@/lib/builder/schema";
import { getSectionDef, type SectionType } from "@/lib/builder/catalog";
import { newId, slugify } from "@/lib/builder/sanitize";
import type { Theme } from "@/lib/builder/themes";

export type Viewport = "desktop" | "tablet" | "mobile";
export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict" | "unavailable";
export type EditOrigin = "canvas" | "panel" | "system";

export interface EditorState {
  projectId: string | null;
  doc: SiteDoc;
  pageId: string;
  selectedId: string | null;
  viewport: Viewport;
  past: SiteDoc[];
  future: SiteDoc[];
  /** Incremented on every document change. */
  rev: number;
  /** rev of the last successful save. */
  savedRev: number;
  saveState: SaveState;
  saveMessage: string;
  /** Who made the most recent change (the canvas skips re-rendering its own inline edits). */
  lastOrigin: EditOrigin;
  coalesceKey: string | null;
  coalesceAt: number;
  /** Field the properties panel should reveal (e.g. an image clicked in the canvas). */
  focusPath: string | null;
}

type Listener = () => void;

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1500;

let state: EditorState;
const listeners = new Set<Listener>();

export function getState(): EditorState {
  return state;
}

export function setState(patch: Partial<EditorState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  const [value, setValue] = useState(() => selector(state));
  useEffect(() => {
    const check = () => setValue(() => selector(state));
    check();
    return subscribe(check);
  }, []);
  return value;
}

export function initEditor(doc: SiteDoc, projectId: string | null, savedRev = 0): void {
  state = {
    projectId,
    doc,
    pageId: doc.pages[0]!.id,
    selectedId: null,
    viewport: state?.viewport ?? "desktop",
    past: [],
    future: [],
    rev: savedRev,
    savedRev,
    saveState: "saved",
    saveMessage: "",
    lastOrigin: "system",
    coalesceKey: null,
    coalesceAt: 0,
    focusPath: null,
  };
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------------------
// Immutable helpers
// ---------------------------------------------------------------------------

function setIn(target: unknown, path: (string | number)[], value: unknown): unknown {
  if (!path.length) return value;
  const [head, ...rest] = path;
  if (Array.isArray(target)) {
    const copy = target.slice();
    copy[head as number] = setIn(copy[head as number], rest, value);
    return copy;
  }
  const obj = (target && typeof target === "object" ? target : {}) as Record<string, unknown>;
  return { ...obj, [head as string]: setIn(obj[head as string], rest, value) };
}

export function parsePath(path: string): (string | number)[] {
  return path.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p));
}

export function getIn(target: unknown, path: string): unknown {
  return parsePath(path).reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key as string] : undefined), target);
}

function mapPage(doc: SiteDoc, pageId: string, fn: (p: Page) => Page): SiteDoc {
  return { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

function mapSection(doc: SiteDoc, sectionId: string, fn: (s: Section) => Section): SiteDoc {
  return {
    ...doc,
    pages: doc.pages.map((p) => (p.sections.some((s) => s.id === sectionId) ? { ...p, sections: p.sections.map((s) => (s.id === sectionId ? fn(s) : s)) } : p)),
  };
}

export function currentPage(s: EditorState = state): Page {
  return s.doc.pages.find((p) => p.id === s.pageId) ?? s.doc.pages[0]!;
}

export function findSection(id: string | null, s: EditorState = state): Section | undefined {
  if (!id) return undefined;
  for (const p of s.doc.pages) for (const sec of p.sections) if (sec.id === id) return sec;
  return undefined;
}

// ---------------------------------------------------------------------------
// Committing changes
// ---------------------------------------------------------------------------

export function commit(next: SiteDoc, opts: { origin?: EditOrigin; coalesceKey?: string; selectedId?: string | null; pageId?: string } = {}): void {
  if (next === state.doc) return;
  const now = Date.now();
  const coalesce = !!opts.coalesceKey && opts.coalesceKey === state.coalesceKey && now - state.coalesceAt < COALESCE_MS;
  const past = coalesce ? state.past : [...state.past, state.doc].slice(-HISTORY_LIMIT);
  const pageId = opts.pageId ?? (next.pages.some((p) => p.id === state.pageId) ? state.pageId : next.pages[0]!.id);
  setState({
    doc: next,
    past,
    future: [],
    rev: state.rev + 1,
    lastOrigin: opts.origin ?? "panel",
    coalesceKey: opts.coalesceKey ?? null,
    coalesceAt: now,
    pageId,
    selectedId: opts.selectedId !== undefined ? opts.selectedId : state.selectedId,
  });
}

export function undo(): void {
  const prev = state.past[state.past.length - 1];
  if (!prev) return;
  setState({
    doc: prev,
    past: state.past.slice(0, -1),
    future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
    rev: state.rev + 1,
    lastOrigin: "system",
    coalesceKey: null,
    pageId: prev.pages.some((p) => p.id === state.pageId) ? state.pageId : prev.pages[0]!.id,
  });
}

export function redo(): void {
  const next = state.future[0];
  if (!next) return;
  setState({
    doc: next,
    past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
    future: state.future.slice(1),
    rev: state.rev + 1,
    lastOrigin: "system",
    coalesceKey: null,
    pageId: next.pages.some((p) => p.id === state.pageId) ? state.pageId : next.pages[0]!.id,
  });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function replaceDoc(doc: SiteDoc): void {
  commit(doc, { origin: "system", selectedId: null });
}

export function updateProp(sectionId: string, path: string, value: unknown, origin: EditOrigin = "panel"): void {
  commit(
    mapSection(state.doc, sectionId, (s) => ({ ...s, props: setIn(s.props, parsePath(path), value) as Record<string, unknown> })),
    { origin, coalesceKey: `${origin}:${sectionId}:${path}` }, // typing in the panel vs. the canvas = separate undo steps
  );
}

export function updateSection(sectionId: string, patch: Partial<Pick<Section, "variant" | "style">>, coalesceKey?: string): void {
  commit(mapSection(state.doc, sectionId, (s) => ({ ...s, ...patch, style: patch.style ? { ...s.style, ...patch.style } : s.style })), { coalesceKey });
}

export function replaceSection(section: Section): void {
  commit(mapSection(state.doc, section.id, () => section), { origin: "system" });
}

export function addSection(type: SectionType, variant?: string, atIndex?: number): string | null {
  const page = currentPage();
  const def = getSectionDef(type);
  if (!def || page.sections.length >= MAX_SECTIONS_PER_PAGE) return null;
  if (def.pinned && page.sections.some((s) => s.type === type)) return null;
  const section = createSection(type, variant);
  if (type === "navbar") section.props.brand = state.doc.name;
  if (type === "footer") section.props.brand = state.doc.name;
  const sections = page.sections.slice();
  const hasFooter = sections[sections.length - 1]?.type === "footer";
  let index: number;
  if (def.pinned === "top") index = 0;
  else if (def.pinned === "bottom") index = sections.length;
  else {
    const min = sections[0]?.type === "navbar" ? 1 : 0;
    const max = hasFooter ? sections.length - 1 : sections.length;
    index = Math.min(Math.max(atIndex ?? max, min), max);
  }
  sections.splice(index, 0, section);
  commit(mapPage(state.doc, page.id, (p) => ({ ...p, sections })), { selectedId: section.id });
  return section.id;
}

export function removeSection(sectionId: string): void {
  commit(
    { ...state.doc, pages: state.doc.pages.map((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== sectionId) })) },
    { selectedId: state.selectedId === sectionId ? null : state.selectedId },
  );
}

export function duplicateSection(sectionId: string): void {
  const page = state.doc.pages.find((p) => p.sections.some((s) => s.id === sectionId));
  const original = page?.sections.find((s) => s.id === sectionId);
  if (!page || !original || getSectionDef(original.type)?.pinned || page.sections.length >= MAX_SECTIONS_PER_PAGE) return;
  const copy: Section = { ...structuredClone(original), id: newId("s") };
  const sections = page.sections.slice();
  sections.splice(sections.indexOf(original) + 1, 0, copy);
  commit(mapPage(state.doc, page.id, (p) => ({ ...p, sections })), { selectedId: copy.id });
}

/** Move a section to a new index within its page, keeping navbar first and footer last. */
export function moveSection(sectionId: string, toIndex: number): void {
  const page = state.doc.pages.find((p) => p.sections.some((s) => s.id === sectionId));
  if (!page) return;
  const from = page.sections.findIndex((s) => s.id === sectionId);
  const section = page.sections[from]!;
  if (getSectionDef(section.type)?.pinned) return;
  const sections = page.sections.slice();
  sections.splice(from, 1);
  const min = sections[0]?.type === "navbar" ? 1 : 0;
  const max = sections[sections.length - 1]?.type === "footer" ? sections.length - 1 : sections.length;
  const target = Math.min(Math.max(toIndex, min), max);
  if (target === from) return;
  sections.splice(target, 0, section);
  commit(mapPage(state.doc, page.id, (p) => ({ ...p, sections })));
}

export function addPage(title: string): string | null {
  if (state.doc.pages.length >= MAX_PAGES) return null;
  const used = new Set(state.doc.pages.map((p) => p.slug));
  let slug = slugify(title, "page");
  if (slug === "index") slug = "home-2";
  for (let i = 2; used.has(slug); i++) slug = `${slugify(title, "page")}-${i}`;
  const first = state.doc.pages[0]!;
  const nav = first.sections.find((s) => s.type === "navbar");
  const foot = first.sections.find((s) => s.type === "footer");
  const hero = createSection("hero", "centered");
  hero.props = { ...hero.props, eyebrow: "", headline: title, subheadline: "", primaryLabel: "", secondaryLabel: "" };
  hero.style = { ...defaultStyleFor("hero"), spacing: "normal", background: "surface" };
  const page: Page = {
    id: newId("page"),
    slug,
    title: title.slice(0, 60) || "New page",
    sections: [
      ...(nav ? [{ ...structuredClone(nav), id: newId("s") }] : []),
      hero,
      ...(foot ? [{ ...structuredClone(foot), id: newId("s") }] : []),
    ],
  };
  commit({ ...state.doc, pages: [...state.doc.pages, page] }, { pageId: page.id, selectedId: null });
  return page.id;
}

export function renamePage(pageId: string, title: string): void {
  commit(mapPage(state.doc, pageId, (p) => ({ ...p, title: title.slice(0, 60) })), { coalesceKey: `page-title:${pageId}` });
}

export function deletePage(pageId: string): void {
  const index = state.doc.pages.findIndex((p) => p.id === pageId);
  if (index <= 0) return; // the home page can't be deleted
  commit({ ...state.doc, pages: state.doc.pages.filter((p) => p.id !== pageId) }, { pageId: state.doc.pages[0]!.id, selectedId: null });
}

export function movePage(pageId: string, delta: number): void {
  const pages = state.doc.pages.slice();
  const from = pages.findIndex((p) => p.id === pageId);
  const to = from + delta;
  if (from <= 0 || to <= 0 || to >= pages.length) return; // home stays first
  const [page] = pages.splice(from, 1);
  pages.splice(to, 0, page!);
  commit({ ...state.doc, pages });
}

export function setTheme(theme: Theme, coalesceKey?: string): void {
  commit({ ...state.doc, theme }, { coalesceKey });
}

export function setSiteMeta(patch: Partial<Pick<SiteDoc, "name" | "description">>): void {
  commit({ ...state.doc, ...patch }, { coalesceKey: `meta:${Object.keys(patch).join(",")}` });
}

/** Upload + assign an image in a single undo step. */
export function setUploadedImage(sectionId: string, path: string, asset: SiteDoc["assets"][string], alt: string): void {
  const id = newId("img");
  const withAsset = { ...state.doc, assets: { ...state.doc.assets, [id]: asset } };
  commit(
    mapSection(withAsset, sectionId, (s) => ({ ...s, props: setIn(s.props, parsePath(path), { src: `asset:${id}`, alt }) as Record<string, unknown> })),
    { origin: "panel" },
  );
}

/** Point an image field at an image already in the project's library. */
export function applyLibraryImage(sectionId: string, path: string, assetId: string, alt: string): void {
  if (!state.doc.assets[assetId]) return;
  commit(mapSection(state.doc, sectionId, (s) => ({ ...s, props: setIn(s.props, parsePath(path), { src: `asset:${assetId}`, alt }) as Record<string, unknown> })), { origin: "panel" });
}

export function renameAsset(assetId: string, name: string): void {
  const asset = state.doc.assets[assetId];
  if (!asset) return;
  commit({ ...state.doc, assets: { ...state.doc.assets, [assetId]: { ...asset, name: name.slice(0, 80) } } }, { coalesceKey: `asset-name:${assetId}`, origin: "system" });
}

/** Remove an image from the library. Only allowed when no section uses it. */
export function deleteAsset(assetId: string): boolean {
  if (assetUsage(state.doc, assetId) > 0) return false;
  const rest = { ...state.doc.assets };
  delete rest[assetId];
  commit({ ...state.doc, assets: rest }, { origin: "system" });
  return true;
}

export function assetUsage(doc: SiteDoc, assetId: string): number {
  const ref = `asset:${assetId}`;
  let n = 0;
  const visit = (v: unknown) => {
    if (v === ref) n++;
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") Object.values(v).forEach(visit);
  };
  for (const p of doc.pages) for (const s of p.sections) visit(s.props);
  return n;
}

/** Drop uploaded images no section references any more (keeps saved projects small). */
export function pruneAssets(doc: SiteDoc, used: string[]): SiteDoc {
  const keep = new Set(used);
  if (Object.keys(doc.assets).every((id) => keep.has(id))) return doc;
  return { ...doc, assets: Object.fromEntries(Object.entries(doc.assets).filter(([id]) => keep.has(id))) };
}

export function selectSection(id: string | null, focusPath: string | null = null): void {
  if (id === state.selectedId && focusPath === state.focusPath) return;
  setState({ selectedId: id, focusPath, coalesceKey: null });
}

export function selectPage(pageId: string): void {
  if (pageId === state.pageId) return;
  setState({ pageId, selectedId: null, coalesceKey: null });
}

export function setViewport(viewport: Viewport): void {
  setState({ viewport });
}
