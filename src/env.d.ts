/// <reference types="astro/client" />
// Cloudflare bindings/secrets are accessed via `import { env } from "cloudflare:workers"`
// in server-only files (API routes, the retry worker) — NOT via Astro.locals,
// which no longer exposes `runtime.env` as of this @astrojs/cloudflare version.
// See src/worker-env.d.ts for the Env interface augmentation (secrets).
