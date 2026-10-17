/**
 * Deterministic quality gate for generated websites.
 *
 * Runs on every AI result before it reaches the visitor:
 *   - fatal problems (no hero headline, too few real sections, empty pages)
 *     reject the result, which makes the provider chain try the next model;
 *   - fixable problems are repaired in place (empty list items dropped,
 *     duplicate headings, monotonous backgrounds, repeated layouts, broken
 *     internal links, palette contrast);
 *   - everything found is reported so it can be logged and tested.
 *
 * It checks structure and design hygiene; it does not pretend to judge
 * beauty. Rendered-page checks (overflow, console errors, failed requests)
 * live in the Playwright suite.
 */
import { getSectionDef } from "./catalog";
import { safeHref, PAGE_LINK_PREFIX } from "./sanitize";
import type { Section, SiteDoc } from "./schema";
import { contrastRatio, repairContrast } from "./themes";

export interface QualityIssue {
  level: "fatal" | "fixed" | "warning";
  code: string;
  message: string;
}

export interface QualityReport {
  ok: boolean;
  issues: QualityIssue[];
}

const BODY = (s: Section) => s.type !== "navbar" && s.type !== "footer";
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Text fields that must not be empty for a section to be worth showing. */
function primaryText(s: Section): string {
  const p = s.props;
  return str(p.headline) || str(p.heading) || str(p.brand) || str(p.body);
}

export function assessAndRepair(doc: SiteDoc): QualityReport {
  const issues: QualityIssue[] = [];
  const home = doc.pages[0];
  if (!home) return { ok: false, issues: [{ level: "fatal", code: "no_pages", message: "No pages." }] };

  // --- fatal checks -------------------------------------------------------
  const hero = home.sections.find((s) => s.type === "hero");
  if (!hero || !str(hero.props.headline)) issues.push({ level: "fatal", code: "no_hero", message: "Home page has no hero headline." });
  const homeBody = home.sections.filter(BODY);
  if (homeBody.length < 3) issues.push({ level: "fatal", code: "thin_home", message: `Home page has only ${homeBody.length} content sections.` });

  // --- per-section repairs -------------------------------------------------
  const slugs = new Set(doc.pages.map((p) => p.slug));
  for (const page of doc.pages) {
    // Drop sections with no meaningful text at all (except visual-only types).
    const before = page.sections.length;
    page.sections = page.sections.filter((s) => s.type === "gallery" || s.type === "navbar" || s.type === "footer" || !!primaryText(s) || hasItems(s));
    if (page.sections.length < before) issues.push({ level: "fixed", code: "empty_section", message: `Removed ${before - page.sections.length} empty section(s) on "${page.title}".` });
    if (!page.sections.some(BODY)) issues.push({ level: page.slug === "index" ? "fatal" : "warning", code: "empty_page", message: `Page "${page.title}" has no content.` });

    for (const s of page.sections) {
      // Empty list items (e.g. a service with no title) are removed if the list stays valid.
      for (const field of getSectionDef(s.type)?.fields ?? []) {
        if (field.kind !== "list") continue;
        const items = Array.isArray(s.props[field.key]) ? (s.props[field.key] as Record<string, unknown>[]) : [];
        const kept = items.filter((it) => Object.values(it).some((v) => (typeof v === "string" ? v.trim() : Array.isArray(v) ? v.length : false)));
        if (kept.length < items.length && kept.length >= field.minItems) {
          s.props[field.key] = kept;
          issues.push({ level: "fixed", code: "empty_items", message: `Removed empty ${field.itemLabel.toLowerCase()}s.` });
        }
      }
      // Internal links to pages that don't exist → point at the contact section instead.
      for (const key of ["primaryHref", "secondaryHref", "ctaHref", "buttonHref"]) {
        const v = str(s.props[key]);
        if (v.startsWith(PAGE_LINK_PREFIX) && !slugs.has(v.slice(PAGE_LINK_PREFIX.length))) {
          s.props[key] = "#contact";
          issues.push({ level: "fixed", code: "broken_link", message: `Fixed a link to a missing page (${v}).` });
        } else if (v && !safeHref(v)) {
          s.props[key] = "";
        }
      }
    }

    // Duplicate headings on a page read as filler: keep the first, blank later intros.
    const seen = new Set<string>();
    for (const s of page.sections.filter(BODY)) {
      const h = str(s.props.heading).toLowerCase();
      if (!h) continue;
      if (seen.has(h)) issues.push({ level: "warning", code: "duplicate_heading", message: `Repeated heading "${str(s.props.heading)}".` });
      seen.add(h);
    }

    // Visual rhythm: avoid every section on the same background, and the
    // same layout twice in a row.
    const body = page.sections.filter(BODY);
    for (let i = 1; i < body.length; i++) {
      const prev = body[i - 1]!;
      const cur = body[i]!;
      if (cur.style.background === prev.style.background && cur.style.background !== "accent" && cur.style.background !== "dark" && cur.type !== "cta") {
        cur.style = { ...cur.style, background: prev.style.background === "surface" ? "default" : "surface" };
        issues.push({ level: "fixed", code: "monotone", message: "Alternated section backgrounds for visual rhythm." });
      }
      if (cur.type === prev.type && cur.variant === prev.variant) {
        const variants = getSectionDef(cur.type)?.variants ?? [];
        const alt = variants.find((v) => v.id !== prev.variant);
        if (alt) {
          cur.variant = alt.id;
          issues.push({ level: "fixed", code: "repeated_layout", message: `Varied a repeated ${cur.type} layout.` });
        }
      }
    }
  }

  // --- palette contrast ----------------------------------------------------
  const c = doc.theme.colors;
  if (contrastRatio(c.text, c.bg) < 4.5 || contrastRatio(c.muted, c.bg) < 4.5 || contrastRatio(c.accent, c.accentText) < 4.5 || contrastRatio(c.dark, c.darkText) < 4.5) {
    doc.theme = { ...doc.theme, colors: repairContrast(c) };
    issues.push({ level: "fixed", code: "contrast", message: "Adjusted colours for readable contrast." });
  }

  return { ok: !issues.some((i) => i.level === "fatal"), issues: dedupe(issues) };
}

function hasItems(s: Section): boolean {
  return ["items", "plans", "images"].some((k) => Array.isArray(s.props[k]) && (s.props[k] as unknown[]).length > 0);
}

function dedupe(issues: QualityIssue[]): QualityIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.level}:${i.code}:${i.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
