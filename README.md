# webjobs.site

**Websites engineered for Indian businesses.**

webjobs.site is an engineering-first web design and development studio built specifically for Indian MSMEs, local service businesses, clinics, and hospitality providers.

Rather than selling vague agency promises or generic templates, webjobs.site demonstrates craft through six live, fully functioning websites across key Indian industries, transparent INR pricing, sub-second mobile performance, and a strict WhatsApp-first communication model.

---

## Key Features

1. **Six Interactive Industry Demos (`/demos/*`):**
   - **Shivalik Homes** (Real Estate & Builders, Dehradun): Interactive EMI calculator, RERA disclosures, floor plans, and site visit booking.
   - **Kayal Backwaters** (Hotels & Resorts, Alleppey): Indicative stay planner, room specifications, experience showcase, and direct inquiry booking.
   - **Sanjeevani Clinic** (Healthcare & Doctors, Nagpur): Doctor credentials, OPD consulting schedules, clinical focus areas, and appointments.
   - **Manthan Institute** (Education & Coaching, Kota): Batch details, fee structures, faculty profiles, and scholarship information.
   - **Ivory Smiles** (Dental Clinics, Indore): Treatment pricing catalog, interactive before/after smile comparison slider, aftercare guides, and dentist hours.
   - **Anaar — The Awadhi Table** (Restaurants & Fine Dining, Lucknow): Full digital menu with dietary filters, culinary story, and table reservations.

2. **Lead Engine Reliability & Quota Guard:**
   - **Never-Drop-A-Lead Architecture:** Submissions persist to Cloudflare D1 before sending emails. Even during network partitioning or provider outages, inquiries remain safely stored in D1.
   - **Atomic Claim Locking:** `workers/retry-worker.ts` claims rows atomically (`UPDATE ... WHERE id = ? AND email_status = 'pending'`) to avoid duplicate sends across concurrent cron sweeps.
   - **Deduplication:** Submissions with identical phone/email and payload within 15 minutes are idempotently deduplicated.
   - **Multi-layered Quota Protection:** Tracks daily (100) and monthly (3,000) caps against Resend free tier limits.
   - **Degraded Protection:** When Turnstile is offline or unavailable, in-memory flood protection and strict D1 rate limits automatically tighten.

3. **DPDP Act 2023 / DPDP Rules 2025 Privacy Architecture:**
   - Plain-English notice at data collection points.
   - Unbundled, affirmative consent checkboxes.
   - Salted SHA-256 IP hashing (`IP_HASH_SALT`) — raw IP addresses are never retained.
   - Purpose limitation and automatic 365-day lead retention sweeps via `cleanupOldRecords`.

4. **Performance & Accessibility Excellence:**
   - Pre-rendered, edge-cached static pages with Astro 7 and Cloudflare Workers.
   - Zero heavy framework client runtimes — vanilla TypeScript interactive islands only.
   - Self-hosted Google Fonts subset to Latin + Latin Extended-A (supporting the `₹` rupee symbol, U+20B9).
   - Strict WCAG 2.1 AA accessibility and contrast compliance verified via automated Axe Playwright audits.

---

## Tech Stack

- **Framework:** [Astro 7](https://astro.build/) (`output: "server"` with per-page `export const prerender = true`)
- **Hosting & Compute:** [Cloudflare Workers](https://workers.cloudflare.com/) via `@astrojs/cloudflare`
- **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless SQL with SQLite dialect)
- **Email:** [Resend](https://resend.com/) via clean `EmailProvider` interface
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) with semantic color tokens and typography pairings
- **Testing & Quality:** [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/), [Axe Core](https://www.deque.com/axe/), [ESLint 9](https://eslint.org/)

---

## Project Structure

```text
webjobs-site/
├── config/                  # Site configuration and industry/demo registry
├── migrations/              # Cloudflare D1 database migrations
├── public/                  # Static assets (fonts, icons, demo cards, OG images)
├── scripts/                 # Build validators, audit runner, image processors
├── src/
│   ├── assets/              # Optimized source images for Astro Image
│   ├── components/          # Astro UI sections, forms, and layout components
│   ├── content/             # Data collections for industry demos
│   ├── layouts/             # BaseLayout (marketing) and DemoLayout (demos)
│   ├── lib/                 # Core utilities (leads, rate limit, turnstile, email)
│   ├── pages/               # Routing (marketing site, industry hubs, demos, API)
│   └── styles/              # Global styles, Tailwind configuration, design tokens
├── tests/
│   ├── e2e/                 # Playwright end-to-end browser tests
│   ├── integration/         # D1 lead capture & API endpoint tests
│   └── unit/                # Pure business logic and email provider tests
└── workers/                 # Scheduled retry worker for offline email sweeps
```

---

## Local Development & Testing

### Prerequisites
- Node.js >= 20.0.0 (tested on Node 24.19.0)
- Cloudflare Wrangler CLI

### Setup & Installation
```bash
# Clone the repository
git clone <repository-url>
cd webjobs-site

# Install dependencies
npm install

# Run database migrations locally
npm run db:migrate:local
```

### Development Scripts
| Command | Description |
|---|---|
| `npm run dev` | Starts Astro development server |
| `npm run build:preview` | Validates config and builds local preview distribution |
| `npm run preview` | Starts local Cloudflare Worker preview server with D1 binding |
| `npm run check` | Runs Astro compiler checks and TypeScript typechecking |
| `npm run lint` | Runs ESLint 9 across all TypeScript and script files |
| `npm run test` | Runs Vitest unit and integration test suite |
| `npm run e2e` | Runs Playwright E2E browser tests against preview |
| `node scripts/audit-pages.mjs` | Automated 37-route crawler checking Axe a11y, images, links, & overflow |

---

## Deployment

Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions, including D1 database provisioning, Turnstile security keys, Resend DNS records (SPF/DKIM), and two-worker deployment sequence.

---

## License & Credits

- All code is released under the proprietary license of webjobs.site.
- Fonts (Fraunces, Manrope, Spectral, Cormorant, Outfit, Domine, Sora, Playfair Display) are licensed under SIL Open Font License 1.1.
- Complete image and asset provenance is documented in [CREDITS.md](CREDITS.md).
