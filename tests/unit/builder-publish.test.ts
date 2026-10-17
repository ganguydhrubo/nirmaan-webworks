import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker, { findInZip, CSP } from "../../worker/sites/index.js";
import { buildSiteFiles, exportZip, siteVersion } from "@/lib/builder/export";
import { createZip } from "@/lib/builder/zip";
import { templateDoc, blankDoc, TEMPLATE_LIST } from "@/lib/builder/templates";
import { normalizeDoc, type SiteDoc } from "@/lib/builder/schema";
import { buildPublishArtifact, encodeMeta, isValidSlug, newManageToken, newSlug, screenContent } from "@/lib/builder/publish";
import { _resetMemoryQuota } from "@/lib/builder/quota";
import { POST, GET, DELETE } from "@/pages/api/builder/publish";

/**
 * Publishing, end to end against a MOCKED Cloudflare: the KV REST API is an
 * in-memory map, and "the live site" is the real Worker script (worker/sites)
 * reading that map. No network, no real Cloudflare account.
 */

const ACCOUNT = "0123456789abcdef0123456789abcdef";
const NAMESPACE = "fedcba9876543210fedcba9876543210";
const BASE = "https://atittle-sites.example.workers.dev";
const TOKEN = "test-token-not-real";
const ENV_KEYS = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "SITES_KV_NAMESPACE_ID", "SITES_BASE_URL", "BUILDER_PUBLISH_DAILY_LIMIT_PER_IP"] as const;

type Stored = { value: ArrayBuffer; metadata: Record<string, unknown> };
let kv: Map<string, Stored>;
let calls: { method: string; url: string; auth: string | null }[];
let kvFailure: { status: number; body: unknown } | null;

/** Fake KV binding for the Worker, backed by the same map. */
const binding = {
  async getWithMetadata(key: string) {
    const hit = kv.get(key);
    return hit ? { value: hit.value, metadata: hit.metadata } : { value: null, metadata: null };
  },
};

function cfJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input instanceof Request ? input.url : input);
  const method = (init.method ?? "GET").toUpperCase();
  const auth = new Headers(init.headers).get("Authorization");
  calls.push({ method, url, auth });
  if (url.startsWith(BASE)) return worker.fetch(new Request(url, { method, headers: init.headers }), { SITES: binding, NOINDEX: "1" });
  const m = url.match(/^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/([^/]+)\/storage\/kv\/namespaces\/([^/]+)\/(values|metadata)\/(.+)$/);
  if (!m) return cfJson({ success: false, errors: [{ code: 7003, message: "No route" }] }, 404);
  if (auth !== `Bearer ${TOKEN}` || m[1] !== ACCOUNT || m[2] !== NAMESPACE) return cfJson({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }, 403);
  const key = decodeURIComponent(m[4]!);
  if (m[3] === "metadata") {
    const hit = kv.get(key);
    return hit ? cfJson({ success: true, result: hit.metadata }) : cfJson({ success: false, errors: [{ code: 10009, message: "key not found" }] }, 404);
  }
  if (method === "PUT") {
    if (kvFailure) return cfJson(kvFailure.body, kvFailure.status);
    const form = init.body as FormData;
    const value = await (form.get("value") as Blob).arrayBuffer();
    const metadata = JSON.parse(String(form.get("metadata")));
    expect(new TextEncoder().encode(String(form.get("metadata"))).length).toBeLessThanOrEqual(1024);
    kv.set(key, { value, metadata });
    return cfJson({ success: true, result: null });
  }
  if (method === "DELETE") {
    kv.delete(key);
    return cfJson({ success: true, result: null });
  }
  return cfJson({ success: false }, 405);
}

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
  process.env.CLOUDFLARE_API_TOKEN = TOKEN;
  process.env.SITES_KV_NAMESPACE_ID = NAMESPACE;
  process.env.SITES_BASE_URL = BASE;
  delete process.env.BUILDER_PUBLISH_DAILY_LIMIT_PER_IP;
  kv = new Map();
  calls = [];
  kvFailure = null;
  _resetMemoryQuota();
  vi.spyOn(globalThis, "fetch").mockImplementation(fakeFetch as typeof fetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const doc = (): SiteDoc => templateDoc(TEMPLATE_LIST[0]!.id)!;

function req(method: string, body?: unknown, ip = "203.0.113.7"): Request {
  return new Request("https://atittle.com/api/builder/publish", {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const call = async (handler: typeof POST, request: Request) => {
  const res = await handler({ request, url: new URL(request.url) } as never);
  return { status: res.status, body: (await res.json()) as Record<string, any>, headers: res.headers };
};

describe("worker: serving sites from the export ZIP", () => {
  it("finds files in a STORE zip via the central directory", () => {
    const zip = createZip([
      { path: "index.html", data: "<h1>Home</h1>" },
      { path: "assets/styles.css", data: "body{}" },
    ]);
    expect(new TextDecoder().decode(findInZip(zip, "assets/styles.css")!)).toBe("body{}");
    expect(findInZip(zip, "missing.html")).toBeNull();
    expect(findInZip(new Uint8Array(10), "index.html")).toBeNull();
  });

  it("serves pages with strict security headers; rejects traversal and bad slugs", async () => {
    const { bytes } = exportZip(doc());
    kv.set("site:demo-site-abc123", { value: bytes.buffer as ArrayBuffer, metadata: { v: "v1" } });
    const env = { SITES: binding };
    const res = await worker.fetch(new Request(`${BASE}/demo-site-abc123/`), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("content-security-policy")).toBe(CSP);
    expect(CSP).toContain("script-src 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("x-atittle-version")).toBe("v1");
    expect(await res.text()).not.toMatch(/<script/i);

    const css = await worker.fetch(new Request(`${BASE}/demo-site-abc123/assets/styles.css`), env);
    expect(css.headers.get("content-type")).toContain("text/css");

    const redirect = await worker.fetch(new Request(`${BASE}/demo-site-abc123`), env);
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("location")).toBe(`${BASE}/demo-site-abc123/`);

    expect((await worker.fetch(new Request(`${BASE}/demo-site-abc123/..%2F..%2Fetc`), env)).status).toBe(404);
    expect((await worker.fetch(new Request(`${BASE}/demo-site-abc123/nope.html`), env)).status).toBe(404);
    expect((await worker.fetch(new Request(`${BASE}/UPPER_case/`), env)).status).toBe(404);
    expect((await worker.fetch(new Request(`${BASE}/unknown-site-zzz/`), env)).status).toBe(404);
    expect((await worker.fetch(new Request(`${BASE}/demo-site-abc123/`, { method: "POST" }), env)).status).toBe(405);
    const cached = await worker.fetch(new Request(`${BASE}/demo-site-abc123/`, { headers: { "If-None-Match": '"v1"' } }), env);
    expect(cached.status).toBe(304);
  });
});

describe("publish library", () => {
  it("download and publish are the same build", async () => {
    const d = doc();
    const art = await buildPublishArtifact(d);
    expect(art.version).toBe(await siteVersion(buildSiteFiles(d)));
    // Byte-identical files inside both archives
    const dl = exportZip(d).bytes;
    for (const f of buildSiteFiles(d)) {
      expect(Buffer.from(findInZip(art.bytes, f.path)!)).toEqual(Buffer.from(findInZip(dl, f.path)!));
    }
    // Any edit changes the version
    const edited = structuredClone(d);
    const p0 = edited.pages[0]!;
    (p0.sections.find((s) => s.type === "hero")!.props as Record<string, unknown>).headline = "Changed headline";
    expect((await buildPublishArtifact(normalizeDoc(edited).doc)).version).not.toBe(art.version);
  });

  it("slugs are readable, unique and safe; tokens are long and random", () => {
    const a = newSlug("Sharma's Café & Bakery");
    expect(a).toMatch(/^sharma-s-cafe-bakery-[a-z0-9]{6}$/);
    expect(isValidSlug(a)).toBe(true);
    expect(newSlug("Sharma's Café & Bakery")).not.toBe(a);
    expect(newSlug("नमस्ते")).toMatch(/^site-[a-z0-9]{6}$/);
    expect(newSlug("admin")).toMatch(/^site-admin-/);
    expect(isValidSlug("../x")).toBe(false);
    expect(isValidSlug("admin")).toBe(false);
    const t = newManageToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newManageToken()).not.toBe(t);
  });

  it("metadata stays under Cloudflare's 1024-byte limit", () => {
    const m = encodeMeta({ o: "a".repeat(64), v: "b".repeat(24), t: Date.now(), c: Date.now(), n: "भारत ".repeat(200), p: 8, s: 4_000_000 });
    expect(new TextEncoder().encode(m).length).toBeLessThanOrEqual(1024);
  });

  it("screens obvious phishing copy", () => {
    const d = doc();
    expect(screenContent(d)).toBeNull();
    const bad = structuredClone(d);
    (bad.pages[0]!.sections.find((s) => s.type === "hero")!.props as Record<string, unknown>).headline = "Your account has been suspended — verify your account now";
    expect(screenContent(bad)).toMatch(/can't host/);
  });
});

describe("POST/GET/DELETE /api/builder/publish (mocked Cloudflare)", () => {
  it("publishes, is verified live, republishes in place, and only the owner can update or remove", async () => {
    const d = doc();
    const first = await call(POST, req("POST", { doc: d }));
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ ok: true, state: "verifying" });
    const { slug, url, version, manageToken } = first.body;
    expect(url).toBe(`${BASE}/${slug}/`);
    expect(manageToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(version).toBe(await siteVersion(buildSiteFiles(normalizeDoc(d).doc)));

    // Only a hash of the manage token is stored, and no credential appears in the response.
    const stored = kv.get(`site:${slug}`)!;
    expect(JSON.stringify(stored.metadata)).not.toContain(manageToken);
    expect(JSON.stringify(first.body)).not.toContain(TOKEN);
    expect(calls.filter((c) => c.url.includes("api.cloudflare.com")).every((c) => c.auth === `Bearer ${TOKEN}`)).toBe(true);

    // Real confirmation comes from the live URL serving this version.
    const live = await call(GET, new Request(`https://atittle.com/api/builder/publish?slug=${slug}&v=${version}`));
    expect(live.body).toMatchObject({ ok: true, live: true });
    const stale = await call(GET, new Request(`https://atittle.com/api/builder/publish?slug=${slug}&v=${"0".repeat(24)}`));
    expect(stale.body.live).toBe(false);

    // Same owner, edited site → same address, new version
    const edited = structuredClone(d);
    (edited.pages[0]!.sections.find((s) => s.type === "hero")!.props as Record<string, unknown>).headline = "New headline";
    const again = await call(POST, req("POST", { doc: edited, slug, manageToken }));
    expect(again.status).toBe(200);
    expect(again.body.slug).toBe(slug);
    expect(again.body.version).not.toBe(version);
    expect(again.body.manageToken).toBeUndefined();
    expect(kv.size).toBe(1);

    // Someone else can't overwrite or delete it
    const hijack = await call(POST, req("POST", { doc: blankDoc(), slug, manageToken: newManageToken() }, "198.51.100.9"));
    expect(hijack.status).toBe(403);
    expect(hijack.body.code).toBe("not_owner");
    const noToken = await call(POST, req("POST", { doc: d, slug }, "198.51.100.9"));
    expect(noToken.status).toBe(403);
    expect((await call(DELETE, req("DELETE", { slug, manageToken: newManageToken() }))).status).toBe(403);
    expect(kv.get(`site:${slug}`)!.metadata.v).toBe(again.body.version);

    // Owner takes it offline
    const del = await call(DELETE, req("DELETE", { slug, manageToken }));
    expect(del.body).toMatchObject({ ok: true, removed: true });
    expect(kv.size).toBe(0);
  });

  it("two users publishing the same business name get different addresses", async () => {
    const a = await call(POST, req("POST", { doc: doc() }, "203.0.113.1"));
    const b = await call(POST, req("POST", { doc: doc() }, "203.0.113.2"));
    expect(a.body.slug).not.toBe(b.body.slug);
    expect(kv.size).toBe(2);
  });

  it("validates before spending quota or calling Cloudflare", async () => {
    const empty = await call(POST, req("POST", { doc: { ...blankDoc(), pages: [{ ...blankDoc().pages[0]!, sections: [] }] } }));
    expect(empty.status).toBe(422);
    expect((await call(POST, req("POST", { doc: doc(), slug: "../../etc" }))).status).toBe(400);
    const bad = new Request("https://atittle.com/api/builder/publish", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" });
    expect((await call(POST, bad)).status).toBe(415);
    const huge = new Request("https://atittle.com/api/builder/publish", { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "9000000" }, body: "{}" });
    expect((await call(POST, huge)).status).toBe(413);
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
  });

  it("rate-limits per visitor and refunds failed uploads", async () => {
    process.env.BUILDER_PUBLISH_DAILY_LIMIT_PER_IP = "2";
    kvFailure = { status: 500, body: { success: false, errors: [{ code: 10001, message: "internal" }] } };
    const failed = await call(POST, req("POST", { doc: doc() }));
    expect(failed.status).toBe(502);
    expect(failed.body).toMatchObject({ ok: false, code: "hosting_unavailable", retryable: true });
    kvFailure = null;
    expect((await call(POST, req("POST", { doc: doc() }))).status).toBe(200); // the failure was refunded
    expect((await call(POST, req("POST", { doc: doc() }))).status).toBe(200);
    const limited = await call(POST, req("POST", { doc: doc() }));
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("quota_exceeded");
  });

  it("maps Cloudflare's daily write limit and auth errors to honest messages without leaking details", async () => {
    kvFailure = { status: 429, body: { success: false, errors: [{ code: 10048, message: "KV put() limit exceeded for the day." }] } };
    const cap = await call(POST, req("POST", { doc: doc() }));
    expect(cap.status).toBe(503);
    expect(cap.body.code).toBe("capacity");
    process.env.CLOUDFLARE_API_TOKEN = "wrong-token";
    kvFailure = null;
    const auth = await call(POST, req("POST", { doc: doc() }, "203.0.113.50"));
    expect(auth.status).toBe(503);
    expect(auth.body.code).toBe("not_configured");
    expect(JSON.stringify(auth.body)).not.toMatch(/wrong-token|Authentication error|api\.cloudflare/);
  });

  it("is honest when publishing isn't configured", async () => {
    delete process.env.SITES_KV_NAMESPACE_ID;
    const res = await call(POST, req("POST", { doc: doc() }));
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("not_configured");
    expect(calls).toHaveLength(0);
  });
});
