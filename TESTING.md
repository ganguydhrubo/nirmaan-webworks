# TESTING.md — Quality Assurance & Testing Architecture

This document outlines the test strategy, automated test suites, quality audit tooling, and verification procedures for **atittle.com**.

---

## 1. Quality Architecture Overview

The testing pyramid is organized into four complementary layers:

1. **Static Quality & Type Safety:**
   - Astro compiler checks (`astro check`)
   - TypeScript strict client typechecking (`tsc -p tsconfig.client.json`)
   - ESLint 9 flat configuration (`npm run lint`) across all TypeScript and script files
   - Release configuration validator (`scripts/validate-release.mjs`)

2. **Unit & Integration Testing (Vitest):**
   - Pure domain logic tests (phone validation, email providers, IP hashing)
   - Lead capture integration tests using in-memory mock D1 SQLite databases
   - Quota tracking, deduplication, atomic locking, and DPDP retention sweeps

3. **End-to-End Browser Testing (Playwright):**
   - Full browser interaction testing against local Wrangler preview builds
   - Navigation, form submission validation, and interactive demo widgets

4. **Automated Site-Wide Quality Audit (`scripts/audit-pages.mjs`):**
   - Comprehensive crawl of all 37 pre-rendered and dynamic routes
   - Automated Axe Core accessibility audit (critical and serious violations)
   - Broken link and missing anchor verification
   - Image loading and 404 detection
   - Responsive horizontal overflow audits across 9 viewport widths (320px to 1920px)

---

## 2. Running Automated Tests

### Unit & Integration Tests (Vitest)
```bash
npm run test
```
All tests run in watchless CI mode and complete in under 2 seconds. The suite covers:
- `tests/unit/email.test.ts`: Provider abstraction, error fallbacks, SMTP stubbing.
- `tests/integration/enquiry.test.ts`: Form validation, honeypot trapping, turnstile degradation, quota enforcement, deduplication within 15 minutes, and atomic claim locking.

### ESLint 9
```bash
npm run lint
```
Lints `.ts`, `.mjs`, and `.js` files using modern ESLint flat configuration.

### End-to-End Tests (Playwright)
Ensure the preview server is running on port 4321:
```bash
# In terminal 1:
npm run build:preview
npm run preview -- --port 4321

# In terminal 2:
npm run e2e
```

### Full Page Quality Audit
```bash
node scripts/audit-pages.mjs
```
Generates detailed JSON report at `test-results/page-audit.json` and desktop/mobile full-page screenshots in `test-results/`.

---

## 3. Automated Page Audit Coverage

The crawler audits 37 distinct routes across the application:
- **Core Marketing Pages:** `/`, `/about`, `/contact`, `/pricing`, `/work-process`, `/faq`, `/404`, `/privacy`, `/terms`, `/refund-policy`
- **Industry Landing Hubs:** `/industries`, `/industries/real-estate`, `/industries/hotels-resorts`, `/industries/healthcare-clinics`, `/industries/education-coaching`, `/industries/dental-clinics`, `/industries/restaurants-cafes`
- **Demos Directory:** `/demos`
- **Shivalik Homes (Real Estate):** `/demos/shivalik-homes`, `/demos/shivalik-homes/projects`, `/demos/shivalik-homes/projects/shivalik-meadows`, `/demos/shivalik-homes/projects/shivalik-ridge-residences`, `/demos/shivalik-homes/projects/shivalik-vista`
- **Kayal Backwaters (Resort):** `/demos/kayal-backwaters`
- **Sanjeevani Clinic (Healthcare):** `/demos/sanjeevani-clinic`
- **Manthan Institute (Coaching):** `/demos/manthan-institute`, `/demos/manthan-institute/courses`, `/demos/manthan-institute/faculty`, `/demos/manthan-institute/admissions`
- **Ivory Smiles (Dental):** `/demos/ivory-smiles`, `/demos/ivory-smiles/treatments`, `/demos/ivory-smiles/dentist`, `/demos/ivory-smiles/contact`
- **Anaar Awadhi Table (Fine Dining):** `/demos/anaar-awadhi-table`, `/demos/anaar-awadhi-table/menu`, `/demos/anaar-awadhi-table/our-story`, `/demos/anaar-awadhi-table/reservations`

### Evaluation Criteria per Route:
- **HTTP Status:** Must be 200 OK.
- **Title & Description:** Must have descriptive `<title>` and `<meta name="description">`.
- **Headings:** Must have exactly one `<h1>`.
- **Accessibility:** Zero `critical` or `serious` Axe Core violations.
- **Images:** Zero broken or missing images (`naturalWidth > 0`).
- **Responsive Overflow:** Zero horizontal scroll across 320px, 360px, 390px, 412px, 768px, 1024px, 1280px, 1440px, and 1920px viewports.
- **Internal Links:** Zero 404s and zero broken anchor hashes.

---

## 4. Manual QA Checklist

For release verification, verify the following interactive behaviors:

| Flow / Feature | Verification Steps | Expected Result |
|---|---|---|
| **WhatsApp Direct CTAs** | Click WhatsApp buttons on mobile/desktop | Opens WhatsApp with pre-filled message matching context |
| **Mobile Drawer Navigation** | Click hamburger on mobile viewports (<768px) | Drawer slides in, traps focus, ESC key closes drawer |
| **Kayal Stay Planner** | Select dates and submit stay planner | Calculates nights and total INR without server roundtrip |
| **Shivalik EMI Calculator** | Adjust loan amount, rate, tenure | Real-time recalculation of monthly EMI and interest split |
| **Ivory Smiles Smile Slider** | Drag the comparison handle left and right | Reveals before and after states smoothly |
| **Anaar Menu Dietary Filter** | Toggle "Vegetarian" and dietary tags | Dishes filter instantly with animated state transitions |
| **Progressive Enhancement** | Disable JavaScript and submit enquiry form | Form posts to `/api/enquiry` and redirects to `/enquiry-received` |
