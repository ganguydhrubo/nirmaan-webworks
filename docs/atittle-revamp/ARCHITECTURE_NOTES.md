# ATITTLE.COM — Architecture Notes

## 1. System Components
- **Hosting & Edge Runtime:** Cloudflare Pages (Static Assets + SSR Functions via `@astrojs/cloudflare`).
- **Database & KV:** Cloudflare D1 for enquiry leads; Cloudflare KV `SITES` for custom domain routing.
- **Client Framework:** Preact 10 islands (`client:only="preact"`) mounted in clean HTML shells (`app.astro`).
- **CSS Architecture:** Tailwind CSS 4 with custom design tokens in `@/styles/global.css`, isolated builder stylesheets in `@/scripts/builder/builder.css`, and sandboxed iframe runtime CSS in `preview.ts`.

## 2. Editor & Sandboxing Architecture
- **Sandboxed Iframe:** `<iframe sandbox="allow-scripts" srcdoc={html}>` prevents user-generated template code from accessing cookies, local storage, or top-level window context.
- **Bi-Directional PostMessage Protocol:**
  - Parent $\rightarrow$ Iframe:
    - `{ type: "body", html }`: Updates body content when non-canvas mutations occur.
    - `{ type: "css", css }`: Dynamically replaces theme CSS variables in real time.
    - `{ type: "select", id, scroll }`: Highlights selected element and optionally scrolls into view.
  - Iframe $\rightarrow$ Parent:
    - `{ type: "ready" }`: Handshake signaling bridge readiness.
    - `{ type: "select", id, image }`: Propagates element click to editor store.
    - `{ type: "text", key, value }`: Debounced inline text mutation.
    - `{ type: "shortcut", key, shift }`: Propagates hotkeys (Ctrl+Z, Ctrl+Y, Ctrl+S).

## 3. Section & Component Schema
- Document format defined in `src/lib/builder/schema.ts`:
  - `SiteDoc`: contains `name`, `theme`, `assets`, `pages`.
  - `Page`: contains `id`, `title`, `slug`, `sections`.
  - `Section`: contains `id`, `type`, `variant`, `props`, `style`.
- Extensible section types: `navbar`, `hero`, `features`, `services`, `gallery`, `about`, `steps`, `pricing`, `testimonials`, `faq`, `cta`, `contact`, `footer`.
