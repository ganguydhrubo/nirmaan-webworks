# ATITTLE.COM — Next Actions Priority Backlog

## Priority 1: Baseline Fixes & Test Green Light
1. Update `tests/unit/builder.test.ts` to validate all templates in `TEMPLATE_LIST` dynamically without hardcoded length 10. Run `npm run test` to achieve 100% test pass baseline.

## Priority 2: Visual Editor Usability Overhaul (Wix-Grade Interaction)
1. **Selection & Hover Highlighting:**
   - In `src/scripts/builder/preview.ts`, improve element hover highlights with clear section outline, section label pill, and floating action bar (Move Up, Move Down, Duplicate, Delete, Edit).
   - Ensure pointer coordinates in `Canvas.tsx` are never offset under scaling.
2. **Properties Panel Upgrade:**
   - In `src/scripts/builder/Properties.tsx`, add rich visual property controls:
     * Typography: Font family picker, font size scale, font weight, line height, text alignment.
     * Colors: Background color, text color, accent color picker with presets.
     * Spacing: Padding (compact, normal, spacious), margins.
     * Component properties: Button text & links, image replacement with Unsplash/upload gallery, card/item repeater management.
3. **Drag-and-Drop & Section Management:**
   - In `src/scripts/builder/LeftPanel.tsx`, enhance the "Layers / Sections" tab with drag-and-drop reordering, visual drop indicator, and one-click add section dialog with live thumbnails.

## Priority 3: Rich Template Marketplace Expansion
1. Expand template definitions in `src/lib/builder/templates.ts` to 18+ high-converting, image-rich business templates (adding Healthcare Clinic, Architecture & Interior, Law Firm, Fitness & Gym, Event & Wedding, Fine Dining Restaurant, Luxury Jewelry Atelier, Tech SaaS, Corporate Advisory, etc.).
2. Build dedicated `/templates` marketplace page with instant category tabs, keyword search, live modal/responsive previews, and one-click "Customize Template" flow.
3. Update `/free-website-builder` to showcase the new templates.

## Priority 4: Verification, Non-Regression & Deployment
1. Run full test suite (`npm run test`, `npx tsc --noEmit`).
2. Verify all existing routes and tools (`/demos`, `/demos/shivalik-homes`, `/demos/meridian`, `/brand-studio`).
3. Commit and push to `origin/master`.
4. Verify production deployment live on https://atittle.com.
