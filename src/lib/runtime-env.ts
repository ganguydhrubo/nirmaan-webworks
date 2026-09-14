/**
 * Runtime-agnostic environment/bindings access.
 *
 * This app's "real" architecture (see ARCHITECTURE.md) targets Cloudflare
 * Workers, where env vars/secrets and the D1 binding come through
 * `import { env } from "cloudflare:workers"`. To also deploy on Vercel
 * (which has no D1 binding and no `cloudflare:workers` module at all), every
 * server-only file reads env through this module instead of importing
 * `cloudflare:workers` directly.
 *
 * The `cloudflare:workers` specifier is imported dynamically with
 * `/* @vite-ignore *\/` so Vite/Rollup does not try to resolve it at build
 * time when bundling for a non-Cloudflare target (it would fail the build,
 * since the module genuinely does not exist outside workerd). At runtime:
 * on Cloudflare it resolves and we get real bindings (D1 included); on
 * Vercel/Node the import rejects and we fall back to `process.env`, which
 * has no `DB` — callers must treat a missing `DB` as "run without D1" (see
 * api/enquiry.ts), not as an error.
 */
export interface RuntimeEnv {
  DB?: D1Database;
  ASSETS?: unknown;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
  IP_HASH_SALT?: string;
  EMAIL_PROVIDER?: string;
  AI_PROVIDER?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  ENQUIRY_RATE_LIMIT_PER_IP_PER_HOUR?: string;
  ENQUIRY_RATE_LIMIT_PER_PHONE_PER_DAY?: string;
  ENQUIRY_RATE_LIMIT_GLOBAL_PER_HOUR?: string;
  RESEND_DAILY_CAP?: string;
  [key: string]: unknown;
}

let cached: RuntimeEnv | null = null;

export async function getRuntimeEnv(): Promise<RuntimeEnv> {
  if (cached) return cached;
  try {
    const specifier = "cloudflare:workers";
    const mod = (await import(/* @vite-ignore */ specifier)) as { env: RuntimeEnv };
    cached = mod.env;
  } catch {
    cached = (typeof process !== "undefined" ? (process.env as RuntimeEnv) : {}) as RuntimeEnv;
  }
  return cached;
}

/** True when running on Cloudflare Workers (D1, and its rate-limit/lead-persistence path, are available). */
export async function hasD1(): Promise<boolean> {
  const env = await getRuntimeEnv();
  return !!env.DB;
}
