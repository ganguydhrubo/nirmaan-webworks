/**
 * The site document: the single structured representation of a website
 * that the AI generates, the editor edits, persistence stores, and the
 * exporter turns into HTML files.
 *
 * normalizeDoc() is the ONE gate every document passes through — AI output,
 * imported backup files, and projects loaded from browser storage alike — so
 * the renderer and editor can rely on a fully valid shape.
 */
import { getSectionDef, normalizeProps, defaultProps, SECTION_TYPES, type SectionType } from "./catalog";
import { cleanLine, cleanText, newId, slugify } from "./sanitize";
import { normalizeTheme, DEFAULT_THEME, type Theme } from "./themes";

export const SCHEMA_VERSION = 1;
export const MAX_PAGES = 8;
export const MAX_SECTIONS_PER_PAGE = 24;
export const MAX_ASSETS = 40;
/** Per-image cap after the browser re-encodes uploads (see editor image upload). */
export const MAX_ASSET_BYTES = 1_500_000;

export type SectionBackground = "default" | "surface" | "accent" | "dark" | "gradient" | "pattern";
export type SectionAlign = "left" | "center";
export type SectionSpacing = "compact" | "normal" | "spacious";

export interface SectionStyle {
  background: SectionBackground;
  align: SectionAlign;
  spacing: SectionSpacing;
}

export interface Section {
  id: string;
  type: SectionType;
  variant: string;
  props: Record<string, unknown>;
  style: SectionStyle;
}

export interface Page {
  id: string;
  /** "index" for the home page; becomes the exported file name (<slug>.html). */
  slug: string;
  title: string;
  sections: Section[];
}

export type AssetMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export type AssetSource = "upload" | "ai" | "illustration" | "url";

export interface Asset {
  name: string;
  mime: AssetMime;
  /** base64 data: URL. Validated (type, signature, size) by normalizeDoc. */
  dataUrl: string;
  /** Where the image came from — shown in the media library so AI images and illustrations are never mislabelled. */
  source?: AssetSource;
  /** The prompt, for AI-generated images. */
  prompt?: string;
}

export interface SiteDoc {
  schemaVersion: number;
  name: string;
  /** Used as the meta description on exported pages. */
  description: string;
  language: string;
  theme: Theme;
  pages: Page[];
  assets: Record<string, Asset>;
}

export const ASSET_MIME_EXT: Record<AssetMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const SIGNATURES: Record<AssetMime, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/gif": (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  "image/webp": (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
};

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Accept only raster images whose declared type matches their actual file
 * signature, within the size cap. SVG is never accepted (it can carry script).
 */
export function validateAsset(raw: unknown): Asset | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Partial<Asset>;
  if (typeof a.dataUrl !== "string" || typeof a.mime !== "string" || !(a.mime in ASSET_MIME_EXT)) return null;
  const mime = a.mime as AssetMime;
  const prefix = `data:${mime};base64,`;
  if (!a.dataUrl.startsWith(prefix)) return null;
  const b64 = a.dataUrl.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > MAX_ASSET_BYTES) return null;
  let head: Uint8Array;
  try {
    head = base64ToBytes(b64.slice(0, 24));
  } catch {
    return null;
  }
  if (!SIGNATURES[mime](head)) return null;
  const source = a.source === "ai" || a.source === "illustration" || a.source === "url" ? a.source : "upload";
  return { name: cleanLine(a.name, 80) || "image", mime, dataUrl: a.dataUrl, source, ...(source === "ai" && a.prompt ? { prompt: cleanLine(a.prompt, 600) } : {}) };
}

function normalizeStyle(raw: unknown): SectionStyle {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<SectionStyle>;
  return {
    background: (["surface", "accent", "dark", "gradient", "pattern"] as const).includes(s.background as never) ? (s.background as SectionBackground) : "default",
    align: s.align === "center" ? "center" : "left",
    spacing: s.spacing === "compact" || s.spacing === "spacious" ? s.spacing : "normal",
  };
}

export function createSection(type: SectionType, variant?: string): Section {
  const def = getSectionDef(type)!;
  return {
    id: newId("s"),
    type,
    variant: def.variants.some((v) => v.id === variant) ? variant! : def.variants[0]!.id,
    props: defaultProps(type),
    style: defaultStyleFor(type),
  };
}

export function defaultStyleFor(type: SectionType): SectionStyle {
  if (type === "footer") return { background: "dark", align: "left", spacing: "normal" };
  if (type === "cta") return { background: "accent", align: "center", spacing: "normal" };
  if (type === "hero") return { background: "default", align: "center", spacing: "spacious" };
  if (type === "testimonials" || type === "faq" || type === "steps") return { background: "surface", align: "left", spacing: "normal" };
  return { background: "default", align: "left", spacing: "normal" };
}

const ID_RE = /^[a-z][a-z0-9-]{2,40}$/;

export interface NormalizeResult {
  doc: SiteDoc;
  /** Human-readable notes about what was dropped or repaired. */
  warnings: string[];
}

export interface NormalizeOptions {
  /**
   * Asset ids to treat as valid even though their data isn't in this
   * document — used server-side for AI edits, where the client keeps the
   * (large) uploaded images and only sends their ids.
   */
  extraAssetIds?: Iterable<string>;
}

export function normalizeDoc(raw: unknown, opts: NormalizeOptions = {}): NormalizeResult {
  const warnings: string[] = [];
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const assets: Record<string, Asset> = {};
  if (input.assets && typeof input.assets === "object") {
    for (const [id, value] of Object.entries(input.assets as Record<string, unknown>).slice(0, MAX_ASSETS)) {
      const asset = /^[a-z0-9-]{1,40}$/.test(id) ? validateAsset(value) : null;
      if (asset) assets[id] = asset;
      else warnings.push(`Dropped an image that was not a valid JPEG/PNG/WebP/GIF under ${Math.round(MAX_ASSET_BYTES / 1000)} KB.`);
    }
  }
  const assetIds = new Set([...Object.keys(assets), ...(opts.extraAssetIds ?? [])]);

  const seenIds = new Set<string>();
  const uniqueId = (candidate: unknown, prefix: string) => {
    let id = typeof candidate === "string" && ID_RE.test(candidate) ? candidate : newId(prefix);
    while (seenIds.has(id)) id = newId(prefix);
    seenIds.add(id);
    return id;
  };

  const rawPages = Array.isArray(input.pages) ? input.pages : [];
  if (rawPages.length > MAX_PAGES) warnings.push(`Only the first ${MAX_PAGES} pages were kept.`);
  const usedSlugs = new Set<string>();
  const pages: Page[] = [];

  for (const [index, rp] of rawPages.slice(0, MAX_PAGES).entries()) {
    if (!rp || typeof rp !== "object") continue;
    const p = rp as Record<string, unknown>;
    const title = cleanLine(p.title, 60) || (index === 0 ? "Home" : `Page ${index + 1}`);
    let slug = index === 0 ? "index" : slugify(p.slug && p.slug !== "/" ? p.slug : title, `page-${index + 1}`);
    if (slug === "index" && index !== 0) slug = `page-${index + 1}`;
    while (usedSlugs.has(slug)) slug = `${slug}-${index + 1}`.slice(0, 40);
    usedSlugs.add(slug);

    const rawSections = Array.isArray(p.sections) ? p.sections : [];
    let navbar: Section | undefined;
    let footer: Section | undefined;
    const body: Section[] = [];
    for (const rs of rawSections) {
      if (!rs || typeof rs !== "object") continue;
      const s = rs as Record<string, unknown>;
      if (typeof s.type !== "string" || !(SECTION_TYPES as string[]).includes(s.type)) {
        if (typeof s.type === "string") warnings.push(`Removed an unsupported "${cleanLine(s.type, 30)}" section.`);
        continue;
      }
      const type = s.type as SectionType;
      const def = getSectionDef(type)!;
      const section: Section = {
        id: uniqueId(s.id, "s"),
        type,
        variant: def.variants.some((v) => v.id === s.variant) ? (s.variant as string) : def.variants[0]!.id,
        props: normalizeProps(type, s.props, { assetIds }),
        style: s.style === undefined ? defaultStyleFor(type) : normalizeStyle(s.style),
      };
      if (def.pinned === "top") navbar ??= section;
      else if (def.pinned === "bottom") footer ??= section;
      else body.push(section);
    }
    if (body.length > MAX_SECTIONS_PER_PAGE - 2) warnings.push(`Page "${title}" was trimmed to ${MAX_SECTIONS_PER_PAGE} sections.`);
    const sections = [...(navbar ? [navbar] : []), ...body.slice(0, MAX_SECTIONS_PER_PAGE - 2), ...(footer ? [footer] : [])];
    pages.push({ id: uniqueId(p.id, "page"), slug, title, sections });
  }

  if (pages.length === 0) {
    pages.push({ id: uniqueId(undefined, "page"), slug: "index", title: "Home", sections: [] });
  }

  return {
    doc: {
      schemaVersion: SCHEMA_VERSION,
      name: cleanLine(input.name, 80) || "My Website",
      description: cleanText(input.description, 300).replace(/\n+/g, " "),
      language: typeof input.language === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(input.language) ? input.language : "en",
      theme: input.theme === undefined ? { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors } } : normalizeTheme(input.theme),
      pages,
      assets,
    },
    warnings: [...new Set(warnings)],
  };
}

/** True if a document has at least one real section to show. */
export function hasContent(doc: SiteDoc): boolean {
  return doc.pages.some((p) => p.sections.some((s) => s.type !== "navbar" && s.type !== "footer"));
}

/** Copy of a document without uploaded image data (for sending to the AI). */
export function stripAssets(doc: SiteDoc): Omit<SiteDoc, "assets"> {
  const { assets: _assets, ...rest } = doc;
  return rest;
}

export function pageFileName(slug: string): string {
  return `${slug}.html`;
}
