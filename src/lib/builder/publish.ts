/**
 * One-click publishing: puts a builder site live on ATITTLE's Cloudflare
 * Worker (worker/sites) at https://<SITES_BASE_URL>/<slug>/.
 *
 * Server-only. Credentials come from server environment variables and never
 * reach the browser, responses, logs or the published files:
 *   CLOUDFLARE_ACCOUNT_ID   account that owns the Worker + KV namespace
 *   CLOUDFLARE_API_TOKEN    API token; at runtime it only needs "Workers KV Storage: Edit"
 *   SITES_KV_NAMESPACE_ID   KV namespace bound to the Worker as SITES
 *   SITES_BASE_URL          public origin of the Worker, e.g. https://atittle-sites.<sub>.workers.dev
 *
 * Why Workers + KV (not one Cloudflare Pages project per site): Pages is
 * limited to 100 projects and 500 builds/month per account on the free plan,
 * and direct uploads replace a project's production deployment — so a shared
 * project would let one user overwrite another. Here every site is its own KV
 * key holding the exact STORE ZIP the "Download Website" button produces, so
 * the download and the live site are the same build. See docs/AI-WEBSITE-BUILDER.md.
 *
 * Ownership: the first publish creates a random per-site manage token. Only
 * its SHA-256 is stored (KV metadata); the browser keeps the token with the
 * project. Updating or unpublishing a site requires it, so nobody can
 * overwrite someone else's site by guessing its address.
 */
import { buildSiteFiles, siteVersion } from "./export";
import { slugify } from "./sanitize";
import { createZip } from "./zip";
import type { SiteDoc } from "./schema";
import { getRuntimeEnv } from "@/lib/runtime-env";

export interface PublishConfig {
  accountId: string;
  apiToken: string;
  namespaceId: string;
  baseUrl: string;
}

/** Stored as KV metadata on `site:<slug>` (Cloudflare limit: 1024 bytes). */
export interface SiteMeta {
  /** SHA-256 (hex) of the manage token. */
  o: string;
  /** Content version (siteVersion). */
  v: string;
  /** Published at / first created at (ms). */
  t: number;
  c: number;
  /** Site name (trimmed), page count, archive bytes. */
  n: string;
  p: number;
  s: number;
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
/** Largest archive we publish. Vercel also caps the request body at ~4.5 MB. */
export const DEFAULT_MAX_SITE_BYTES = 4_000_000;
const RESERVED = new Set(["admin", "api", "www", "atittle", "app", "assets", "static", "login", "support", "help", "_health"]);

export async function getPublishConfig(): Promise<PublishConfig | null> {
  const env = await getRuntimeEnv();
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const apiToken = String(env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const namespaceId = String(env.SITES_KV_NAMESPACE_ID ?? "").trim();
  const baseUrl = String(env.SITES_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!/^[0-9a-f]{32}$/.test(accountId) || !apiToken || !/^[0-9a-f]{32}$/.test(namespaceId) || !/^https:\/\/[a-z0-9.-]+$/.test(baseUrl)) return null;
  return { accountId, apiToken, namespaceId, baseUrl };
}

export function siteUrl(cfg: Pick<PublishConfig, "baseUrl">, slug: string): string {
  return `${cfg.baseUrl}/${slug}/`;
}

function randomBase36(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => (b % 36).toString(36)).join("");
}

/** Readable, unguessable, unique-per-site address: "<business-name>-<6 random>". */
export function newSlug(name: string): string {
  let base = slugify(name, "site").slice(0, 40).replace(/-+$/, "");
  if (base.length < 2 || RESERVED.has(base)) base = `site-${base}`.replace(/-+$/, "");
  return `${base}-${randomBase36(6)}`;
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && SLUG_RE.test(slug) && !RESERVED.has(slug);
}

export function newManageToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Same files as "Download Website" (buildSiteFiles), packed the same way (createZip). */
export async function buildPublishArtifact(doc: SiteDoc): Promise<{ bytes: Uint8Array<ArrayBuffer>; version: string; files: number }> {
  const files = buildSiteFiles(doc);
  return { bytes: createZip(files), version: await siteVersion(files), files: files.length };
}

/**
 * Light abuse screen for a free host on a shared domain: refuse obvious
 * credential-phishing and impersonation copy. Returns a reason, or null.
 * (Pages contain no scripts and no password fields can be created in the
 * builder, so this is a backstop, not the only control.)
 */
export function screenContent(doc: SiteDoc): string | null {
  const text = JSON.stringify(doc.pages.map((p) => p.sections.map((s) => s.props))).toLowerCase();
  const patterns = [
    /verify (your|ur) (account|identity|card|bank)/,
    /(enter|confirm|update) (your )?(password|pin|otp|cvv|card number|seed phrase|recovery phrase)/,
    /(seed|recovery|secret) phrase/,
    /account (has been|will be) (suspended|locked|disabled)/,
    /(paypal|sbi|hdfc|icici|paytm|phonepe|google pay|apple id|microsoft|netflix|amazon) (login|sign[- ]in|security team|account verification)/,
    /kyc (update|expired|verification) (link|required)/,
  ];
  return patterns.some((re) => re.test(text)) ? "This website looks like it asks visitors for passwords, card details or account verification, which we can't host. Edit that text, or download the website and host it yourself." : null;
}

export function encodeMeta(meta: SiteMeta): string {
  const m = { ...meta, n: meta.n.slice(0, 60) };
  let json = JSON.stringify(m);
  if (new TextEncoder().encode(json).length > 1000) json = JSON.stringify({ ...m, n: "" });
  return json;
}

// ---------------------------------------------------------------------------
// Cloudflare API (KV)
// ---------------------------------------------------------------------------

export type CloudflareErrorCode = "auth" | "capacity" | "unavailable" | "rejected";

export class CloudflareError extends Error {
  constructor(
    public code: CloudflareErrorCode,
    public status: number,
    detail: string,
  ) {
    super(`Cloudflare ${code} (${status}): ${detail}`);
    this.name = "CloudflareError";
  }
}

const API = "https://api.cloudflare.com/client/v4";

function kvUrl(cfg: PublishConfig, kind: "values" | "metadata", slug: string): string {
  return `${API}/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.namespaceId}/${kind}/${encodeURIComponent(`site:${slug}`)}`;
}

async function cfFail(res: Response): Promise<CloudflareError> {
  const body = (await res.json().catch(() => null)) as { errors?: { code?: number; message?: string }[] } | null;
  // Only Cloudflare's error codes/messages are kept — never request headers or the token.
  const detail = (body?.errors ?? []).map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ").slice(0, 300) || res.statusText;
  if (res.status === 401 || res.status === 403) return new CloudflareError("auth", res.status, detail);
  if (res.status === 429 || /limit/i.test(detail)) return new CloudflareError("capacity", res.status, detail);
  if (res.status >= 500) return new CloudflareError("unavailable", res.status, detail);
  return new CloudflareError("rejected", res.status, detail);
}

async function cfFetch(url: string, init: RequestInit, timeoutMs = 20_000): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new CloudflareError("unavailable", 0, err instanceof Error ? err.name : "network error");
  }
}

export async function getSiteMeta(cfg: PublishConfig, slug: string): Promise<SiteMeta | null> {
  const res = await cfFetch(kvUrl(cfg, "metadata", slug), { headers: { Authorization: `Bearer ${cfg.apiToken}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw await cfFail(res);
  const body = (await res.json().catch(() => null)) as { result?: unknown } | null;
  const r = body?.result as Partial<SiteMeta> | null | undefined;
  return r && typeof r.o === "string" ? (r as SiteMeta) : null;
}

export async function putSite(cfg: PublishConfig, slug: string, bytes: Uint8Array<ArrayBuffer>, meta: SiteMeta): Promise<void> {
  const form = new FormData();
  form.set("value", new Blob([bytes], { type: "application/zip" }));
  form.set("metadata", encodeMeta(meta));
  const res = await cfFetch(kvUrl(cfg, "values", slug), { method: "PUT", headers: { Authorization: `Bearer ${cfg.apiToken}` }, body: form }, 30_000);
  if (!res.ok) throw await cfFail(res);
  const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (body?.success !== true) throw new CloudflareError("rejected", res.status, "write not confirmed");
}

export async function deleteSite(cfg: PublishConfig, slug: string): Promise<void> {
  const res = await cfFetch(kvUrl(cfg, "values", slug), { method: "DELETE", headers: { Authorization: `Bearer ${cfg.apiToken}` } });
  if (!res.ok && res.status !== 404) throw await cfFail(res);
}

/**
 * Ask the live site itself whether it serves this version. KV is eventually
 * consistent (a new value can take up to ~60 s to reach every location), so
 * the client polls this until it returns "live".
 */
export async function checkLive(cfg: PublishConfig, slug: string, version: string): Promise<"live" | "pending"> {
  try {
    const res = await fetch(siteUrl(cfg, slug), { headers: { "Cache-Control": "no-cache" }, redirect: "manual", signal: AbortSignal.timeout(8_000) });
    const live = res.status === 200 && res.headers.get("x-atittle-version") === version && (res.headers.get("content-type") ?? "").startsWith("text/html");
    await res.body?.cancel().catch(() => {});
    return live ? "live" : "pending";
  } catch {
    return "pending";
  }
}
