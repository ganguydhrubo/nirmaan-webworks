import { defineConfig, envField } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://webjobs.site",
  output: "server",
  session: false,
  trailingSlash: "never",
  adapter: cloudflare({
    imageService: "compile",
  }),
  integrations: [
    sitemap({
      // Demo sites are deliberately noindex (see ARCHITECTURE.md / SEO.md) —
      // they must not compete with the indexable /industries/[slug] pages,
      // so they're excluded from the sitemap as well as noindexed in meta.
      filter: (page) => !page.includes("/demos/") && !page.includes("/api/") && !page.includes("/enquiry-") && !/\/(404|500|privacy|terms|refund-policy)(\/|$)/.test(page),
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
