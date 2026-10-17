/**
 * Renders a SiteDoc to static HTML + CSS.
 *
 * The same renderer produces both the editor's live preview (mode "editor",
 * inside a sandboxed iframe with a small selection/inline-editing bridge
 * script) and the exported website files (mode "export", no script at all).
 * Because both come from one function, what users see while editing is what
 * they download.
 *
 * Security: every value from the document is escaped here, and every link
 * and image passes through safeHref/safeImageSrc (already applied by
 * normalizeDoc, and re-checked here as defence in depth). The exported site
 * contains no JavaScript: the mobile menu and FAQ use native <details>.
 */
import type { ImageValue } from "./catalog";
import { escapeAttr, escapeHtml as esc, safeHref, safeImageSrc, ASSET_PREFIX, PAGE_LINK_PREFIX } from "./sanitize";
import type { Page, Section, SiteDoc } from "./schema";
import { pageFileName } from "./schema";
import { FONTS, type Theme } from "./themes";

export interface RenderOptions {
  mode: "editor" | "export";
  /** Resolve an uploaded asset id to an image URL (data: URL in the editor, relative file path in exports). */
  assetUrl: (id: string) => string;
  /** Resolve a page slug to an href. */
  pageHref: (slug: string) => string;
  /** Export: path to the shared stylesheet. Editor: CSS is inlined. */
  stylesheetHref?: string;
}

interface Ctx extends RenderOptions {
  doc: SiteDoc;
  page: Page;
  assetIds: Set<string>;
  /** anchor name → slug of the first page containing it */
  anchorPages: Map<string, string>;
  /** section id → anchor id on its page */
  anchors: Map<string, string>;
}

const editing = (c: Ctx) => c.mode === "editor";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function str(props: Record<string, unknown>, key: string): string {
  const v = props[key];
  return typeof v === "string" ? v : "";
}

function list(props: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = props[key];
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : [];
}

/** Editable text element. Empty values render nothing. */
function text(c: Ctx, s: Section, path: string, value: string, tag: string, cls = "", multiline = false): string {
  if (!value) return "";
  const attrs = [cls ? `class="${cls}"` : ""];
  if (editing(c)) attrs.push(`data-edit="${escapeAttr(`${s.id}:${path}`)}"`, multiline ? "data-multiline" : "");
  return `<${tag} ${attrs.filter(Boolean).join(" ")}>${esc(value)}</${tag}>`;
}

function resolveHref(c: Ctx, raw: string): string {
  const href = safeHref(raw);
  if (!href) return "";
  if (href.startsWith(PAGE_LINK_PREFIX)) {
    const slug = href.slice(PAGE_LINK_PREFIX.length);
    return c.doc.pages.some((p) => p.slug === slug) ? c.pageHref(slug) : "";
  }
  if (href.startsWith("#") && href.length > 1) {
    const anchor = href.slice(1);
    const onThisPage = [...c.anchors.values()].includes(anchor);
    if (onThisPage) return href;
    const slug = c.anchorPages.get(anchor);
    if (slug) return `${c.pageHref(slug)}#${anchor}`;
    return href;
  }
  return href;
}

function linkAttrs(href: string): string {
  const external = /^https?:/.test(href);
  return `href="${escapeAttr(href)}"${external ? ' rel="noopener"' : ""}`;
}

function button(c: Ctx, s: Section, labelPath: string, label: string, rawHref: string, cls: string): string {
  if (!label) return "";
  const href = resolveHref(c, rawHref);
  const inner = text(c, s, labelPath, label, "span");
  if (!href) return `<span class="btn ${cls}">${inner}</span>`;
  return `<a class="btn ${cls}" ${linkAttrs(href)}>${inner}</a>`;
}

function image(c: Ctx, s: Section, path: string, value: unknown, cls: string, sizes = "100vw", eager = false): string {
  const v = (value && typeof value === "object" ? value : {}) as Partial<ImageValue>;
  const src = safeImageSrc(v.src, c.assetIds);
  const dataAttr = editing(c) ? ` data-img="${escapeAttr(`${s.id}:${path}`)}"` : "";
  if (!src) {
    if (!editing(c)) return `<div class="ph ${cls}" aria-hidden="true"></div>`;
    return `<div class="ph ${cls}"${dataAttr} role="button" tabindex="0" aria-label="Add an image"><span class="ph-label">Click to add an image</span></div>`;
  }
  const url = src.startsWith(ASSET_PREFIX) ? c.assetUrl(src.slice(ASSET_PREFIX.length)) : src;
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<img class="${cls}" src="${escapeAttr(url)}" alt="${escapeAttr(v.alt ?? "")}" ${loading} decoding="async" sizes="${sizes}"${dataAttr} />`;
}

function hasImage(c: Ctx, value: unknown): boolean {
  const v = (value && typeof value === "object" ? value : {}) as Partial<ImageValue>;
  return !!safeImageSrc(v.src, c.assetIds);
}

function sectionOpen(c: Ctx, s: Section, extraClass = "", tag = "section"): string {
  const anchor = c.anchors.get(s.id);
  const cls = `sec sec-${s.type} v-${s.variant} bg-${s.style.background} al-${s.style.align} sp-${s.style.spacing} ${extraClass}`.trim();
  const editAttr = editing(c) ? ` data-section="${escapeAttr(s.id)}"` : "";
  return `<${tag} class="${cls}"${anchor ? ` id="${escapeAttr(anchor)}"` : ""}${editAttr}>`;
}

function heading(c: Ctx, s: Section, eyebrowKey: string | null, headingKey: string, introKey: string | null): string {
  const p = s.props;
  const parts = [
    eyebrowKey ? text(c, s, eyebrowKey, str(p, eyebrowKey), "p", "eyebrow") : "",
    text(c, s, headingKey, str(p, headingKey), "h2", "h2"),
    introKey ? text(c, s, introKey, str(p, introKey), "p", "lead", true) : "",
  ].join("");
  return parts ? `<div class="sec-head">${parts}</div>` : "";
}

const ICON = {
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.1 6.1l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function navLinks(c: Ctx, cls: string): string {
  return c.doc.pages
    .map((p) => {
      const current = p.id === c.page.id ? ' aria-current="page"' : "";
      return `<li><a class="${cls}" href="${escapeAttr(c.pageHref(p.slug))}"${current}>${esc(p.title)}</a></li>`;
    })
    .join("");
}

function renderNavbar(c: Ctx, s: Section): string {
  const p = s.props;
  const brand = text(c, s, "brand", str(p, "brand") || c.doc.name, "span");
  const home = c.pageHref("index");
  const cta = button(c, s, "ctaLabel", str(p, "ctaLabel"), str(p, "ctaHref"), "btn-primary btn-sm");
  const multiPage = c.doc.pages.length > 1;
  return `${sectionOpen(c, s, "", "header")}
<div class="wrap nav-inner">
  <a class="brand" href="${escapeAttr(home)}">${brand}</a>
  ${multiPage ? `<nav class="nav-links" aria-label="Main"><ul>${navLinks(c, "nav-link")}</ul></nav>` : ""}
  <div class="nav-cta">${cta}</div>
  ${
    multiPage
      ? `<details class="nav-mobile"><summary aria-label="Open menu">${ICON.menu}</summary><nav aria-label="Mobile"><ul>${navLinks(c, "nav-mlink")}</ul>${cta ? `<div class="nav-mcta">${cta}</div>` : ""}</nav></details>`
      : ""
  }
</div>
</header>`;
}

function renderHero(c: Ctx, s: Section): string {
  const p = s.props;
  const copy = `<div class="hero-copy">
${text(c, s, "eyebrow", str(p, "eyebrow"), "p", "eyebrow")}
${text(c, s, "headline", str(p, "headline"), "h1", "h1")}
${text(c, s, "subheadline", str(p, "subheadline"), "p", "lead", true)}
<div class="btn-row">${button(c, s, "primaryLabel", str(p, "primaryLabel"), str(p, "primaryHref"), "btn-primary")}${button(
    c,
    s,
    "secondaryLabel",
    str(p, "secondaryLabel"),
    str(p, "secondaryHref"),
    "btn-ghost",
  )}</div>
</div>`;
  if (s.variant === "split") {
    return `${sectionOpen(c, s)}<div class="wrap hero-split">${copy}<div class="hero-media">${image(c, s, "image", p.image, "media", "(min-width: 900px) 50vw, 100vw", true)}</div></div></section>`;
  }
  if (s.variant === "banner") {
    const showImage = editing(c) || hasImage(c, p.image);
    return `${sectionOpen(c, s, showImage ? "has-bg" : "")}${showImage ? `<div class="hero-bg">${image(c, s, "image", p.image, "media", "100vw", true)}</div>` : ""}<div class="wrap hero-banner">${copy}</div></section>`;
  }
  return `${sectionOpen(c, s)}<div class="wrap hero-centered">${copy}</div></section>`;
}

function renderAbout(c: Ctx, s: Section): string {
  const p = s.props;
  const copy = `<div class="about-copy">${text(c, s, "eyebrow", str(p, "eyebrow"), "p", "eyebrow")}${text(c, s, "heading", str(p, "heading"), "h2", "h2")}${text(
    c,
    s,
    "body",
    str(p, "body"),
    "div",
    "prose",
    true,
  )}</div>`;
  if (s.variant === "text" || (!editing(c) && !hasImage(c, p.image))) {
    return `${sectionOpen(c, s)}<div class="wrap narrow">${copy}</div></section>`;
  }
  const media = `<div class="about-media">${image(c, s, "image", p.image, "media", "(min-width: 900px) 45vw, 100vw")}</div>`;
  const order = s.variant === "image-left" ? media + copy : copy + media;
  return `${sectionOpen(c, s)}<div class="wrap two-col">${order}</div></section>`;
}

function renderCards(c: Ctx, s: Section, key: string, variant: string): string {
  const items = list(s.props, key);
  if (variant === "list" || variant === "checklist") {
    return `<ul class="check-list">${items
      .map(
        (it, i) =>
          `<li><span class="check" aria-hidden="true">${ICON.check}</span><div>${text(c, s, `${key}.${i}.title`, str(it, "title"), "h3", "h3")}${text(
            c,
            s,
            `${key}.${i}.description`,
            str(it, "description"),
            "p",
            "muted",
            true,
          )}${text(c, s, `${key}.${i}.price`, str(it, "price"), "p", "price-tag")}</div></li>`,
      )
      .join("")}</ul>`;
  }
  return `<div class="grid cards">${items
    .map(
      (it, i) =>
        `<article class="card">${text(c, s, `${key}.${i}.title`, str(it, "title"), "h3", "h3")}${text(c, s, `${key}.${i}.description`, str(it, "description"), "p", "muted", true)}${text(
          c,
          s,
          `${key}.${i}.price`,
          str(it, "price"),
          "p",
          "price-tag",
        )}</article>`,
    )
    .join("")}</div>`;
}

function renderServices(c: Ctx, s: Section): string {
  return `${sectionOpen(c, s)}<div class="wrap">${heading(c, s, null, "heading", "intro")}${renderCards(c, s, "items", s.variant)}</div></section>`;
}

function renderGallery(c: Ctx, s: Section): string {
  const all = list(s.props, "images").map((it, i) => ({ it, i }));
  const items = editing(c) ? all : all.filter(({ it }) => hasImage(c, it.image));
  if (!items.length) return editing(c) ? `${sectionOpen(c, s)}<div class="wrap">${heading(c, s, null, "heading", "intro")}</div></section>` : "";
  return `${sectionOpen(c, s)}<div class="wrap">${heading(c, s, null, "heading", "intro")}<div class="gallery ${s.variant === "feature" ? "gallery-feature" : ""}">${items
    .map(
      ({ it, i }) =>
        `<figure>${image(c, s, `images.${i}.image`, it.image, "media", "(min-width: 900px) 33vw, 50vw")}${text(c, s, `images.${i}.caption`, str(it, "caption"), "figcaption")}</figure>`,
    )
    .join("")}</div></div></section>`;
}

function renderTestimonials(c: Ctx, s: Section): string {
  const p = s.props;
  const sample = p.isSample !== false;
  const items = list(p, "items");
  const note = sample ? `<p class="sample-note">Sample testimonials. Replace these with real customer feedback before publishing.</p>` : "";
  const quote = (it: Record<string, unknown>, i: number) =>
    `<figure class="quote">${sample ? '<span class="sample-badge">Sample</span>' : ""}<blockquote>${text(c, s, `items.${i}.quote`, str(it, "quote"), "p", "", true)}</blockquote><figcaption>${text(
      c,
      s,
      `items.${i}.name`,
      str(it, "name"),
      "strong",
    )}${text(c, s, `items.${i}.role`, str(it, "role"), "span", "muted")}</figcaption></figure>`;
  const body = s.variant === "single" && items[0] ? `<div class="quote-single">${quote(items[0], 0)}</div>` : `<div class="grid cards">${items.map(quote).join("")}</div>`;
  return `${sectionOpen(c, s)}<div class="wrap">${heading(c, s, null, "heading", null)}${note}${body}</div></section>`;
}

function renderPricing(c: Ctx, s: Section): string {
  const plans = list(s.props, "plans");
  return `${sectionOpen(c, s)}<div class="wrap">${heading(c, s, null, "heading", "intro")}<div class="grid plans">${plans
    .map((pl, i) => {
      const features = Array.isArray(pl.features) ? (pl.features as unknown[]).filter((f): f is string => typeof f === "string" && !!f) : [];
      return `<article class="plan${pl.highlighted ? " plan-hi" : ""}">${text(c, s, `plans.${i}.name`, str(pl, "name"), "h3", "h3")}<p class="plan-price">${text(c, s, `plans.${i}.price`, str(pl, "price"), "span", "amount")}${text(
        c,
        s,
        `plans.${i}.period`,
        str(pl, "period"),
        "span",
        "period",
      )}</p><ul class="plan-features">${features.map((f) => `<li><span class="check" aria-hidden="true">${ICON.check}</span>${esc(f)}</li>`).join("")}</ul>${button(
        c,
        s,
        `plans.${i}.ctaLabel`,
        str(pl, "ctaLabel"),
        str(pl, "ctaHref"),
        pl.highlighted ? "btn-primary" : "btn-ghost",
      )}</article>`;
    })
    .join("")}</div></div></section>`;
}

function renderFaq(c: Ctx, s: Section): string {
  const items = list(s.props, "items");
  return `${sectionOpen(c, s)}<div class="wrap narrow">${heading(c, s, null, "heading", null)}<div class="faq">${items
    .map(
      (it, i) =>
        `<details class="faq-item"${editing(c) ? " open" : ""}><summary>${text(c, s, `items.${i}.question`, str(it, "question"), "span")}</summary><div class="faq-a">${text(
          c,
          s,
          `items.${i}.answer`,
          str(it, "answer"),
          "p",
          "",
          true,
        )}</div></details>`,
    )
    .join("")}</div></div></section>`;
}

function renderContact(c: Ctx, s: Section): string {
  const p = s.props;
  const email = str(p, "email");
  const phone = str(p, "phone");
  const wa = str(p, "whatsapp").replace(/[^0-9]/g, "");
  const rows: string[] = [];
  if (email) rows.push(`<li>${ICON.mail}<a ${linkAttrs(safeHref(`mailto:${email}`) || "#")}>${text(c, s, "email", email, "span")}</a></li>`);
  if (phone) rows.push(`<li>${ICON.phone}<a ${linkAttrs(safeHref(`tel:${phone}`) || "#")}>${text(c, s, "phone", phone, "span")}</a></li>`);
  if (wa.length >= 8) rows.push(`<li>${ICON.chat}<a href="https://wa.me/${wa}" rel="noopener">Chat on WhatsApp</a></li>`);
  if (str(p, "address")) rows.push(`<li>${ICON.pin}${text(c, s, "address", str(p, "address"), "span", "", true)}</li>`);
  if (str(p, "hours")) rows.push(`<li>${ICON.clock}${text(c, s, "hours", str(p, "hours"), "span")}</li>`);
  if (!rows.length && editing(c)) rows.push(`<li class="muted">Add your email, phone or address in the panel on the right.</li>`);

  const endpoint = safeHref(str(p, "formEndpoint"));
  let action = "";
  if (s.variant === "split") {
    if (endpoint.startsWith("https://")) {
      action = `<form class="form card" action="${escapeAttr(endpoint)}" method="POST">
<label>Your name<input name="name" autocomplete="name" required maxlength="100" /></label>
<label>Email<input type="email" name="email" autocomplete="email" required maxlength="200" /></label>
<label>Message<textarea name="message" rows="4" required maxlength="2000"></textarea></label>
<button class="btn btn-primary" type="submit">Send message</button>
</form>`;
    } else if (email) {
      action = `<div class="card form-alt"><p>Prefer email? Write to us and we will get back to you.</p><a class="btn btn-primary" ${linkAttrs(safeHref(`mailto:${email}`) || "#")}>Email us</a></div>`;
    } else if (editing(c)) {
      action = `<div class="card form-alt muted"><p>To show a contact form, paste a form service URL (e.g. Formspree) in the panel. Otherwise add an email to show an "Email us" button.</p></div>`;
    }
  }
  return `${sectionOpen(c, s)}<div class="wrap ${action ? "two-col" : "narrow"}"><div>${heading(c, s, null, "heading", "intro")}<ul class="contact-list">${rows.join("")}</ul></div>${action}</div></section>`;
}

function renderCta(c: Ctx, s: Section): string {
  const p = s.props;
  const inner = `${text(c, s, "heading", str(p, "heading"), "h2", "h2")}${text(c, s, "body", str(p, "body"), "p", "lead", true)}<div class="btn-row">${button(
    c,
    s,
    "buttonLabel",
    str(p, "buttonLabel"),
    str(p, "buttonHref"),
    "btn-primary",
  )}</div>`;
  return `${sectionOpen(c, s)}<div class="wrap ${s.variant === "card" ? "cta-card" : "cta-band"}">${inner}</div></section>`;
}

function renderText(c: Ctx, s: Section): string {
  const p = s.props;
  return `${sectionOpen(c, s)}<div class="wrap ${s.variant === "wide" ? "" : "narrow"}">${text(c, s, "heading", str(p, "heading"), "h2", "h2")}${text(c, s, "body", str(p, "body"), "div", "prose", true)}</div></section>`;
}

function renderFooter(c: Ctx, s: Section): string {
  const p = s.props;
  const brand = str(p, "brand") || c.doc.name;
  const owner = str(p, "copyright") || brand;
  const year = new Date().getFullYear();
  const links = c.doc.pages.length > 1 ? `<nav aria-label="Footer"><ul class="foot-links">${navLinks(c, "foot-link")}</ul></nav>` : "";
  return `${sectionOpen(c, s, "", "footer")}<div class="wrap foot ${s.variant === "columns" ? "foot-cols" : ""}"><div>${text(c, s, "brand", brand, "p", "foot-brand")}${text(
    c,
    s,
    "tagline",
    str(p, "tagline"),
    "p",
    "muted",
    true,
  )}</div>${links}<p class="foot-copy muted">&copy; ${year} ${esc(owner)}</p></div></footer>`;
}

const RENDERERS: Record<string, (c: Ctx, s: Section) => string> = {
  navbar: renderNavbar,
  hero: renderHero,
  about: renderAbout,
  services: renderServices,
  features: renderServices,
  gallery: renderGallery,
  testimonials: renderTestimonials,
  pricing: renderPricing,
  faq: renderFaq,
  contact: renderContact,
  cta: renderCta,
  text: renderText,
  footer: renderFooter,
};

// ---------------------------------------------------------------------------
// Page assembly
// ---------------------------------------------------------------------------

function anchorMap(page: Page): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const s of page.sections) {
    if (s.type === "navbar" || s.type === "footer") continue;
    const anchor = used.has(s.type) ? `section-${s.id}` : s.type;
    used.add(s.type);
    map.set(s.id, anchor);
  }
  return map;
}

function buildCtx(doc: SiteDoc, page: Page, opts: RenderOptions): Ctx {
  const anchorPages = new Map<string, string>();
  for (const p of doc.pages) {
    for (const anchor of anchorMap(p).values()) if (!anchorPages.has(anchor)) anchorPages.set(anchor, p.slug);
  }
  return { ...opts, doc, page, assetIds: new Set(Object.keys(doc.assets)), anchorPages, anchors: anchorMap(page) };
}

/** Body markup for one page (used directly by the editor for live updates). */
export function renderPageBody(doc: SiteDoc, page: Page, opts: RenderOptions): string {
  const c = buildCtx(doc, page, opts);
  const navbar = page.sections.find((s) => s.type === "navbar");
  const footer = page.sections.find((s) => s.type === "footer");
  const body = page.sections.filter((s) => s !== navbar && s !== footer);
  const main = body.map((s) => RENDERERS[s.type]?.(c, s) ?? "").join("\n");
  const empty = editing(c) && !page.sections.length ? `<div class="empty-page">This page is empty. Add a section from the left panel.</div>` : "";
  return `<a class="skip" href="#main">Skip to content</a>
${navbar ? renderNavbar(c, navbar) : ""}
<main id="main">${main}${empty}</main>
${footer ? renderFooter(c, footer) : ""}`;
}

export function googleFontsHref(theme: Theme): string {
  const families = [...new Set([theme.fontHeading, theme.fontBody])].map((f) => FONTS[f]?.google).filter(Boolean);
  return families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap` : "";
}

export function pageTitle(doc: SiteDoc, page: Page): string {
  return page.slug === "index" ? doc.name : `${page.title} | ${doc.name}`;
}

/** Full standalone HTML document for one page. */
export function renderPageDocument(doc: SiteDoc, page: Page, opts: RenderOptions & { headExtra?: string; bodyExtra?: string }): string {
  const fonts = googleFontsHref(doc.theme);
  const title = pageTitle(doc, page);
  const description = doc.description;
  const css = opts.stylesheetHref ? `<link rel="stylesheet" href="${escapeAttr(opts.stylesheetHref)}" />` : `<style id="site-css">${renderCss(doc.theme)}</style>`;
  return `<!DOCTYPE html>
<html lang="${escapeAttr(doc.language)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${escapeAttr(description)}" />` : ""}
<meta property="og:title" content="${escapeAttr(title)}" />
${description ? `<meta property="og:description" content="${escapeAttr(description)}" />` : ""}
<meta property="og:type" content="website" />
<meta name="generator" content="ATITTLE AI Website Builder" />
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com" />\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n<link rel="stylesheet" href="${escapeAttr(fonts)}" />` : ""}
${css}
${opts.headExtra ?? ""}
</head>
<body>
${renderPageBody(doc, page, opts)}
${opts.bodyExtra ?? ""}
</body>
</html>
`;
}

export function exportRenderOptions(): RenderOptions {
  return {
    mode: "export",
    stylesheetHref: "assets/styles.css",
    pageHref: (slug) => pageFileName(slug),
    assetUrl: () => "",
  };
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

export function renderCss(theme: Theme): string {
  const k = theme.colors;
  const radius = theme.radius === "sharp" ? "2px" : theme.radius === "round" ? "18px" : "10px";
  const radiusSm = theme.radius === "sharp" ? "2px" : theme.radius === "round" ? "999px" : "8px";
  const fh = FONTS[theme.fontHeading]?.stack ?? FONTS.Inter!.stack;
  const fb = FONTS[theme.fontBody]?.stack ?? FONTS.Inter!.stack;
  // All interpolated values below are validated hex colours / allowlisted
  // font stacks (normalizeTheme), never free text.
  return `:root{--bg:${k.bg};--surface:${k.surface};--text:${k.text};--muted:${k.muted};--accent:${k.accent};--accent-text:${k.accentText};--dark:${k.dark};--dark-text:${k.darkText};--border:${k.border};--r:${radius};--r-btn:${radiusSm};--fh:${fh};--fb:${fb}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--fb);font-size:1.0625rem;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;display:block}
a{color:inherit}
h1,h2,h3{font-family:var(--fh);line-height:1.15;margin:0 0 .5em;letter-spacing:-.01em;overflow-wrap:anywhere}
p{margin:0 0 1em}
ul{margin:0;padding:0;list-style:none}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.skip{position:absolute;left:-999px;top:8px;z-index:100;background:var(--text);color:var(--bg);padding:8px 14px;border-radius:var(--r-btn)}
.skip:focus{left:8px}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 20px}
.narrow{max-width:760px}
.sec{position:relative}
.sp-compact{padding:clamp(32px,5vw,48px) 0}
.sp-normal{padding:clamp(56px,8vw,88px) 0}
.sp-spacious{padding:clamp(72px,11vw,128px) 0}
.bg-default{background:var(--bg)}
.bg-surface{background:var(--surface)}
.bg-accent{background:var(--accent);color:var(--accent-text)}
.bg-dark{background:var(--dark);color:var(--dark-text)}
.bg-accent .muted,.bg-dark .muted,.bg-accent .lead,.bg-dark .lead{color:inherit;opacity:.82}
.al-center .sec-head,.al-center .hero-copy,.al-center .cta-band,.al-center .cta-card,.al-center.sec-text .wrap,.al-center .about-copy{text-align:center;margin-left:auto;margin-right:auto}
.al-center .btn-row{justify-content:center}
.eyebrow{font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:.75em}
.bg-accent .eyebrow,.bg-dark .eyebrow{color:inherit;opacity:.85}
.h1{font-size:clamp(2.1rem,5.2vw,3.6rem);font-weight:700}
.h2{font-size:clamp(1.65rem,3.4vw,2.4rem);font-weight:700}
.h3{font-size:1.15rem;font-weight:700;margin-bottom:.35em}
.lead{font-size:clamp(1.05rem,1.6vw,1.2rem);color:var(--muted);max-width:640px;white-space:pre-line}
.al-center .lead{margin-left:auto;margin-right:auto}
.muted{color:var(--muted)}
.prose{white-space:pre-line;color:var(--muted);max-width:68ch}
.sec-head{max-width:720px;margin-bottom:clamp(28px,4vw,44px)}
.btn-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:1.6em}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:.7em 1.4em;border-radius:var(--r-btn);font-weight:600;text-decoration:none;border:2px solid transparent;transition:transform .15s ease,opacity .15s ease;cursor:pointer;font:inherit;font-weight:600;line-height:1.2;text-align:center}
.btn:hover{transform:translateY(-1px);opacity:.92}
.btn-primary{background:var(--accent);color:var(--accent-text)}
.btn-ghost{border-color:currentColor;background:transparent;color:inherit}
.btn-sm{min-height:40px;padding:.5em 1.1em;font-size:.95rem}
.bg-accent .btn-primary{background:var(--accent-text);color:var(--accent)}
.bg-dark .btn-primary{background:var(--accent);color:var(--accent-text)}
.sec-navbar{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--border);padding:0}
.sec-navbar.bg-default{background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:saturate(1.4) blur(8px)}
.nav-inner{display:flex;align-items:center;gap:24px;min-height:68px}
.brand{font-family:var(--fh);font-weight:700;font-size:1.25rem;text-decoration:none;margin-right:auto}
.nav-links ul{display:flex;gap:22px}
.nav-link{text-decoration:none;font-weight:500;opacity:.8}
.nav-link:hover,.nav-link[aria-current=page]{opacity:1;color:var(--accent)}
.bg-accent .nav-link:hover,.bg-accent .nav-link[aria-current=page],.bg-dark .nav-link[aria-current=page]{color:inherit;text-decoration:underline}
.v-centered .nav-inner{flex-wrap:wrap;justify-content:center;padding:12px 20px}
.v-centered .brand{margin:0 auto;width:100%;text-align:center}
.v-centered .nav-links{order:3}
.nav-mobile{display:none;position:relative}
.nav-mobile summary{list-style:none;cursor:pointer;display:grid;place-items:center;width:44px;height:44px;border-radius:var(--r-btn)}
.nav-mobile summary::-webkit-details-marker{display:none}
.nav-mobile summary svg{width:24px;height:24px}
.nav-mobile nav{position:absolute;right:0;top:52px;min-width:220px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:var(--r);padding:10px;box-shadow:0 18px 40px rgba(0,0,0,.15)}
.nav-mlink{display:block;padding:10px 12px;text-decoration:none;border-radius:var(--r-btn)}
.nav-mlink[aria-current=page]{color:var(--accent);font-weight:600}
.nav-mcta{padding:8px 4px 4px}
.nav-mcta .btn{width:100%}
@media (max-width:820px){.nav-links,.nav-cta{display:none}.nav-mobile{display:block}.v-centered .brand{width:auto;margin:0 auto 0 0}.v-centered .nav-inner{flex-wrap:nowrap;justify-content:space-between}}
@media (max-width:820px){.sec-navbar:not(:has(.nav-mobile)) .nav-cta{display:block}}
.hero-copy{max-width:760px}
.hero-centered .hero-copy{margin:0 auto 0 0}
.al-center .hero-centered .hero-copy{margin:0 auto}
.hero-split{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,5vw,64px);align-items:center}
.hero-split .hero-copy,.al-center .hero-split .hero-copy{text-align:left;margin:0}
.al-center .hero-split .btn-row{justify-content:flex-start}
.media{width:100%;height:100%;object-fit:cover;border-radius:var(--r)}
.hero-media .media{aspect-ratio:4/3.4}
.sec-hero.has-bg{color:#fff;overflow:hidden}
.hero-bg{position:absolute;inset:0}
.hero-bg .media{border-radius:0;height:100%}
.hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.65));pointer-events:none}
.hero-banner{position:relative;z-index:1}
.has-bg .lead,.has-bg .eyebrow{color:#fff;opacity:.9}
.has-bg .btn-ghost{color:#fff}
.ph{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 28%,var(--surface)),var(--surface) 70%);border-radius:var(--r);min-height:220px;display:grid;place-items:center;width:100%}
.hero-media .ph{aspect-ratio:4/3.4}
.hero-bg .ph{height:100%;border-radius:0;place-items:end;padding:16px}
.ph-label{font-size:.9rem;font-weight:600;color:var(--text);background:var(--bg);padding:6px 12px;border-radius:999px;opacity:.85}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px);align-items:center}
.about-media .media,.about-media .ph{aspect-ratio:5/4}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}
.card{background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:26px}
.bg-default .card{background:var(--surface);border-color:transparent}
.bg-accent .card,.bg-dark .card{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}
.price-tag{font-weight:700;color:var(--accent);margin:.6em 0 0}
.bg-accent .price-tag,.bg-dark .price-tag{color:inherit}
.check-list{display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.check-list li{display:flex;gap:14px;align-items:flex-start}
.check{flex:none;display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
.check svg{width:16px;height:16px}
.bg-accent .check,.bg-dark .check{background:rgba(255,255,255,.16);color:inherit}
.gallery{display:grid;gap:14px;grid-template-columns:repeat(3,1fr)}
.gallery figure{margin:0}
.gallery .media,.gallery .ph{aspect-ratio:1/1;min-height:0}
.gallery figcaption{font-size:.9rem;color:var(--muted);margin-top:8px}
.gallery-feature figure:first-child{grid-column:span 2;grid-row:span 2}
.gallery-feature figure:first-child .media,.gallery-feature figure:first-child .ph{height:100%}
.quote{margin:0;position:relative;background:var(--bg);border-radius:var(--r);padding:28px;border:1px solid var(--border)}
.bg-default .quote{background:var(--surface);border-color:transparent}
.quote blockquote{margin:0 0 18px;font-size:1.05rem;white-space:pre-line}
.quote figcaption{display:flex;flex-direction:column;gap:2px}
.quote-single{max-width:760px}
.al-center .quote-single{margin:0 auto}
.quote-single blockquote{font-family:var(--fh);font-size:clamp(1.3rem,2.6vw,1.8rem);line-height:1.35}
.sample-note{font-size:.85rem;border:1px dashed currentColor;border-radius:var(--r-btn);padding:8px 12px;display:inline-block;opacity:.8}
.sample-badge{position:absolute;top:12px;right:12px;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:2px 8px;border-radius:999px;border:1px solid currentColor;opacity:.7}
.plans{align-items:stretch}
.plan{display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:28px}
.bg-default .plan{background:var(--surface);border-color:transparent}
.plan-hi{border:2px solid var(--accent)!important;box-shadow:0 18px 40px color-mix(in srgb,var(--accent) 18%,transparent)}
.plan-price{margin:.2em 0 1em}
.amount{font-family:var(--fh);font-size:2rem;font-weight:700}
.period{color:var(--muted);margin-left:4px}
.plan-features{display:grid;gap:10px;margin-bottom:24px;flex:1}
.plan-features li{display:flex;gap:10px;align-items:flex-start}
.plan-features .check{width:22px;height:22px}
.plan-features .check svg{width:13px;height:13px}
.faq{display:grid;gap:12px}
.faq-item{border:1px solid var(--border);border-radius:var(--r);background:var(--bg)}
.faq-item summary{cursor:pointer;padding:18px 22px;font-weight:600;list-style:none;display:flex;justify-content:space-between;gap:16px}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary::after{content:"+";font-size:1.4rem;line-height:1;color:var(--accent)}
.faq-item[open] summary::after{content:"\\2212"}
.faq-a{padding:0 22px 18px;color:var(--muted);white-space:pre-line}
.contact-list{display:grid;gap:16px;margin-top:8px}
.contact-list li{display:flex;gap:12px;align-items:flex-start}
.contact-list svg{flex:none;width:22px;height:22px;color:var(--accent);margin-top:3px}
.bg-accent .contact-list svg,.bg-dark .contact-list svg{color:inherit}
.contact-list a{text-decoration:underline;text-underline-offset:3px}
.contact-list span{white-space:pre-line}
.form{display:grid;gap:14px}
.form label{display:grid;gap:6px;font-weight:600;font-size:.95rem}
.form input,.form textarea{font:inherit;padding:12px 14px;border:1px solid var(--border);border-radius:var(--r-btn);background:var(--bg);color:var(--text);width:100%}
.form-alt p{margin-bottom:1em}
.cta-band{max-width:780px}
.cta-card{max-width:860px;border-radius:var(--r);padding:clamp(28px,5vw,56px);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}
.bg-default .cta-card,.bg-surface .cta-card{background:var(--dark);color:var(--dark-text);border:0}
.bg-default .cta-card .lead,.bg-surface .cta-card .lead{color:inherit;opacity:.85}
.foot{display:grid;gap:20px}
.foot-cols{grid-template-columns:2fr 1fr;align-items:start}
.foot-brand{font-family:var(--fh);font-weight:700;font-size:1.2rem;margin-bottom:.4em}
.foot-links{display:flex;flex-wrap:wrap;gap:10px 22px}
.foot-cols .foot-links{flex-direction:column}
.foot-link{text-decoration:none;opacity:.85}
.foot-link:hover{opacity:1;text-decoration:underline}
.foot-copy{font-size:.9rem;margin:0;grid-column:1/-1;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent);padding-top:18px}
@media (max-width:860px){.hero-split,.two-col,.foot-cols{grid-template-columns:1fr}.gallery{grid-template-columns:repeat(2,1fr)}.hero-split .hero-media{order:-1}}
@media (max-width:520px){.gallery{grid-template-columns:1fr 1fr;gap:10px}.gallery-feature figure:first-child{grid-column:span 2;grid-row:auto}.btn-row .btn{flex:1 1 auto}.card,.plan,.quote{padding:22px}}
`;
}
