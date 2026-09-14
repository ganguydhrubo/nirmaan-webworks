# SEO.md

## Indexability decision: main site indexed, all six demos noindexed

The six `/demos/<slug>/**` sites are marked `noindex, nofollow` via `DemoLayout.astro`'s meta tag and excluded from the sitemap (`astro.config.mjs`'s `@astrojs/sitemap` `filter`), but are **not** blocked in `robots.txt`. This is deliberate and follows Google's own guidance: blocking a page in `robots.txt` prevents a crawler from ever fetching it, which means it never sees the `noindex` directive and can still index the URL from external links with no snippet. Allowing the crawl but noindexing the page is the correct way to keep a page out of the index while still letting link equity and crawl budget flow normally to the rest of the site.

**Why noindex at all:** the six demos are large, content-rich sites for fictional businesses in the same six categories as the real, indexable `/industries/[slug]` pages. Indexing both would mean Google choosing between two competing pages per category on the same domain — diluting rather than reinforcing the main site's authority for "website design for [industry] India" queries, which is exactly the search intent this project needs to win. The `/industries/[slug]` pages are the intended indexable landing surface per category; the demos are a conversion tool linked *from* them, not a parallel SEO asset.

## What's implemented

- **Semantic HTML/headings:** one `<h1>` per page, no skipped heading levels (checked manually per page during the build; not yet run through an automated heading-order linter — see TESTING.md open items).
- **Per-page metadata:** `BaseLayout.astro` takes `title`/`description` per page (no shared default text duplicated across pages), builds a canonical URL from `Astro.url.pathname`, and sets Open Graph + Twitter card tags. Title/description length budgets (≤60/≤155 chars) were followed by eye during authoring but not yet machine-checked — see TESTING.md.
- **Canonical URLs:** `<link rel="canonical">` on every page via `BaseLayout`, built from `siteConfig.siteUrl` so it's correct regardless of preview-deployment hostnames.
- **Structured data (JSON-LD):** `src/lib/seo.ts` provides `Organization`, `WebSite`, and `ProfessionalService` (LocalBusiness) on every page via `BaseLayout` (Organization/WebSite/LocalBusiness are sitewide, so they're injected globally rather than per-page), plus page-specific `Service` and `BreadcrumbList` on industry pages and `FAQPage` on `/faq`. **Not yet run through Google's Rich Results Test** — this requires a live, publicly reachable URL, which this deployment-ready-repo-only build doesn't have; DEPLOYMENT.md flags this as a required post-deploy step.
- **Sitemap:** `@astrojs/sitemap`, filtered to exclude `/demos/*`, `/api/*`, and the two enquiry-flow fallback pages. Generated at `dist/client/sitemap-index.xml` on every build.
- **robots.txt:** static file at `public/robots.txt`, allows everything except `/api/`, references the sitemap.
- **Indian search intent targeting:** each `/industries/[slug]` page's `metaTitle`/`metaDescription` (in `config/site.ts`) and body copy (`src/content/industries.ts`) are built around the query patterns identified in RESEARCH.md — category + "website design" + "India", cost/price queries, and a `localSeoBlurb` per industry naming the actual search patterns being targeted (e.g. "[condition] treatment in [city]" for clinics). Not keyword-stuffed — each blurb reads as a normal sentence.
- **lang/charset/viewport:** `lang="en-IN"` on `<html>`, UTF-8, standard responsive viewport meta, `theme-color`.
- **404 handling:** `src/pages/404.astro` — helpful links, not a dead end, correctly served with a 404 status by Astro/Cloudflare's static routing convention.
- **Internal linking:** every `/industries/[slug]` page links to its demo, two sibling industries, `/pricing`, and `/contact`; every demo's disclosure banner links back to `/contact` with the category/demo pre-filled. Footer links every industry and every policy page from every page on the main site.

## Known gaps (see AUDIT.md for the full list with severity)

- **No generated OG image per page.** All pages currently share one `og-default.jpg` reference (`src/layouts/BaseLayout.astro`'s `ogImage` prop defaults to it) — a per-page-type generated 1200×630 image was scoped in the brief but not built in this pass. The image itself also doesn't exist yet (see AUDIT.md — it's a referenced-but-not-yet-created asset, tracked there rather than silently shipped broken).
- **Structured data not validated against Google's Rich Results Test** (requires a live URL — see DEPLOYMENT.md's post-deploy checklist).
- **No trailing-slash canonicalization rule has been explicitly configured** at the Cloudflare edge; Astro's own routing is consistent (no trailing slash) but the production `_redirects`/edge config for enforcing this across www/non-www and trailing slash is a DEPLOYMENT.md step, not yet executed against a live zone.
- Title/description character-length budgets were followed by eye, not machine-verified.
