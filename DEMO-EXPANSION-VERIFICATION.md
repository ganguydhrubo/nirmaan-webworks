# DEMO-EXPANSION-VERIFICATION.md — 15-demo expansion, final verification

Verified 15 September 2026. This closes out the handoff in `Codex-6-New-Demo-Sites-Prompt.docx` and the subsequent continuation record. All six researched-but-unbuilt categories from RESEARCH.md Part 3 (scores 111, 110, 107, 103, 97, 95 /190) now have a working demo, alongside the original nine. **All 15 researched industry categories now have a working demo.**

## What shipped in this pass

The handoff left three demos unfinished: Sunday Objects (retail) had uncommitted source, Torque District (automotive) was built but unregistered, and Clearline Diagnostics (diagnostics labs) didn't exist yet. All three are now complete, registered, tested and committed:

- **Sunday Objects** (`/demos/sunday-objects`, retail-d2c) — Kochi homewares catalogue with category filtering and an accessible native-dialog quick view.
- **Torque District** (`/demos/torque-district`, automotive) — Pune showroom/workshop with a `:has()`-driven inspection checkpoint explorer and a service-brief price builder.
- **Clearline Diagnostics** (`/demos/clearline-labs`, diagnostics-labs) — Chandigarh diagnostics lab with a searchable test directory and a report-structure walkthrough. Preparation/turnaround facts for the CBC entry are grounded directly in [Dr Lal PathLabs' published CBC test page](https://www.lalpathlabs.com/test/pathology/complete-blood-count/delhi) (see RESEARCH-DEMO-EXPANSION.md §15 for the exact quotes and the rest of the sourcing). No accreditation, real-lab status or diagnostic interpretation is claimed anywhere on the page.

## Bugs found and fixed during verification

These were found by actually running the full test/QA/Lighthouse sweep, not assumed:

1. **Production build was broken** — a commit landed between sessions with `querySelector<T>()` generics that collide with Cloudflare's ambient `Element` type during `astro check` on inline `<script>` blocks (see commit `b0c3883`). Caught via a failed Vercel deployment, fixed, verified green.
2. **StudioShell's header CTA** was hardcoded to `#visit` regardless of its label — Repwork Studio's "Find your first class" and Sunday Objects' "Explore the edit" both jumped past the section they promised. Added a `ctaHref` prop, pointed each at its real destination.
3. **`?message=` query param dropped on handoff** — Meridian Advisory and Sunday Objects build a `?message=` link for per-item enquiries, but `enquiry-form.ts` never read it. Now prefilled (verified end-to-end: see below).
4. **Decorative "®"** next to the fictional "sunday objects" wordmark — removed; a fictional demo claiming registered-trademark status is the same class of problem the disclosure banner exists to prevent.
5. **Three real WCAG 2.5.3 failures** caught by the Lighthouse accessibility audit, not by inspection:
   - The shared demo banner's WhatsApp link (`DemoLayout.astro`) had an aria-label that didn't literally contain its visible text "Ask on WhatsApp" — affects all 15 demos.
   - `StudioShell`'s wordmark link had the same class of mismatch — replaced the synthesized aria-label with a visually-hidden "— home" suffix appended to the real slotted text, which can't drift out of sync the way a separately-authored label can.
   - Sunday Objects' three "Quick view" buttons had an aria-label ("Quick view The soft form vase") completely unrelated to their visible text ("Take a closer look ↗") — reworded to include it.
   - Sunday Objects' orange "seal" badge had 4.42:1 text contrast (needs 4.5:1) — darkened the text from `#242515` to `#17130a` (now 5.27:1, computed and verified, not eyeballed).
6. **Two pre-existing, unrelated test bugs** in `tests/e2e/smoke.spec.ts`, found while running the full suite for the first time this session: a title regex (`/atittle\.com/i`) that never matched the site's actual title format, and a stale trailing-slash path against this site's `trailingSlash: never` config. Fixed.
7. **Homepage's "we measure this site" section** was showing Lighthouse numbers measured against a local dev server with a caveat telling readers not to trust them — re-measured against live production and updated (see the separate ICP-audit commit `1aa0eab` for detail; noted here because it's part of the same "verify what's actually shipped" work).

## Lighthouse — mobile, simulated throttling, against a production-equivalent build

Measured by building the Cloudflare target (`npm run build:preview`) and serving it locally with `wrangler dev --local`, the same server/Chrome/settings for every page — not the dev server, whose toolbar contaminates accessibility audits. Raw scores, not rounded up:

| Demo | Category | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| Shivalik Homes | real-estate | 97 | 98 | 100 | 69 | 2439ms | 0.012 |
| Kayal Backwaters | hotels-resorts | 95 | 100 | 100 | 69 | 2472ms | 0.009 |
| Sanjeevani Clinic | healthcare-clinics | 91 | 100 | 100 | 69 | 1859ms | 0.173 |
| Manthan Institute | education-coaching | 97 | 96 | 100 | 69 | 2106ms | 0.050 |
| Ivory Smiles | dental-clinics | 95 | 98 | 100 | 69 | 2402ms | 0.001 |
| Anaar — Awadhi Table | restaurants-cafes | 93 | 100 | 100 | 69 | 2620ms | 0.0002 |
| Sunehri Atelier | jewellery | 98 | 100 | 100 | 66 | 1871ms | 0.00003 |
| Aangan / Form | interior-design | 98 | 100 | 100 | 66 | 1870ms | 0.00007 |
| Mogra House | salon-spa | 97 | 100 | 100 | 66 | 2050ms | 0.00002 |
| **Meridian Advisory** | professional-services | **99** | **100** | **100** | 66 | 1739ms | 0.0006 |
| **Repwork Studio** | fitness-studios | **98** | **100** | **100** | 69 | 2060ms | 0.004 |
| **Saanjh Stories** | events-photography | **93** | **100** | **100** | 69 | 2734ms | 0 |
| **Sunday Objects** | retail-d2c | **98** | **100** | **100** | 69 | 2074ms | 0.0004 |
| **Torque District** | automotive | **96** | **100** | **100** | 69 | 2324ms | 0.002 |
| **Clearline Diagnostics** | diagnostics-labs | **99** | **100** | **100** | 69 | 1714ms | 0.003 |

**SEO is 66–69 across every demo, by design** — every demo carries `noindex, nofollow` (see `SEO.md`), and "Page isn't blocked from indexing" is one of the ~13 scored SEO audits; losing it caps the category regardless of anything else on the page. This isn't a defect, on any demo, old or new.

**Baseline comparison, per the handoff's requirement:** the 6 new demos (93–99 performance, 100 accessibility on every one) sit fully within — and on accessibility, above — the range set by the original 9 (91–98 performance, 96–100 accessibility). Nothing regressed.

**Pre-existing, out of scope:** Shivalik Homes (98), Ivory Smiles (98) and Manthan Institute (96) each have one remaining accessibility audit failure unrelated to anything touched this session or in the demo-expansion work. Not investigated further here — flagging so it isn't mistaken for something this pass introduced.

**Limitation:** simulated mobile throttling on a local Cloudflare Workers emulation (Miniflare), not a real edge deployment. Directionally reliable for comparing pages against each other and against the pre-expansion baseline; treat absolute numbers as indicative, consistent with how this repo already caveats local-vs-production Lighthouse runs (see `src/data/performance.ts`).

## Interaction & accessibility QA actually run (not assumed)

All of the following were executed against the running build, not inferred from reading the code:

- **Full Playwright suite** (`npx playwright test`, all 8 specs including the 2 new Clearline-specific ones) — **8/8 passing** against the production-equivalent build.
- **`npx astro check`** — 0 errors, 163 files. **`npx tsc -p tsconfig.client.json`** — clean. **`npx vitest run`** — 51/51.
- **Saanjh Stories gallery dialog**: Enter opens it, ArrowRight advances the image, Escape closes it and restores focus to the link that opened it, and with JavaScript disabled the gallery links point directly at full-size images instead of `#`.
- **Clearline test directory**: search-by-name and category-filter both correctly narrow the visible rows and update the live status text.
- **Clearline report walkthrough**: clicking a report-sheet row opens and scrolls to its matching explanation.
- **Torque District inspection selector**: keyboard arrow-key navigation through the radio group correctly swaps the visible checkpoint panel; the `@supports selector(:has(*))` fallback shows all three panels when `:has()` is unavailable.
- **No-JS pass** on Clearline and Sunday Objects (`javaScriptEnabled: false`): every test/product row and every explanation `<details>` is present in the DOM and opens natively via `<details>`/`<summary>` — nothing depends on JavaScript to be reachable.
- **Reduced-motion pass** on Sunday Objects and Clearline (`reducedMotion: 'reduce'`): zero active CSS/Web Animations on load, confirming `studio-foundation.css`'s blanket kill-switch works for both new demos.
- **320px-width horizontal-overflow check** on all 6 new demos: `scrollWidth − clientWidth === 0` on every one.
- **Enquiry handoff round-trip**: followed a real Clearline "Ask about a directory like this" link end-to-end into `/contact` and confirmed both `category` (via the select) and `message` (via the textarea) arrive prefilled.
- **`/demos` and `/industries` index pages**: all 15 cards present, correctly labelled, correct images (confirmed via direct HTTP 200 on every card.jpg — an initial "broken image" reading from an unscrolled screenshot was a lazy-load timing artifact in the check itself, not a real defect; documented here so it isn't rediscovered as a false alarm next time).

## Still open (not done in this pass, listed so it isn't assumed complete)

- The three pre-existing accessibility audit failures on Shivalik Homes, Ivory Smiles and Manthan Institute noted above.
- `src/data/performance.ts`'s homepage/Anaar numbers reflect a separate re-measurement (commit `1aa0eab`) against `webjobs-site.vercel.app`, not this Cloudflare local build — the two are different targets by design (see `ARCHITECTURE.md`) and aren't expected to match exactly.
- No visual/manual review beyond the automated checks above was done at 200% text zoom, though the fluid type scale and `sd-wrap` clamp()-based spacing used throughout make severe breakage unlikely.
