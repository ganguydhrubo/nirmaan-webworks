# ARCHITECTURE.md — Nirmaan Webworks

Decisions made during this build, the alternatives considered, and why. Cross-reference INFRASTRUCTURE.md for the underlying free-tier evidence.

## 1. Framework: Astro 7, static-first with a handful of dynamic API routes

**Decision:** Astro 7 (current stable — the brief's "Astro 6+" reference is now superseded; verified via `npm view astro version` at build time), TypeScript strict, `output: "server"` with every page individually opting into `export const prerender = true` except the four API routes and the two error-fallback pages that need real request data (`/enquiry-received`, `/enquiry-error`).

**Why not the older "hybrid" output mode:** Astro removed the separate `hybrid` output value; in current Astro, `server` + per-page `prerender` is the documented replacement and does exactly what the brief asked for (static-first, dynamic only where needed).

**Why not a full SPA framework:** the brief explicitly forbids shipping a heavy framework site-wide. Astro ships zero JS by default per component; every interactive bit here is a hand-written vanilla-TS island loaded via a plain `<script src="...">`, not a component framework runtime.

## 2. Host: Cloudflare Workers (with static assets), not Pages, not Vercel

**Decision:** `@astrojs/cloudflare` adapter, deployed as a Worker with a static-assets binding (`ASSETS`), not Cloudflare Pages.

**Vercel Hobby — explicitly disqualified.** Its free tier's terms restrict it to personal, non-commercial projects; this is a commercial business site. Not a judgment call — a terms violation regardless of traffic volume.

**Why Workers over Pages:** by 2026 Cloudflare has been consolidating Pages functionality into Workers with static assets (this is also reflected in `@astrojs/cloudflare`'s current build output, which targets a Worker + assets directory, not a Pages-specific format). Workers with assets gives one deployment target, one binding model for D1/KV, and one place to reason about the free-tier request quota, rather than splitting reasoning across Pages Functions and Workers.

## 3. Lead persistence: D1, not Supabase, not KV

**D1 over Supabase:** Supabase's free-tier projects pause after 7 days of inactivity. A brochure site's enquiry volume can plausibly go a week without a submission, especially pre-launch or in a slow month — and the one thing this system must never do is silently drop a lead because the database went to sleep. D1 has no such pause.

**D1 over KV for rate limiting:** Workers KV's free write quota (~1,000/day) is too low to use as a counter store — a single moderately-trafficked day of enquiry attempts (legitimate and abusive) could exhaust it on its own, breaking rate limiting exactly when it's needed most. D1's write quota (~100k rows/day) has enormous headroom for this by comparison. See INFRASTRUCTURE.md for the exact current figures and how they were verified.

**Schema:** `migrations/0001_init.sql` — `leads`, `spam_log` (bot hits never touch the `leads` table), `email_quota_daily` (provider-quota awareness), `rate_limit_counters` (generic scope+bucket counters), `analytics_events`. IP addresses are never stored raw — only a salted SHA-256 hash (`src/lib/ip.ts`), which is enough to rate-limit and de-duplicate without retaining an identifying value (DPDP data-minimisation, see RESEARCH.md).

## 4. The retry cron is a second, separate Worker

**Problem:** Astro's Cloudflare adapter builds a Worker that exports `fetch`; as of this adapter version it doesn't expose a way to also export a `scheduled` handler for a Cloudflare Cron Trigger.

**Alternative considered:** patch the generated `dist/_worker.js`/`dist/server/entry.mjs` post-build to bolt on a `scheduled` export. Rejected — fragile, breaks silently on adapter upgrades, and hides an important piece of logic inside a build-output patch instead of source.

**Decision:** `workers/retry-worker.ts` + `wrangler.retry.jsonc` — a small, independent Worker sharing the same D1 database binding, deployed separately, with its own Cron Trigger (every 30 minutes). It sweeps `leads` for `email_status IN ('failed','pending')`, retries via the same `EmailProvider` abstraction used by the main API route, and marks rows `abandoned` after 5 attempts. See DEPLOYMENT.md for the two-worker deploy sequence.

## 5. Email: Resend, behind a provider interface

**Decision:** `EmailProvider` interface (`src/lib/email/types.ts`) with a `ResendEmailProvider` implementation. `EMAIL_PROVIDER=resend|smtp|none` selects the implementation at runtime; `smtp` is defined in the interface but intentionally unimplemented (throws a clear "not implemented" error) — swapping in Brevo/MailerSend/ZeptoMail/SES means writing one class and changing one line in `createEmailProvider`, no other file changes.

**Why Resend first:** no card required, single-endpoint API (simplest integration surface of the alternatives), and its 100/day + 3,000/month caps comfortably exceed a new site's expected volume. See INFRASTRUCTURE.md for the comparison against Brevo/MailerSend/ZeptoMail/SES.

**Quota-never-drops-a-lead design:** a lead is inserted into D1 *before* any email attempt. If D1 insert fails, the email is still attempted and the email body is explicitly flagged `not_persisted` so the business owner knows this email is the only record. If email fails, the lead is still `received` in D1 and gets swept by the retry worker. The request only returns a hard failure to the visitor if *both* D1 and email failed — see `src/pages/api/enquiry.ts` steps 8-11 and Section 8.5 of the brief, implemented literally as a dependency-failure matrix in code, not just as a design intention.

## 6. Turnstile: fails open, never blocks a genuine lead

**Decision:** `src/lib/turnstile.ts` distinguishes three outcomes: `verified` (token checked out with Cloudflare), `unverified` (a token was submitted and Cloudflare explicitly rejected it — likely a bot, blocked), and `skipped` (no secret configured, or no token reached the server — e.g. the widget script failed to load). `skipped` and network/5xx failures degrade to a *stricter* rate limit rather than blocking the submission outright. This distinction matters: collapsing "no token" and "rejected token" into one bucket would either block real visitors whose ad-blocker or slow connection killed the Turnstile script, or let bots through by fail-opening too broadly. Getting this specific branch right was the difference between a captcha that occasionally eats a real lead and one that doesn't.

## 7. Rate limiting

Three independent D1-backed counters (`src/lib/rate-limit.ts`): per-IP-hash per hour, per-phone per day, and a global per-hour ceiling sized to protect the Resend daily quota. All three tighten automatically (a configurable multiplier) when Turnstile is degraded, so the system's abuse resistance scales down gracefully rather than binary-failing when one defence layer is unavailable.

## 8. Design tokens and the "AI slop" avoidance

Two self-hosted font families for the main brand (Fraunces/Manrope), subset to Latin **and** Latin Extended-A — not just Latin — because U+20B9 (₹) lives in the extended block and is silently absent from Google Fonts' default Latin subset. Missing this would have meant every price on the site rendering the rupee sign in a fallback font, a small but real-looking-cheap visual bug on a site whose whole pitch is craft.

Warm terracotta/marigold/teal palette on a cream base, explicitly not the black/grey "corporate" palette nor the purple-blue gradient associated with generic AI-generated sites. Contrast ratios were computed (not eyeballed) for every text/background pairing actually used — see the comment block in `src/styles/global.css` and AUDIT.md for the numbers, including the one meaningful correction it produced (brand-500 was too low-contrast at 4.32:1 for small text/button labels, so solid buttons use the darker brand-600 at 6.01:1 instead; brand-500 is reserved for large text and accents).

## 9. The six demo sites each get their own type pairing and palette, defined centrally

**Decision:** rather than let each demo source and self-host its own fonts independently, `scripts/fetch-google-fonts.mjs` (a small reusable tool, not a one-off script) fetches static per-weight woff2 files for any Google Font family, and all six demo palettes are pre-defined as Tailwind theme tokens in the shared `global.css`. This was a deliberate parallelisation decision: six demo sites were built concurrently by separate agents, and pre-provisioning the shared, cross-cutting pieces (fonts, palettes, the thin `DemoLayout.astro` wrapper with its noindex meta and honest "demo site" disclosure banner) meant none of the six builds needed to touch a shared file, eliminating merge conflicts between them by construction rather than by coordination.

## 10. AI: off by default, per the brief

`AI_PROVIDER=none` is the shipped configuration. No runtime AI dependency exists anywhere in the request path — not the enquiry form, not a chatbot, not a "smart preview" feature. The env schema supports `gemini|groq|none` for a future, deliberately justified use case, but none was identified during this build that would clear the bar in Section 9 of the brief (a materially conversion-improving use that isn't better solved deterministically). Build-time authoring used AI as a drafting aid for demo content, which is a local workflow with no production environment variable, per the brief's own distinction.

## 11. Inbound Acquisition & Demo Conversion Architecture

Understanding how Indian MSMEs actually convert informs the technical architecture:

- **Organic Inbound Local Search vs. Direct Referral:**
  - *Local Search Intent:* Indian business owners search locally ("web design agency near me", "website designer for clinic in Jaipur"). The architecture serves this via pre-rendered, crawlable static pages, strict schema.org `LocalBusiness` / `ProfessionalService` structured data with verified geo-coordinates, area served, and full NAP consistency (see `src/lib/seo.ts` and `GOOGLE-BUSINESS.md`).
  - *Direct & Peer Referral:* Indian MSME purchasing is word-of-mouth and WhatsApp-forwarded. A prospect is sent a link directly by a peer or sees an agency link on another business's footer. The site is optimized for sub-second mobile LCP on low-tier 4G connections without hydration lag.

- **Demo Conversion Funnel:**
  - Rather than generic portfolio mockups, the six industry demos (`/demos/*`) act as active conversion funnels. Each demo features a persistent demo utility bar (`DemoLayout.astro`) that allows prospects to test the experience, switch between industries, or trigger "Build a site like this".
  - Clicking this CTA navigates to `/contact?demo=<slug>&service=<category>#enquiry`, automatically pre-filling the inquiry form with the prospect's industry context.
  - Alternatively, visitors on mobile can immediately launch the WhatsApp flow with a pre-populated message specifying the demo they are exploring, capturing high-intent leads who prefer instant messaging over forms.

## 12. What's still open

This build is a **deployment-ready repository**, not a live deployment — see README.md for why (no real Cloudflare/GitHub/Resend accounts or domain were available to this build). Everything that requires a live account (the real D1 database ID, live Turnstile keys, DNS records, an actual test email landing in a real inbox) is documented precisely in DEPLOYMENT.md but not executed. AUDIT.md is the honest record of what was and wasn't verified end-to-end.
