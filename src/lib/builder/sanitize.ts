/**
 * Escaping and URL safety for the AI Website Builder.
 *
 * Everything in a site document is untrusted: it comes from an AI model, from
 * a user typing into the editor, or from an imported backup file. The renderer
 * never emits raw HTML from the document — every string goes through
 * escapeHtml/escapeAttr, and every link/image goes through the safe* helpers
 * below — so a document can't inject markup, scripts, or `javascript:` URLs
 * into either the editor preview or an exported website.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

export const escapeAttr = escapeHtml;

/** Internal link to another page of the same generated site, e.g. "page:about". */
export const PAGE_LINK_PREFIX = "page:";
/** Reference to an uploaded image stored in the document's assets map. */
export const ASSET_PREFIX = "asset:";

/**
 * Normalise a user/AI-supplied link to one of the forms the renderer
 * understands, or "" if it isn't safe. Allowed:
 *   page:<slug>      another page in this site
 *   #anchor          a section on the same page
 *   https:// http:// absolute web links
 *   mailto: tel:     contact links
 * Anything else (javascript:, data:, vbscript:, protocol-relative //, file:,
 * relative paths that could escape the export folder) is rejected.
 */
export function safeHref(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Strip whitespace and control characters browsers ignore inside schemes
  // ("java\tscript:" is still javascript: to a browser).
  // eslint-disable-next-line no-control-regex
  const value = raw.replace(/[\u0000-\u001F\u007F\s]+/g, (m) => (m.includes(" ") ? " " : "")).trim();
  if (!value) return "";
  if (value.length > 2048) return "";

  if (value.startsWith(PAGE_LINK_PREFIX)) {
    const slug = value.slice(PAGE_LINK_PREFIX.length);
    return /^[a-z0-9-]{1,40}$/.test(slug) ? value : "";
  }
  if (value.startsWith("#")) {
    return /^#[A-Za-z0-9_-]{0,60}$/.test(value) ? value : "";
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Bare domains ("example.com") are a common thing for people to type.
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i.test(value)) {
      return safeHref(`https://${value}`);
    }
    return "";
  }
  switch (url.protocol) {
    case "https:":
    case "http:":
      return url.href;
    case "mailto:":
      return /^mailto:[^\s<>"]+@[^\s<>"]+$/i.test(value) ? value : "";
    case "tel:":
      return /^tel:\+?[0-9 ()-]{3,24}$/.test(value) ? value.replace(/[ ()-]/g, "") : "";
    default:
      return "";
  }
}

/**
 * Image sources: only https URLs or a reference to an uploaded asset that
 * exists in this document. No data:, blob:, http: (mixed content) or SVG
 * URLs, which can carry script when opened directly.
 */
export function safeImageSrc(raw: unknown, assetIds?: ReadonlySet<string>): string {
  if (typeof raw !== "string") return "";
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith(ASSET_PREFIX)) {
    const id = value.slice(ASSET_PREFIX.length);
    if (!/^[a-z0-9-]{1,40}$/.test(id)) return "";
    if (assetIds && !assetIds.has(id)) return "";
    return value;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    if (/\.svg(\?|#|$)/i.test(url.pathname)) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Lowercase, hyphenated, ASCII-only identifier safe for file names and ids. */
export function slugify(value: unknown, fallback = "page"): string {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** Collapse a value to a bounded single-line string. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
}

/** Bounded multi-line string: keeps paragraph breaks, drops control chars. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string") return "";
  return (
    value
      .replace(/\r\n?/g, "\n")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, " ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, max)
  );
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}-${rand}`;
}
