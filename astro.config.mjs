import { defineConfig, envField } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import preact from "@astrojs/preact";

// Vercel sets process.env.VERCEL=1 in its own build environment automatically
// — nothing to configure. This is a deliberate, documented dual-target setup
// (see ARCHITECTURE.md): the "real" architecture is Cloudflare (D1, Workers),
// but the site also needs to run on Vercel where D1 isn't available. See
// src/lib/runtime-env.ts for how server code reads env/bindings without
// hard-depending on either platform, and api/enquiry.ts for how the lead
// pipeline degrades to email-only (no persistence, no D1-backed rate limit)
// when D1 isn't present.
const isVercel = !!process.env.VERCEL;

export default defineConfig({
  site: "https://atittle.com",
  output: "server",
  session: false,
  trailingSlash: "never",
  // maxDuration: the AI Website Builder's generation call (api/builder/generate.ts)
  // can take 20-50s; Vercel's default would cut it off.
  adapter: isVercel ? vercel({ webAnalytics: { enabled: false }, maxDuration: 60 }) : cloudflare({ imageService: "compile" }),
  integrations: [
    // Preact powers only the AI Website Builder editor island
    // (/free-website-builder/app, client:only) — no other page ships it.
    preact({ include: ["**/src/scripts/builder/*.tsx"] }),
    sitemap({
      // Demo sites are deliberately noindex (see ARCHITECTURE.md / SEO.md) —
      // they must not compete with the indexable /industries/[slug] pages,
      // so they're excluded from the sitemap as well as noindexed in meta.
      filter: (page) => !page.includes("/demos/") && !page.includes("/api/") && !page.includes("/enquiry-") && !/\/(404|500|privacy|terms|refund-policy)(\/|$)/.test(page) && !page.includes("/free-website-builder/app"),
      // Purely cosmetic: renders as a styled table instead of the browser's
      // raw-XML tree view when a human opens the sitemap URL directly.
      // Crawlers ignore the xml-stylesheet PI and read the XML as normal.
      xslURL: "/sitemap.xsl",
    }),
  ],
  image: {
    remotePatterns: [],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: "client", access: "public", optional: true }),
      AI_PROVIDER: envField.string({ context: "server", access: "public", default: "none" }),
      EMAIL_PROVIDER: envField.string({ context: "server", access: "public", default: "resend" }),
    },
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
});
