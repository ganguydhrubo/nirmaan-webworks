# ATITTLE Free AI Website Builder

Routes: `/free-website-builder` (landing, indexed) · `/free-website-builder/app` (editor, noindex) · `/free-website-builder/hosting-guide` (indexed) · `/free-website-builder/template-preview/<id>.html` (static template renders, noindex) · `POST /api/builder/generate` (AI).

## 1. Architecture (and why)

OpenPage (MIT, https://github.com/buildingopen/openpage) was evaluated as the foundation. It is a standalone Vite + React 19 SPA (React Router, zustand, dnd-kit) with a JSON-first site model. Integrating it wholesale would have meant a second router and a React runtime inside an Astro site with zero React, and its exporter had gaps we would have shipped to users:

- exports only the single-page `blocks` array (multi-page sites lose every page but one),
- 6 of its 19 block types render as `<!-- Unknown block -->` in exports,
- exported pages depend on the Tailwind Play CDN (not meant for production),
- link URLs are escaped but not scheme-checked (`javascript:` passes),
- the editor canvas renders blocks directly in the app's own DOM with container queries, so the canvas and the exported site are different code paths.

So we took **option C**: reuse OpenPage's *design* (JSON document of typed sections, variants, theme presets, three-pane editor) and write our own renderer, exporter, editor and AI pipeline. Credits: `CREDITS.md`.

```
src/lib/builder/           shared, framework-free (runs on server, in the editor and in tests)
  catalog.ts               section types + field specs  -> validation, properties panel, AI prompt
  schema.ts                SiteDoc + normalizeDoc(): the single gate for AI output, imports, saved projects
  sanitize.ts              escaping, safeHref/safeImageSrc, slugs
  themes.ts                8 presets, font allowlist, contrast-safe accent text
  render.ts                SiteDoc -> HTML/CSS (editor preview AND export use this one renderer)
  export.ts, zip.ts        file set + dependency-free ZIP writer (zip-slip safe) + pre-download checklist
  templates.ts             10 working starter templates
  ai.ts, options.ts        brief/edit validation (zod), prompts, fact guards, post-processing
  quota.ts                 per-visitor + global daily AI limits
src/lib/ai/chat-provider.ts  provider chain: Groq -> Gemini -> OpenRouter (OpenAI-compatible APIs)
src/pages/api/builder/generate.ts   generate site | edit whole site | edit one section
src/scripts/builder/       Preact editor island (client:only, loaded only on /free-website-builder/app)
  store.ts                 immutable doc state, undo/redo (coalesced typing), actions
  Canvas.tsx, preview.ts   sandboxed iframe preview + postMessage bridge (inline editing, selection)
  persistence.ts, autosave.ts  IndexedDB projects, revisions/conflicts, backups
  Editor/LeftPanel/Properties/Onboarding/App.tsx, builder.css
```

The editor bundle (Preact + renderer + templates) is ~142 KB raw / ~45 KB gzip and is only requested by the editor page. The landing page ships one tiny inline script (iframe scaling).

## 2. AI reliability (v2, 2026-10-17)

### Root causes found in production logs

1. **Only one provider in production.** Vercel production had `GROQ_API_KEY` only; `GEMINI_API_KEY` / `OPENROUTER_API_KEY` were never added, so every Groq failure ended with "no more providers". Logs show a visitor ("antagon") failing three times in a row this way.
2. **Groq's free tier is ~8,000 tokens/minute** for `openai/gpt-oss-120b` (verified from `x-ratelimit-*` headers), and requests asked for `max_tokens: 9000`, which Groq reserves against that window — so after one or two generations everyone got HTTP 429.
3. **Groq JSON mode rejects some of its own output** (`400 json_validate_failed`) even when it's usable; it was treated as a hard failure.
4. Failed requests still consumed the visitor's free allowance, so retries ran them out faster.

### Policy now (`src/lib/ai/chat-provider.ts`)

| Situation | Behaviour |
|---|---|
| 429 / 5xx / timeout (transient) | Provider cooled down (Retry-After or rate-window reset, else 20 s); next provider tried. On the *last* eligible provider, one bounded wait if Retry-After ≤ 8 s. |
| 401/403, 402 no credits, 404 model, 400 bad request (permanent) | Provider benched 10 min; never retried for that request. |
| Groq `json_validate_failed` | `failed_generation` is salvaged, parsed and validated; only if unusable → next provider. |
| Output fails validation / quality gate | Next provider (one call each, never loops). |
| Groq rate window can't fit the request | Groq is skipped *before* calling (reads `x-ratelimit-remaining-tokens`). |
| Every provider cooling down | Try the one that recovers soonest (unless all are misconfigured). |

Plus: one overall deadline (≤56 s, inside Vercel `maxDuration: 60`), realistic `max_tokens` (4.8K generate, 2.5K section edit, 5.5K site edit), **request ids** (a retry after a dropped connection gets the cached answer, no second paid call), **one AI request in flight per visitor**, **failed requests refunded**, and a deterministic **quality gate** (`src/lib/builder/quality.ts`) that rejects headline-less/thin output and repairs monotone backgrounds, repeated layouts, broken page links, empty items and contrast.

Measured after the fix (local, real keys, 6 varied briefs incl. Hindi): **6/6 succeeded**; Groq 2.6–3.5 s, Gemini 14–30 s when Groq's window was full (skipped without a wasted call) or when Groq returned bad JSON.

### Configuration

| Variable | Purpose | Default |
|---|---|---|
| `GROQ_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` | Text providers | — |
| `XAI_API_KEY` + `BUILDER_XAI_MODEL` | Optional Grok/xAI provider (used only when both are set — no unverified default model) | — |
| `BUILDER_AI_PROVIDERS` | Order | `groq,gemini,openrouter,xai` |
| `BUILDER_GROQ_MODEL` / `BUILDER_GEMINI_MODEL` / `BUILDER_OPENROUTER_MODELS` | Overrides | `openai/gpt-oss-120b` / `gemini-flash-latest` / 3 free models |
| `BUILDER_IMAGE_PROVIDERS` | Image provider order | `gemini,openrouter` |
| `BUILDER_GEMINI_IMAGE_MODELS` / `BUILDER_OPENROUTER_IMAGE_MODEL` | Image models | `gemini-3.1-flash-image,gemini-2.5-flash-image` / `google/gemini-3.1-flash-lite-image` |
| `BUILDER_AI_DAILY_LIMIT_PER_IP` / `_GLOBAL` | Free text AI requests per day | `8` / `150` |
| `BUILDER_IMAGE_DAILY_LIMIT_PER_IP` / `_GLOBAL` | Free AI images per day | `4` / `40` |
| `BUILDER_ADMIN_TOKEN` | Enables `GET /api/builder/health` (Bearer auth); unset = endpoint 404 | — |
| `IP_HASH_SALT` | Visitors counted by salted hash, never raw IP | (existing) |

### Observability

One JSON log line per request: `{"event":"builder_ai"|"builder_image", requestId, mode, ok, ms, provider, model, attempts, trace:[{provider, model, ms, ok, error|skipped, salvaged}], quality:[codes], error, kind}` — no prompts, IPs, keys or document content. `GET /api/builder/health` (admin token) shows per-provider availability from **real recent outcomes** (success rate, last error, cooldown), image availability and limits. Instance-local on serverless.

## 2b. AI images

- Real image models only (`src/lib/ai/image-provider.ts`): Gemini `generateContent` with `responseModalities: ["IMAGE"]` (image read from `parts[].inlineData`), OpenRouter `modalities: ["image","text"]` (image from `message.images[].image_url`). A text-only answer is never treated as an image; bytes are signature- and dimension-checked; the browser re-encodes to a web-size JPEG stored as a project asset with `source: "ai"` and the prompt.
- **Status (verified 2026-10-17 with this project's keys): unavailable.** Gemini returns 429 `GenerateRequestsPerDayPerProjectPerModel-FreeTier` (free tier has no image quota; ~15 h retry delay); OpenRouter returns 402 "never purchased credits" and has no free image models. **To enable: turn on billing for the Google AI Studio project of `GEMINI_API_KEY`, or buy OpenRouter credits.** No code change needed; the provider is re-tried after its cooldown.
- Until then the editor shows an honest "AI image generation is unavailable" notice, and offers Upload, Your images (library) and **Illustration** — theme-coloured abstract artwork rendered locally, always labelled "Illustration", never as a photo.
- Licensed stock photos (Unsplash/Pexels) are **not integrated**: no API keys are configured and scraping is off-limits. The image tab design leaves room for it.

## 2c. Design system

12 design directions (`src/lib/builder/themes.ts`) — editorial, SaaS, corporate, studio, luxury, minimal, vibrant, local, hospitality, dark-tech, organic, playful — each a full token set: 10-colour palette (incl. secondary), heading/body fonts from a 25-font registry (incl. Devanagari: Mukta, Hind, Noto Serif Devanagari), corners, button shape, card style, content width, heading style, type scale, motion. Palettes are contrast-repaired (body text ≥ 4.5:1, aiming 7:1). The AI plans a `design` block first; Hindi content automatically gets Devanagari fonts and `lang="hi"`. New layouts: editorial hero, numbered services, a Steps/How-it-works section, "Glow" gradient and "Dots" pattern backgrounds, decorative hero accents, and CSS scroll-reveal that never hides content (animates only while entering; off for reduced motion; no JavaScript in exports).

### Libraries evaluated (licences checked 2026-10-17 on GitHub)

| Library | Licence | Decision |
|---|---|---|
| OpenPage | MIT | Design reference (JSON-first model) — see §1 |
| shadcn/ui | MIT | Not adopted: React + Radix + Tailwind component source; our editor is Preact with ~50 KB gzip total, and exported sites must be dependency-free HTML. Patterns (segmented controls, dialogs with focus trap) implemented natively. |
| Magic UI | MIT | Not adopted: React + motion library; AGENTS.md forbids heavyweight animation runtimes. Equivalent effects (reveal, glow backgrounds) done in CSS. |
| React Bits | MIT **+ Commons Clause** | Not adopted: not a pure open-source licence, React-only. |
| Aceternity UI | Custom licence | **Not allowed**: its licence prohibits "template creation … themes, templates, or derivative products" — a website builder is exactly that. |
| Uppy | MIT | Evaluated; not needed: uploads are processed fully in the browser (no upload server exists), and the native drop-zone with validation/re-encoding is a few KB vs Uppy's dashboard bundle. |

## 3. Saving & accounts (current limitation)

ATITTLE has no user accounts and the Vercel deployment has no database, so the builder runs in **guest mode**: projects are stored in the visitor's own browser (IndexedDB), with autosave (1.2 s debounce), saving/saved/failed/conflict states, multi-tab conflict detection (revisioned writes), and a downloadable/importable project backup file. Nothing is stored on ATITTLE servers. The UI states this plainly.

To add cloud saving later: an auth provider (e.g. email magic links via Resend once `atittle.com` is verified) + a `builder_projects(id, owner_id, doc_json, rev, updated_at)` table (D1 on Cloudflare, or a hosted DB on Vercel) + `GET/PUT /api/builder/projects/:id` that derives the owner from the session (never from the request body) and checks `owner_id` on every read/write, plus the same revision check `persistence.ts` already does client-side. The `ProjectRecord` shape and `normalizeDoc` gate are already in place.

## 4. Security model

- **Untrusted documents**: every document (AI, import, storage) goes through `normalizeDoc`; unknown types/fields dropped, strings bounded, links restricted to `page:`, `#anchor`, `http(s)`, `mailto:`, `tel:`; images to `https` raster URLs or validated uploads; theme values to hex colours / allowlisted fonts. The renderer escapes everything again (defence in depth). Unit tests cover XSS payloads in every channel.
- **Preview isolation**: the canvas is an iframe with `sandbox="allow-scripts"` (no `allow-same-origin`) → opaque origin; plus a CSP (`default-src 'none'`, only the bridge script, images, Google Fonts; `form-action 'none'`). The parent accepts messages only from that iframe's window. E2E test asserts the frame can't reach the parent document.
- **Exports** contain no JavaScript, no editor attributes, no project metadata, no keys. ZIP paths are generated, never user-supplied, and validated against traversal.
- **Uploads**: JPEG/PNG/WebP/GIF only, signature-checked, re-encoded in the browser (strips EXIF/GPS), ≤1.5 MB each. SVG never accepted.
- **AI endpoint**: JSON-only, 80 KB body cap, zod validation before any quota is spent, per-visitor + global quota, keys server-side only (bundle scan in the delivery checks), provider error bodies logged server-side but never returned to the browser. Prompts frame user text as data.
- **No fabricated facts**: contact details come only from what the user typed (AI output is overwritten), testimonials are always flagged "Sample" until the user unticks it, invented opening times are dropped, and the pre-download checklist warns about sample/placeholder content.

## 5. Deploying

Nothing in this branch deploys itself. To ship on Vercel (current production):

1. Add env vars to the Vercel project (Production): `GEMINI_API_KEY`, `OPENROUTER_API_KEY` (Groq is already set). Optionally the `BUILDER_*` limits.
2. Merge the branch / `npx vercel deploy --prod`.
3. Smoke test: `/free-website-builder` → Create → generate → edit → Download → open `index.html`; `/api/health` unaffected.
4. Rollback: redeploy the previous Vercel deployment ("Promote to Production" on the prior build). The feature is self-contained; removing it means reverting this branch (no data migrations exist).

On Cloudflare (when D1 is provisioned), quota counters automatically become durable via the existing `rate_limit_counters` table — no migration needed.

## 6. Tests

- `npx vitest run` — `tests/unit/builder.test.ts` (sanitising, normalisation, rendering/XSS, export, ZIP round-trip and traversal, templates) and `tests/unit/builder-ai.test.ts` (provider chain fallback/bounds/key routing, fact guards, quota).
- `npx playwright test tests/e2e/builder.spec.ts` (needs the dev server) — landing/SEO, template → inline + panel editing, undo/redo, sections add/duplicate/delete/reorder, theme, autosave + reload, pages + canvas navigation, ZIP download → extract → open from disk on a phone viewport, mocked AI success/quota errors (double-click sends one request), server input limits, sandbox isolation, mobile editor. `BUILDER_REAL_AI=1` adds one real generation.
- Note: Playwright's own `click()` ignores the preview iframe's CSS scale; the spec uses a `clickInCanvas` helper. Real browsers hit-test correctly.

## 7. Known limitations

- Guest mode only (see §3); projects don't sync across devices without the backup file.
- Vercel quota counters are per serverless instance (no shared store there); provider quotas are the hard backstop.
- Free provider tiers bound real capacity: Groq ≈ 1 generation/minute (8K TPM); Gemini Flash free tier and OpenRouter free models add headroom but are slower. AI images need a paid tier (see §2b).
- Exported sites are static: forms need a third-party form service URL; no booking/payments/database.
- No automatic GoDaddy publishing (manual upload guide only; no credentials are ever requested).
- The editor works on phones (tabbed panes) but is most comfortable on a laptop/tablet.
- No licensed stock-photo integration (no Unsplash/Pexels keys). Empty image slots show a deliberate theme-coloured block; illustrations are available.
