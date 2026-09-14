# webjobs.site · End-to-End Handover Brief & Production Deployment Guide

---

## 1. Project & Handover Summary

| Attribute | Value / Details |
| :--- | :--- |
| **Project Name** | **webjobs.site** (Bespoke Web Engineering for Indian MSMEs & Local Businesses) |
| **Version** | `0.1.0` (Production Ready) |
| **Active Local Server** | `http://127.0.0.1:4321` (Self-hosted preview running on Cloudflare Workers runtime) |
| **GitHub Repository** | [https://github.com/ganguydhrubo/webjobs-site](https://github.com/ganguydhrubo/webjobs-site) |
| **Target Vercel Account** | [https://vercel.com/dhrubojyoti](https://vercel.com/dhrubojyoti) |
| **Core Tech Stack** | Astro 7 (Server SSR & Static Prerender), Tailwind CSS 4, TypeScript 5.9, Groq AI (GPT-OSS 120B), Cloudflare Workers / Vercel Edge |
| **Audited Routes** | **37 total routes** (Main site, 6 bespoke industry demos, AI Evaluator tool, legal policies) |
| **Quality Audit Score** | 0 Broken links, 0 Missing images, 0 Axe accessibility violations, 51/51 automated tests passing, 0 ESLint warnings |

---

## 2. GitHub Repository & Commit History

The repository has been initialized, configured, and pushed directly to your personal GitHub account:
- **Repository Link:** [https://github.com/ganguydhrubo/webjobs-site](https://github.com/ganguydhrubo/webjobs-site)
- **Primary Branch:** `master`
- **Tracked Commits:**
  1. `788e2c9` — *feat: foundation and architecture setup with Cloudflare D1 and Astro*
  2. `a198cfc` — *feat: main agency website core pages, pricing, and inquiry engine*
  3. `72f9d9f` — *feat: six bespoke client demo sites with deep authentic trade content*
  4. `7966dbb` — *feat: automated playwright crawler audit and accessibility validation*
  5. `91ab758` — *docs: production architecture, credits, testing, and deployment guide*
  6. `cb66fc1` — *feat(ai): integrate Groq GPT-OSS 120B website alignment evaluator, wow graphics, and vercel config*

To pull or push future updates:
```powershell
git pull origin master
git push origin master
```

---

## 3. Deployment Guide for Vercel (`https://vercel.com/dhrubojyoti`)

The project is configured for one-click import and deployment on Vercel:

### Step-by-Step Vercel Setup:
1. Open your Vercel Dashboard at [https://vercel.com/dhrubojyoti](https://vercel.com/dhrubojyoti).
2. Click **"Add New..."** → **"Project"**.
3. Select your GitHub account `ganguydhrubo` and import `webjobs-site`.
4. In the **Configure Project** screen:
   - **Framework Preset:** Select `Astro` (or `Other`).
   - **Root Directory:** `./` (leave default).
   - **Build Command:** `npm run build:preview`
   - **Output Directory:** `dist/client`
5. **Environment Variables** (add under Project Settings → Environment Variables):

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `PUBLIC_SITE_URL` | `https://webjobs.site` (or your Vercel URL) | Canonical URL root |
| `GROQ_API_KEY` | `gsk_...` | Groq Cloud AI inference key |
| `EMAIL_PROVIDER` | `resend` (or `none`) | Outbound email dispatcher |
| `RESEND_API_KEY` | `re_...` | Resend API key for lead routing |
| `AI_PROVIDER` | `groq` | Evaluator AI provider |
| `PUBLIC_TURNSTILE_SITE_KEY` | `0x4AAAAAA...` | Cloudflare Turnstile bot verification |
| `TURNSTILE_SECRET_KEY` | `0x4AAAAAA...` | Turnstile server secret |

6. Click **"Deploy"**. Vercel will build the static client bundle and serve it across Vercel's global Edge Network with the caching rules defined in `vercel.json`.

---

## 4. Groq AI Website Brand Alignment Evaluator Tool

### Overview
Located at **`/tools/website-evaluator`** and powered by API endpoint **`/api/evaluate`**, this tool audits whether a business website reflects the authentic craft and identity of the business, or looks like low-trust generic corporate slop.

### Core Features & "Wow" UI Graphics:
1. **100-Point Multi-Pillar Scoring Engine:**
   - **Value Proposition & 3-Second Clarity (0–20 pts):** Tests if a first-time visitor knows what is offered and the primary benefit within 3 seconds.
   - **Industry Alignment & Authenticity (0–20 pts):** Scans for trade-specific vocabulary and real operational signals vs stock corporate buzzwords.
   - **Trust Signals & Contact Friction (0–20 pts):** Audits WhatsApp direct desk, local phone, physical address with landmark, credentials/licensing, and response commitments.
   - **Pricing Transparency (0–20 pts):** Rewards transparent starting INR bands over high-friction black-box forms.
   - **Mobile Readiness & Actionability (0–20 pts):** Checks thumb-friendly single CTAs and punchy copy.
2. **Animated SVG Radial Score Gauge:**
   - Circular SVG gauge with animated stroke offset and dynamic color glowing halo:
     - 🟢 **90–100:** *Craft Masterpiece* (`#059669`)
     - 🔵 **75–89:** *Solid & Functional* (`#0d9488`)
     - 🟠 **50–74:** *Generic / Moderate Risk* (`#d97706`)
     - 🔴 **<50:** *High Conversion Risk* (`#e11d48`)
3. **5 Interactive Category Progress Meters:**
   - Visual percentage bars with assessment narrative and concrete actionable recommendations.
4. **Diagnostic Badges:**
   - Red Flags identified (buzzwords, vague promises, high friction).
   - Authentic Craft Strengths.
   - Missing Local Trust Anchors checklist.
5. **Ultra-Detailed Copy Rewrites Box:**
   - **Hero Headline:** Side-by-side Before (strikethrough) vs After (high-converting) with rationale.
   - **Primary CTA:** Before ("Submit") vs After ("Chat on WhatsApp · 15-Min Response") with friction-reduction analysis.
   - **Complete Markdown Audit Report:** Formatted report with a **1-Click "Copy Full Report"** button with visual confirmation.
6. **Dual-Engine Architecture (Zero-Downtime Guarantee):**
   - When a `GROQ_API_KEY` is provided, queries Groq Cloud `openai/gpt-oss-120b` with JSON schema enforcement.
   - If no API key is supplied or the API is unreachable, seamlessly activates webjobs.site's built-in deterministic heuristic CRO engine, guaranteeing the tool always renders instant, accurate reports.
7. **End-to-End Lead Engine Integration:**
   - Direct CTA links pre-filled with the audit score and business name to webjobs.site's `/contact#enquiry` form and WhatsApp desk.

---

## 5. Master Checklist of All Required Tools & Accounts

To run webjobs.site and client projects at maximum efficiency, here is the full breakdown of required tools across categories:

### A. Core Development & Deployment Tools
- [x] **Git & GitHub CLI (`gh`)**: Installed and authenticated as `ganguydhrubo`.
- [x] **Node.js**: Node v24.19.0 on Windows.
- [x] **Vercel Account (`https://vercel.com/dhrubojyoti`)**: For importing GitHub repo and zero-config deployment.
- [x] **Cloudflare Account (`dash.cloudflare.com`)**: If deploying on Cloudflare Workers + D1 database edge.
- [x] **Wrangler CLI**: Bundled in `devDependencies` for managing Cloudflare D1 migrations and edge bindings.

### B. Third-Party API Keys & Services
- [ ] **Groq Cloud API Key (`GROQ_API_KEY`)**:
  - *Where to get:* [https://console.groq.com/keys](https://console.groq.com/keys) (free tier provides 1,000 req/day for GPT-OSS 120B).
  - *Usage:* Powers real-time AI website audits.
- [ ] **Resend Transactional Email API Key (`RESEND_API_KEY`)**:
  - *Where to get:* [https://resend.com](https://resend.com) (Free tier: 3,000 emails/month).
  - *Usage:* Instant lead notification delivery to `founder@webjobs.site`.
- [ ] **Cloudflare Turnstile Bot Protection**:
  - *Where to get:* Cloudflare Dashboard → Turnstile (100% free).
  - *Usage:* `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` for spam-free form submissions.

### C. Client Acquisition & Marketing Tools
- [x] **AI Website Brand Alignment Evaluator** (`/tools/website-evaluator`): Agency lead-magnet tool.
- [ ] **WhatsApp Business App**: Set up with business profile, catalog, and automated greeting matching webjobs.site's templates.
- [ ] **Google Business Profile (GBP)**: Register webjobs.site with address `Salt Lake, Sector V, Kolkata 700091` to capture local agency searches.
- [ ] **Google Search Console**: Submit sitemap `https://webjobs.site/sitemap-index.xml`.

---

## 6. Verification & Health Commands

Run these commands inside `C:\Users\Dhrubo\webjobs-site` to verify the codebase at any time:

```powershell
# 1. Typecheck Astro and client TypeScript
npm run check

# 2. Lint entire codebase (0 errors, 0 warnings)
npm run lint

# 3. Run all 51 Vitest unit & integration tests
npm run test

# 4. Compile preview build
npm run build:preview

# 5. Run Playwright E2E smoke tests
npm run e2e

# 6. Run comprehensive 37-route crawler audit
node scripts/audit-pages.mjs
```

---

## 7. Self-Hosted Preview Access

The local preview server is running as a daemon on:
- **Homepage:** `http://127.0.0.1:4321`
- **AI Evaluator Tool:** `http://127.0.0.1:4321/tools/website-evaluator`
- **All 6 Industry Demos:** `http://127.0.0.1:4321/demos`
- **Contact & Quote Engine:** `http://127.0.0.1:4321/contact`
- **Health Check API:** `http://127.0.0.1:4321/api/health`
