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

## 2. Configuration

| Variable | Purpose | Default |
|---|---|---|
| `GROQ_API_KEY` | Provider 1 (already used by the Website Evaluator) | — |
| `GEMINI_API_KEY` | Provider 2 (Gemini OpenAI-compatible endpoint) | — |
| `OPENROUTER_API_KEY` | Provider 3 (free models; slowest) | — |
| `BUILDER_AI_PROVIDERS` | Order of the chain | `groq,gemini,openrouter` |
| `BUILDER_GROQ_MODEL` / `BUILDER_GEMINI_MODEL` / `BUILDER_OPENROUTER_MODELS` | Model overrides | `openai/gpt-oss-120b` / `gemini-flash-latest` / 3 free models |
| `BUILDER_AI_DAILY_LIMIT_PER_IP` | Free AI requests per visitor per UTC day | `5` |
| `BUILDER_AI_DAILY_LIMIT_GLOBAL` | Across all visitors per day | `60` |
| `IP_HASH_SALT` | Visitors are counted by salted hash, never raw IP | (existing) |

Chain behaviour: each request has one overall time budget (≤56 s, inside Vercel's `maxDuration: 60`). A provider that rate-limits, errors, times out, or returns output that fails validation (e.g. an incomplete site) is skipped and the next one gets the remaining budget. At most one call per configured provider — no loops. Every call logs one line: `{"event":"builder_ai","mode":…,"provider":…,"attempts":…,"tokens":…}` — no prompts, IPs or content.

Measured on 2026-10-17 (local dev, real keys): Groq 2.4–3.8 s per site, Gemini ~13.6 s, OpenRouter free models ~51 s. One run showed the fallback live: Groq rejected its own JSON, Gemini completed the site.

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
- Free provider tiers bound real capacity (Groq's free gpt-oss-120b allowance is roughly a few dozen generations/day shared with the Evaluator; Gemini and OpenRouter add headroom).
- Exported sites are static: forms need a third-party form service URL; no booking/payments/database.
- No automatic GoDaddy publishing (manual upload guide only; no credentials are ever requested).
- The editor works on phones (tabbed panes) but is most comfortable on a laptop/tablet.
- No stock photo library: image slots show a soft colour block until the user uploads or links an image.
