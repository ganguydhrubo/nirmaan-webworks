# NIRMAAN WEBWORKS (ATITTLE.COM) — FULL HANDOVER DOCUMENTATION

**Project Name:** Nirmaan Webworks (`atittle`)  
**Production URL:** [atittle.com](https://atittle.com)  
**Handover Date:** September 19, 2026  
**Stack:** Astro 7.3+ · Tailwind CSS v4 · TypeScript 5.9 · Cloudflare Pages & D1 · Playwright & Vitest  

---

## 1. Executive Summary & Brand Identity

**Nirmaan Webworks** is a high-end web design and digital engineering studio dedicated to India’s top tier of independent businesses, boutique hotels, premium medical clinics, coaching institutes, and luxury retail brands.

- **Single Source of Truth:** All business facts (company name, WhatsApp number, email, phone, address, pricing tiers, and industry metadata) live strictly inside [`config/site.ts`](file:///C:/Users/Dhrubo/nirmaan-webworks/config/site.ts). Updating contact info or business configuration is a single-line edit that automatically updates the entire website, emails, and WhatsApp redirect handlers.
- **Design Philosophy:** Dark editorial palette (`#090d16` ink slate, `#fffbf5` warm cream, `#d97706` amber accents), tactile architectural aesthetics, Fraunces serif and Inter sans typography, fluid physics-based transitions, and 100% mobile-first engineering with 0px horizontal overflow.

---

## 2. Technical Architecture & Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | **Astro 7.3+ (SSR)** | Fast static rendering with on-demand SSR for dynamic lead capture and API endpoints. |
| **Edge Hosting & Runtime** | **Cloudflare Pages / Workers** | Deployed via `@astrojs/cloudflare` with `wrangler` CLI on Cloudflare's global edge. |
| **Database** | **Cloudflare D1 (SQLite)** | Serverless edge SQL database (`atittle_leads`) for enquiries, lead tracking, and audit logs. |
| **Styling** | **Tailwind CSS v4** | Modern `@tailwindcss/vite` setup with custom CSS design tokens and fluid typography. |
| **Client Scripts** | **TypeScript 5.9** | Strict type-checked client modules (`tsconfig.client.json`), no bloated third-party runtime dependencies. |
| **Audio Engine** | **Web Audio API** | Subtle graphite drafting sounds (`sketch.mp3`) with mute memory and reduced-motion compliance. |
| **Testing & QA** | **Playwright & Vitest** | Automated responsive tests across 360px, 375px, 390px, 412px, 1024px, and 1280px viewports. |

---

## 3. Core Features Delivered

### 3.1. All 15 Live Demo Websites Directory (`DemoDirectory.astro`)
Located at [`src/components/ui/DemoDirectory.astro`](file:///C:/Users/Dhrubo/nirmaan-webworks/src/components/ui/DemoDirectory.astro) (featured on the Homepage and `/demos`):
- **Dedicated Browser Frame Chrome Bar:** Every card features a macOS-style browser window header with subtle window dots (`red`, `yellow`, `green`).
- **Zero Collision Badge Placement:** Both the **Category Badge** (`REAL ESTATE`, `CLINICS`, etc.) and the **Live Site Pill** are housed inside the top chrome bar. They **never overlap or obscure** the website hero text or headings.
- **Ultra-Crisp Retina Previews (1152×864):** Replaced low-res 540×340 images and blurry `.webm` hover videos with uncompressed 1152×864 desktop showcase captures (`/images/showcase/${demo.slug}-desktop.webp`).
- **Smooth Elevation Lift (No Snap-Zoom Blur):** Eliminated aggressive `scale(1.08)` hover zooms that caused image blur and margin clipping. Cards smoothly elevate (`translateY(-4px)`) with an amber border highlight.
- **Clean Action Footer:** The callout `Explore Demo ↗` is cleanly situated in the card footer alongside the business city.

### 3.2. Tactile CAD Blueprint & Drafting Studio
Located at `/demos/shivalik-homes/` ([`src/scripts/demos/shivalik-homes-drafting.ts`](file:///C:/Users/Dhrubo/nirmaan-webworks/src/scripts/demos/shivalik-homes-drafting.ts)):
- **Interactive Drafting Canvas:** Clients can sketch, measure, and draft on a tactile architectural blueprint canvas.
- **Graphite Audio Sound FX:** Plays realistic pencil sketching audio effects (`public/audio/sketch.mp3`) with client volume control and mute preference persistence.
- **Clean Integration:** Standalone, high-performance canvas engine with zero external canvas library overhead.

### 3.3. Homepage Hero & Showcase Transitions
- **Pure Horizontal Scroll (`translateX`):** Clean, Apple/Inventiko-grade horizontal slide transitions across all 15 demo websites.
- **No Snap-Zoom Distortion:** Eliminated 3D perspective tilts and jarring snap zooms.
- **Responsive Floating Dock:** Quick navigation pill dock allowing clients to jump between live demos, services, pricing, and contact.

### 3.4. 100% Mobile Responsiveness (0px Overflow)
- Tested and verified on all viewport widths: **360px, 375px, 390px, 412px, 1024px, 1280px**.
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` across all pages.

---

## 4. The 15 Working Industry Demos

All demos are registered in [`config/site.ts`](file:///C:/Users/Dhrubo/nirmaan-webworks/config/site.ts) under `siteConfig.demoRegistry`:

| # | Industry Slug | Business Name | Category Name | City | Demo Route |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `shivalik-homes` | Shivalik Homes & Developers | Real Estate | Dehradun, UK | `/demos/shivalik-homes` |
| **2** | `kayal-backwaters` | Kayal Backwaters Resort | Hotels & Resorts | Alleppey, Kerala | `/demos/kayal-backwaters` |
| **3** | `sanjeevani-clinic` | Sanjeevani Multispecialty Clinic | Clinics | Nagpur, MH | `/demos/sanjeevani-clinic` |
| **4** | `manthan-institute` | Manthan Institute of Studies | Coaching Institutes | Kota, Rajasthan | `/demos/manthan-institute` |
| **5** | `ivory-smiles` | Ivory Smiles Dental Clinic | Dental Clinics | Indore, MP | `/demos/ivory-smiles` |
| **6** | `anaar-awadhi-table` | Anaar — The Awadhi Table | Restaurants | Lucknow, UP | `/demos/anaar-awadhi-table` |
| **7** | `sunehri-atelier` | Sunehri Atelier | Jewellery | Jaipur, Rajasthan | `/demos/sunehri-atelier` |
| **8** | `aangan-form` | Aangan / Form | Interior Design | Ahmedabad, Gujarat | `/demos/aangan-form` |
| **9** | `mogra-house` | Mogra House | Salon & Spa | Pune, MH | `/demos/mogra-house` |
| **10** | `meridian-advisory` | Meridian Advisory | Professional Services | Ahmedabad, Gujarat | `/demos/meridian-advisory` |
| **11** | `repwork-studio` | Repwork Studio | Fitness Studios | Bengaluru, Karnataka | `/demos/repwork-studio` |
| **12** | `saanjh-stories` | Saanjh Stories | Events & Photography | Jaipur, Rajasthan | `/demos/saanjh-stories` |
| **13** | `sunday-objects` | Sunday Objects | Retail & Boutiques | Kochi, Kerala | `/demos/sunday-objects` |
| **14** | `torque-district` | Torque District | Automotive | Pune, MH | `/demos/torque-district` |
| **15** | `clearline-labs` | Clearline Diagnostics | Diagnostics Labs | Chandigarh | `/demos/clearline-labs` |

---

## 5. Directory Structure & Key Files

```text
nirmaan-webworks/
├── config/
│   └── site.ts                    # THE single source of truth for business data & registry
├── public/
│   ├── audio/
│   │   └── sketch.mp3             # Tactile drafting graphite sound FX
│   ├── images/
│   │   ├── demos/                 # Industry demo assets
│   │   └── showcase/              # 1152x864 Retina showcase captures (*-desktop.webp)
│   └── favicon.svg                # Brand icon
├── src/
│   ├── components/
│   │   ├── layout/                # Header, Footer, MobileNav, MetaTags
│   │   ├── sections/home/         # Hero, IndustryShowcase, Process, Pricing, FAQ
│   │   └── ui/
│   │       ├── DemoDirectory.astro # The 15 Live Demo card grid with browser chrome
│   │       ├── DemoShowcase.astro  # Interactive showcase hero slider
│   │       └── FloatingDock.astro  # Bottom floating utility dock
│   ├── pages/
│   │   ├── index.astro            # Homepage
│   │   ├── demos/
│   │   │   ├── index.astro        # Demo directory index
│   │   │   └── [slug].astro       # Dynamic demo renderer
│   │   ├── industries/            # Industry landing pages
│   │   └── api/
│   │       └── enquiry.ts         # Edge lead submission & spam validator endpoint
│   ├── scripts/
│   │   └── demos/
│   │       └── shivalik-homes-drafting.ts # CAD blueprint drafting engine
│   └── styles/
│       └── global.css             # Tailwind v4 theme, fonts, custom properties
├── tests/
│   ├── e2e/
│   │   ├── responsive.spec.ts     # Multi-viewport overflow & layout verification
│   │   └── dock.spec.ts           # Navigation dock interactions
│   └── unit/                      # Validation and email tests
├── package.json                   # Scripts, Astro 7, Cloudflare adapter, dependencies
└── wrangler.json                  # Cloudflare D1 & Worker configuration
```

---

## 6. Development, Testing & Deployment Commands

Run all commands from the project root (`C:\Users\Dhrubo\nirmaan-webworks`):

### 6.1. Local Development
```bash
# Start Astro dev server on http://localhost:4321
npm run dev
```

### 6.2. Type Checking & Code Quality
```bash
# Run Astro check + TypeScript client compilation
npm run check

# Run ESLint
npm run lint
```

### 6.3. Production Build & Cloudflare Preview
```bash
# Build production bundle with Cloudflare Pages/Worker adapter
npm run build:preview

# Run local Cloudflare Worker emulation via Wrangler
npm run preview
# Accessible on http://localhost:4321
```

### 6.4. Automated Tests
```bash
# Run unit & integration tests
npm test

# Run responsive viewport tests
npm run test:responsive

# Run complete Playwright end-to-end suite
npm run e2e
```

### 6.5. Cloudflare D1 Database Migrations
```bash
# Apply migrations locally
npm run db:migrate:local

# Apply migrations to production Cloudflare D1
npm run db:migrate:remote
```

---

## 7. How to Maintain & Update the Site

### 7.1. Updating Contact Info & Business Facts
Open [`config/site.ts`](file:///C:/Users/Dhrubo/nirmaan-webworks/config/site.ts):
```typescript
export const siteConfig = {
  businessName: "Nirmaan Webworks",
  phoneDisplay: "+91 93303 93298",
  whatsappNumber: "919330393298",
  email: "hello@atittle.com",
  city: "Kolkata",
  // ...
};
```
Changes here automatically update the header, mobile call bar, WhatsApp deep links, enquiry confirmation emails, and footer metadata.

### 7.2. Adding or Modifying a Demo
1. Add the entry to `siteConfig.demoRegistry` in [`config/site.ts`](file:///C:/Users/Dhrubo/nirmaan-webworks/config/site.ts).
2. Place a high-resolution desktop capture (1152×864 WebP) in `public/images/showcase/${demo.slug}-desktop.webp`.
3. Create the demo page template in `src/pages/demos/${demo.slug}.astro`.
4. Run `npm run check` to ensure type integrity.

### 7.3. Adding the 10-Second Showreel Video
When your AI video is generated (e.g. from Runway Gen-3 or Kling):
1. Save the video as `public/videos/studio-showreel.webm` (and `.mp4`).
2. Add a poster frame at `public/images/studio-showreel-poster.webp`.
3. Drop the video element into the desired container:
```html
<div class="video-mockup-frame">
  <video
    src="/videos/studio-showreel.webm"
    poster="/images/studio-showreel-poster.webp"
    autoplay
    loop
    muted
    playsinline
    preload="auto"
    class="w-full h-full object-cover"
  ></video>
</div>
```

---

## 8. Verification & Quality Sign-Off

- **Astro & TypeScript Diagnostics:** 0 errors across all 204 files.
- **Mobile Viewport QA:** Exact 0px horizontal overflow on 360px, 375px, 390px, 412px, 1024px, and 1280px.
- **Card Collision QA:** Badges separated in dedicated browser chrome bar; 0 overlap with screenshot text.
- **Focus & Resolution QA:** 1152×864 Retina desktop screenshots; 0 snap-zoom distortion or video pixelation.
- **Audio Engine:** Operational graphite sound FX on `/demos/shivalik-homes` with client mute toggle.

*Nirmaan Webworks is production-ready for deployment to Cloudflare.*
