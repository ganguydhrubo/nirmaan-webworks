# ATITTLE.COM — Repository & Reference Framework Audit

## 1. Internal Repository Inventory
- **Project Root:** `C:\Users\Dhrubo\nirmaan-webworks`
- **Active Git Branch:** `master`
- **Framework:** Astro 7.3.2, Preact 10.29.8, Tailwind CSS 4.3.3, TypeScript 5.9.3, Vitest 3.2.4, Playwright 1.63.0.
- **Licence:** Proprietary (ATITTLE commercial product).

---

## 2. Investigation of External Reference Projects
The master prompt requested an audit of 12 external projects/repositories:

| Repository / Reference | Category | Evaluation & Architectural Decision |
| :--- | :--- | :--- |
| **OpenPage** (`buildingopen/openpage`) | Visual Website Builder | MIT License. Built for full-page web generation. Useful patterns: clean component block schema and property panel layout. Extract UI layout and section structure patterns without bloating bundle. |
| **Puck** (`puckeditor/puck`) | Visual Editor | MIT License. Excellent drag-and-drop mechanics and render-time component contract. Heavy React dependency; adopting entire package directly would conflict with our lightweight Preact runtime. Extract drag-and-drop indicator UX and section reorder concepts. |
| **GrapesJS** (`GrapesJS/grapesjs`) | Visual Canvas Engine | BSD-3-Clause. Powerful canvas manipulation but legacy DOM architecture, large bundle footprint (1MB+), and difficult responsive style synchronization with modern Tailwind CSS. Not recommended as a core dependency; adopt its coordinate calculation and selection ring patterns. |
| **Webstudio** (`webstudio-is/webstudio`) | Modern Visual Builder | AGPL/Commercial. Too restrictive licensing for proprietary SaaS integration, complex monorepo infrastructure. Study its responsive breakpoint UI and typography controls. |
| **Plasmic** (`plasmicapp/plasmic`) | Design Tool | Complex multi-tier cloud compiler. Incompatible with zero-cost edge deployment. |
| **UIUXLabz & Free HTML Templates** | Templates | Legally usable layout ideas for diverse business categories: Real Estate, Restaurant, SaaS, Clinic, Law Firm, Agency, Education. |
| **Wix Website Builder & Gallery** | Product UX Reference | Industry benchmark for user expectations: clear left toolbar (Add, Sections, Pages, Theme), intuitive 8-point bounding boxes, transparent preview mode, and instant mobile view toggle. |

---

## 3. Selected Architectural Path
Rather than destabilizing the working application by grafting an incompatible 100MB external dependency like GrapesJS or Puck, the superior architectural approach is:
1. **Strengthen the Native Deterministic Builder Engine (`src/scripts/builder/`):**
   - Fix the selection coordinate/transform offset bugs in `Canvas.tsx` and `preview.ts`.
   - Upgrade `Properties.tsx` to offer comprehensive Wix-grade visual styling (font family picker, font size slider, line-height, letter-spacing, padding/margin controls, background colors, border radius, and link pickers).
   - Add drag-and-drop section reordering with real-time drop indicator lines in both the canvas and the left panel layers tree.
2. **Expand the Native Template Catalog to 20+ Production-Grade Templates:**
   - Add image-rich, complete templates across SaaS, Corporate Advisory, Medical Clinic, Real Estate Estate, Architecture Studio, Boutique Restaurant, Creative Agency, High-Ticket Coaching, Salon & Spa, and Freelancer.
   - Use high-resolution, legally licensed Unsplash/Pexels photography.
3. **Build the Dedicated Template Marketplace:**
   - Rich filterable grid, category tabs, live responsive preview iframe, search by keyword, and direct "Customize in ATITTLE Studio" action.
