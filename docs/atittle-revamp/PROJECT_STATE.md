# ATITTLE.COM — Project State & Objective

## 1. Executive Summary & Objective
Transform **ATITTLE (https://atittle.com)** into a commercial, production-grade website creation ecosystem. The system combines:
1. A rich **Template Marketplace** with industry-specific, professionally designed, image-rich website templates, search, categories, filtering, and responsive live previews.
2. A deterministic **Wix-inspired Visual Website Editor** with reliable element selection, live inline editing, drag-and-drop section/component manipulation, typography/style properties, responsive previews, undo/redo, auto-saving, and local persistence.
3. Complete **Export & Custom Domain / Cloudflare SaaS Publishing** pipelines.
4. An uncompromising, accessible **Global Design System** based on Obsidian ink (`#1c1917`), Antique gold (`#d4af37`), Warm terracotta (`#c85a32`), and Warm cream (`#fbf6ee`), while strictly enforcing template-specific CSS isolation.

## 2. Core Operational Constraints
- **Founder Standard:** Every decision must be production-ready, accessible, fast, and commercially viable.
- **Zero Hallucination:** Every claim, test result, and template must be physically verified in code.
- **Zero Fake Functionality:** Every button or control either works deterministically or is removed.
- **AI Independence:** Core template browsing, selection, editing, drag-and-drop, saving, exporting, and publishing must run 100% deterministically without depending on external AI API uptime.
- **Preservation:** Existing routes, demo showcases (Shivalik, Meridian, etc.), brand studio, evaluation tools, and enquiry pipelines must remain intact.

## 3. High-Level Architecture
- **Framework:** Astro 5 (SSR + Static hybrid) + Preact 10 client islands.
- **Deployment Platform:** Cloudflare Pages + Cloudflare Workers / KV / D1 / Cloudflare for SaaS.
- **State Engine:** Preact hook-based immutable structural sharing store (`src/scripts/builder/store.ts`) with deep path updates, undo/redo history stack, and LocalStorage persistence.
- **Canvas Rendering:** Sandboxed iframe with postMessage bidirectional bridge (`preview.ts` + `Canvas.tsx`) guaranteeing complete CSS/script isolation.

## 4. Current Phase & Milestone
- **Phase:** Gate A Baseline Audit & Ledger Setup $\rightarrow$ Gate B Design System & Template Catalog Expansion.
- **Status:** In Progress.
