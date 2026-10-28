# ATITTLE.COM — Acceptance Criteria & Quality Gates

## Gate Status Summary
| Quality Gate | Description | Status | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Gate A: Baseline** | Existing architecture, routes, features, and test baseline documented | **PASS** | Vitest baseline captured, repo audited, project ledger established |
| **Gate B: Design System** | Brand tokens implemented and applied consistently with strict template isolation | **PENDING** | Global tokens in `global.css` & `builder.css` |
| **Gate C: Template Marketplace** | Search, filtering, categories, live previews, selection, and customization | **PENDING** | Rich marketplace in `/free-website-builder` & `/templates` |
| **Gate D: Wix-Inspired Visual Editor** | Selection, inline text editing, drag-and-drop, reordering, layers, properties | **PENDING** | `Canvas.tsx`, `LeftPanel.tsx`, `Properties.tsx` |
| **Gate E: Persistence & Output** | Reload survival, autosave, clean static HTML/CSS export, custom domain publish | **PENDING** | `export.ts`, `publish.ts`, `persistence.ts` |
| **Gate F: Regression & QA** | All existing demos, calculators, forms, widgets work without error | **PENDING** | Playwright & Vitest automated test suite |
| **Gate G: Production Deployment** | Production build passes and verified live on https://atittle.com | **PENDING** | Cloudflare Pages deployment verified live |

---

## Detailed Acceptance Checklist

### 1. Template Marketplace
- [ ] Template search works by keyword, category, and style.
- [ ] Industry categories (SaaS, Agency, Corporate, Restaurant, Real Estate, Healthcare, Portfolio, Local Services, Ecommerce, Coaching).
- [ ] Each template features high-resolution, legal imagery from Unsplash/Pexels with responsive modern formats.
- [ ] Responsive device switchers (desktop 1280px, tablet 768px, mobile 390px) render accurate previews.
- [ ] One-click "Customize in Editor" loads the exact template into the visual editor without data loss.

### 2. Visual Website Editor
- [ ] Hover and click selection reliably selects sections, blocks, and child elements.
- [ ] No invisible layers or scaled iframe transform coordinate bugs block user interaction.
- [ ] Inline text editing reflects immediately with proper caret position and auto-debounced history snapshot.
- [ ] Property panel allows editing fonts, font sizes, colors, margins/padding, button links, and image URLs.
- [ ] Drag-and-drop section reordering with clear drop-target indicators and keyboard accessible up/down fallbacks.
- [ ] Add new section dialog contains categorized pre-built blocks (hero, features, testimonials, pricing, contact, FAQ, gallery).
- [ ] Multi-page management: Add, rename, duplicate, delete pages.
- [ ] Undo and redo reliably steps through user edits (Ctrl+Z / Ctrl+Y).

### 3. Data Persistence & Export
- [ ] Changes persist to `localStorage` immediately; reloading the page restores full project state.
- [ ] Export generates clean, valid HTML5 + CSS3 + images ZIP package with zero vendor lock-in.
- [ ] 1-Click Domain Connect & Cloudflare SaaS custom hostnames function truthfully.

### 4. Non-Regression & Quality
- [ ] Zero AI API dependency for the core editor and marketplace.
- [ ] Existing routes (`/`, `/services`, `/pricing`, `/demos`, `/demos/shivalik-homes`, `/demos/meridian`) remain 100% operational.
- [ ] All unit and E2E tests pass.
