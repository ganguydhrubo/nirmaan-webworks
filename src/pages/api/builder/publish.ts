import type { APIRoute } from "astro";
import { hasContent, normalizeDoc } from "@/lib/builder/schema";
import { acquireSlot, consumeCredit, visitorKey } from "@/lib/builder/quota";
import {
  CloudflareError,
  DEFAULT_MAX_SITE_BYTES,
  buildPublishArtifact,
  checkLive,
  deleteSite,
  getPublishConfig,
  getSiteMeta,
  isValidSlug,
  isWellFormedToken,
  newManageToken,
  newSlug,
  putSite,
  safeEqual,
  screenContent,
  sha256Hex,
  siteUrl,
  type PublishConfig,
  type SiteMeta,
} from "@/lib/builder/publish";

/**
 * POST   publish (or re-publish) a site       { doc, slug?, manageToken? }
 * GET    is version v live yet?               ?slug=…&v=…
 * DELETE take a site offline                  { slug, manageToken }
 *
 * The site is rebuilt here from the validated document with the same code as
 * "Download Website" — uploaded HTML/JS is never accepted. A success response
 * means Cloudflare confirmed the write; the client then polls GET until the
 * live URL serves this exact version before it says "Published".
 */
export const prerender = false;

/** Vercel caps request bodies at ~4.5 MB; the document (with base64 images) must fit. */
const MAX_BODY_BYTES = 4_400_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

function fail(status: number, code: string, message: string, retryable = false): Response {
  return json({ ok: false, code, message, retryable }, status);
}

const NOT_CONFIGURED = () => fail(503, "not_configured", "Live publishing isn't available right now. You can still download your website and upload it to any host.");

function cloudflareFailure(err: unknown): Response {
  if (err instanceof CloudflareError) {
    // Server log carries Cloudflare's own error code/message only — never credentials.
    console.error("[builder/publish]", err.message);
    if (err.code === "capacity") return fail(503, "capacity", "Free publishing has reached today's limit. Please try again tomorrow, or download your website and host it yourself.");
    if (err.code === "auth") return fail(503, "not_configured", "Live publishing is temporarily unavailable. Please try again later, or download your website.");
    if (err.code === "unavailable") return fail(502, "hosting_unavailable", "The hosting service didn't respond. Please try again in a moment.", true);
    return fail(502, "hosting_rejected", "The hosting service couldn't accept this website. Please try again, or download it instead.", true);
  }
  console.error("[builder/publish] unexpected", err instanceof Error ? err.name : "error");
  return fail(500, "server_error", "Something went wrong while publishing. Please try again.", true);
}

async function readJson(request: Request, max: number): Promise<Record<string, unknown> | Response> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return fail(415, "unsupported_media_type", "Expected JSON.");
  const declared = Number(request.headers.get("content-length") ?? "0");
  const tooBig = () => fail(413, "too_large", "This website is too large to publish for free (images over about 3 MB in total). Use fewer or smaller images, or download it and host it yourself.");
  if (declared > max) return tooBig();
  const raw = await request.text().catch(() => "");
  if (raw.length > max) return tooBig();
  try {
    const body = JSON.parse(raw) as unknown;
    if (!body || typeof body !== "object") throw new Error("not an object");
    return body as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json", "Invalid request.");
  }
}

/** Owner check for an existing site. */
async function authorize(cfg: PublishConfig, slug: string, token: unknown): Promise<{ meta: SiteMeta | null } | Response> {
  const meta = await getSiteMeta(cfg, slug);
  if (!meta) return { meta: null };
  if (!isWellFormedToken(token) || !safeEqual(await sha256Hex(token), meta.o)) {
    return fail(403, "not_owner", "This web address belongs to another website. Publish as a new website instead.");
  }
  return { meta };
}

export const POST: APIRoute = async ({ request }) => {
  const cfg = await getPublishConfig();
  if (!cfg) return NOT_CONFIGURED();
  const body = await readJson(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;

  // Validate everything before spending quota or touching Cloudflare.
  const { doc } = normalizeDoc(body.doc);
  if (!hasContent(doc)) return fail(422, "empty", "Add at least one section to your website before publishing.");
  const blocked = screenContent(doc);
  if (blocked) return fail(422, "content_rejected", blocked);
  const artifact = await buildPublishArtifact(doc);
  if (artifact.bytes.length > DEFAULT_MAX_SITE_BYTES) return fail(413, "too_large", "This website is too large to publish for free. Use fewer or smaller images, or download it and host it yourself.");

  const wantsUpdate = body.slug !== undefined && body.slug !== null && body.slug !== "";
  if (wantsUpdate && !isValidSlug(body.slug)) return fail(400, "invalid_slug", "Invalid website address.");

  const visitor = await visitorKey(request);
  const release = acquireSlot(`publish:${visitor}`, 60_000);
  if (!release) return fail(429, "busy", "A publish is already in progress. Please wait for it to finish.", true);
  let refund: (() => Promise<void>) | null = null;
  try {
    let slug: string;
    let manageToken: string | undefined;
    let createdAt = Date.now();
    let ownerHash: string;

    if (wantsUpdate) {
      slug = body.slug as string;
      const auth = await authorize(cfg, slug, body.manageToken);
      if (auth instanceof Response) return auth;
      if (auth.meta) {
        ownerHash = auth.meta.o;
        createdAt = auth.meta.c;
      } else {
        // The site was taken offline: publish to a fresh address rather than reviving an old one.
        slug = await freshSlug(cfg, doc.name);
        manageToken = newManageToken();
        ownerHash = await sha256Hex(manageToken);
      }
    } else {
      slug = await freshSlug(cfg, doc.name);
      manageToken = newManageToken();
      ownerHash = await sha256Hex(manageToken);
    }

    const quota = await consumeCredit(request, "publish");
    if (!quota.allowed) {
      return fail(429, "quota_exceeded", quota.reason === "global" ? "Free publishing has reached today's limit. Please try again tomorrow, or download your website." : "You've reached today's free publishing limit. Please try again tomorrow — your website is saved.");
    }
    refund = quota.refund;

    const publishedAt = Date.now();
    await putSite(cfg, slug, artifact.bytes, { o: ownerHash, v: artifact.version, t: publishedAt, c: createdAt, n: doc.name, p: doc.pages.length, s: artifact.bytes.length });
    refund = null; // stored: the credit is spent
    return json({
      ok: true,
      state: "verifying",
      slug,
      url: siteUrl(cfg, slug),
      version: artifact.version,
      publishedAt,
      bytes: artifact.bytes.length,
      files: artifact.files,
      ...(manageToken ? { manageToken } : {}),
    });
  } catch (err) {
    return cloudflareFailure(err);
  } finally {
    if (refund) await refund().catch(() => {});
    release();
  }
};

async function freshSlug(cfg: PublishConfig, name: string): Promise<string> {
  for (let i = 0; i < 4; i++) {
    const slug = newSlug(name);
    if (!(await getSiteMeta(cfg, slug))) return slug;
  }
  throw new CloudflareError("rejected", 409, "could not allocate a unique address");
}

export const GET: APIRoute = async ({ url }) => {
  const cfg = await getPublishConfig();
  if (!cfg) return NOT_CONFIGURED();
  const slug = url.searchParams.get("slug");
  const version = url.searchParams.get("v") ?? "";
  if (!isValidSlug(slug) || !/^[0-9a-f]{24}$/.test(version)) return fail(400, "invalid", "Invalid request.");
  const state = await checkLive(cfg, slug, version);
  return json({ ok: true, live: state === "live", url: siteUrl(cfg, slug) });
};

export const DELETE: APIRoute = async ({ request }) => {
  const cfg = await getPublishConfig();
  if (!cfg) return NOT_CONFIGURED();
  const body = await readJson(request, 2_000);
  if (body instanceof Response) return body;
  if (!isValidSlug(body.slug)) return fail(400, "invalid_slug", "Invalid website address.");
  try {
    const auth = await authorize(cfg, body.slug, body.manageToken);
    if (auth instanceof Response) return auth;
    if (auth.meta) await deleteSite(cfg, body.slug);
    return json({ ok: true, removed: true });
  } catch (err) {
    return cloudflareFailure(err);
  }
};
