import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { enquirySchema, MAX_ENQUIRY_PAYLOAD_BYTES } from "@/lib/validation";
import { getClientIp, hashIp } from "@/lib/ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkGlobalRateLimit, checkIpRateLimit, checkPhoneRateLimit } from "@/lib/rate-limit";
import { findRecentDuplicateLead, getDailyEmailCount, reserveEmailQuota, insertLead, leadFromInput, logSpam, updateLeadEmailStatus } from "@/lib/leads";
import { createEmailProvider, sendWithRetry, type LeadEmailPayload } from "@/lib/email";
import { getRateLimits } from "@/lib/config-validate";
import { siteConfig } from "@config/site";

export const prerender = false;

const MIN_HUMAN_SUBMIT_MS = 2500;
let degradedSubmissions: number[] = [];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function isFormEncoded(request: Request): boolean {
  const ct = request.headers.get("content-type") ?? "";
  return ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data");
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const requestId = crypto.randomUUID();
  const noJs = isFormEncoded(request);
  const runtimeEnv = await getRuntimeEnv();

  const fail = (status: number, code: string, message: string) => {
    console.error(JSON.stringify({ requestId, level: "error", code, message }));
    if (noJs) {
      // Most pages that embed the enquiry form (home, industry pages) are
      // statically prerendered, so a redirect back to them can't render a
      // query-param error inline — a static file ignores query strings.
      // Instead we send no-JS failures to a small server-rendered page that
      // can actually read the error and show the WhatsApp/phone fallback.
      const url = new URL("/enquiry-error", request.url);
      url.searchParams.set("code", code);
      url.searchParams.set("message", message);
      return redirect(url.toString(), 303);
    }
    return json({ ok: false, code, message, requestId }, status);
  };

  // 1. Payload size guard.
  const rawLength = Number(request.headers.get("content-length") ?? "0");
  if (rawLength > MAX_ENQUIRY_PAYLOAD_BYTES) {
    return fail(413, "payload_too_large", "That submission was too large.");
  }

  // 2. Origin/referer allowlist.
  const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  const allowedHost = new URL(siteConfig.siteUrl).host;
  const requestHost = new URL(request.url).host;
  const originHost = (() => {
    try {
      return origin ? new URL(origin).host : "";
    } catch {
      return "";
    }
  })();
  if (originHost && originHost !== allowedHost && originHost !== requestHost) {
    return fail(403, "bad_origin", "Request origin not allowed.");
  }

  let formData: Record<string, string>;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!noJs && !contentType.includes("application/json")) return fail(415, "bad_content_type", "Please submit using the enquiry form.");
    // Count the actual stream; Content-Length is optional and cannot be trusted.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ENQUIRY_PAYLOAD_BYTES) {
        await reader.cancel();
        return fail(413, "payload_too_large", "That submission was too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const boundedRequest = new Request(request.url, { method: "POST", headers: request.headers, body: bytes });
    if (noJs) {
      const fd = await boundedRequest.formData();
      formData = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    } else {
      formData = await boundedRequest.json();
    }
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) return fail(400, "bad_body", "Please check your submission.");
    // eslint-disable-next-line no-control-regex
    for (const [key, value] of Object.entries(formData)) if (typeof value === "string") formData[key] = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    formData.turnstileToken ||= formData["cf-turnstile-response"] ?? "";
  } catch {
    return fail(400, "bad_body", "We couldn't read that submission.");
  }

  // D1 is only bound on Cloudflare (see ARCHITECTURE.md/src/lib/runtime-env.ts)
  // — on Vercel this is legitimately undefined, not a misconfiguration. Every
  // D1-touching step below is skipped when `db` is absent, and the lead
  // pipeline falls back to "email-only, not persisted, no D1-backed rate
  // limit" — the same degraded state the Cloudflare path already uses when
  // D1 itself errors out (see step 8's persisted=false handling), just
  // reached from a different cause.
  const db = runtimeEnv.DB;
  const ipHashSalt = runtimeEnv.IP_HASH_SALT || "no-d1-runtime-ip-hashing-still-useful-for-log-correlation";

  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, ipHashSalt);
  const limits = getRateLimits(runtimeEnv);
  const recordSpam = (reason: string) => {
    if (!db) {
      console.warn(JSON.stringify({ requestId, level: "warn", code: "spam_no_d1", reason }));
      return Promise.resolve();
    }
    return logSpam(db, reason, ipHash, String(formData.pageSource ?? "").slice(0, 200)).catch(() => {
      console.warn(JSON.stringify({ requestId, code: "spam_log_unavailable" }));
    });
  };

  // 3. Honeypot.
  if (formData.honeypot && formData.honeypot.length > 0) {
    await recordSpam("honeypot");
    return noJs ? redirect("/enquiry-received", 303) : json({ ok: true }, 200);
  }

  // 4. Submit-timing check.
  const renderedAt = Number(formData.formRenderedAt ?? "0");
  if (renderedAt > 0 && Date.now() - renderedAt < MIN_HUMAN_SUBMIT_MS) {
    await recordSpam("too_fast");
    return fail(400, "too_fast", "Please try submitting again.");
  }

  // 5. Turnstile verification (fails open on infra errors, tightens rate limit instead).
  const turnstile = await verifyTurnstile(formData.turnstileToken, runtimeEnv.TURNSTILE_SECRET_KEY, ip);
  const turnstileDegraded = turnstile.outcome === "failed" || turnstile.outcome === "skipped";
  if (turnstile.outcome === "unverified") {
    await recordSpam("turnstile_failed");
    return fail(400, "verification_failed", "We couldn't verify you're human. Please try again or message us on WhatsApp.");
  }

  // 6. Schema validation + sanitisation.
  const parsed = enquirySchema.safeParse(formData);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.message === "spam") {
      await recordSpam("phrase_filter");
      return fail(400, "invalid", "Please check your submission and try again.");
    }
    return fail(400, "invalid", firstIssue?.message ?? "Please check your submission and try again.");
  }
  const input = parsed.data;

  // 7. Rate limiting (stricter effective limits when Turnstile is degraded).
  // No D1 on this runtime (e.g. Vercel) => no D1-backed counter store; fall
  // back to a small in-memory-per-instance flood guard and rely on
  // Turnstile as the primary defence, same as the D1-store-unavailable path.
  const degradeFactor = turnstileDegraded ? 0.4 : 1;
  if (db) {
    try {
      const [ipLimit, phoneLimit, globalLimit] = await Promise.all([
        checkIpRateLimit(db, ipHash, Math.max(1, Math.floor(limits.perIpPerHour * degradeFactor))),
        checkPhoneRateLimit(db, input.phone, Math.max(1, Math.floor(limits.perPhonePerDay * degradeFactor))),
        checkGlobalRateLimit(db, limits.globalPerHour),
      ]);
      if (!ipLimit.allowed || !phoneLimit.allowed || !globalLimit.allowed) {
        return fail(429, "rate_limited", "You've submitted a few times already — please wait a bit, or message us directly on WhatsApp.");
      }
    } catch {
      // D1 quota exhaustion affects counters as well as lead storage. Continue
      // to the documented email fallback instead of throwing an uncaught 500.
      console.warn(JSON.stringify({ requestId, code: "rate_limit_store_unavailable" }));
      const now = Date.now();
      degradedSubmissions = degradedSubmissions.filter((t) => now - t < 60000);
      if (degradedSubmissions.length >= 10) {
        return fail(429, "rate_limited", "High traffic detected. Please wait a bit or message us directly on WhatsApp.");
      }
      degradedSubmissions.push(now);
    }
  } else {
    const now = Date.now();
    degradedSubmissions = degradedSubmissions.filter((t) => now - t < 60000);
    if (degradedSubmissions.length >= 10) {
      return fail(429, "rate_limited", "High traffic detected. Please wait a bit or message us directly on WhatsApp.");
    }
    degradedSubmissions.push(now);
  }

  // 7b. Deduplication check: if a lead from the same phone in the same category was submitted within 15 min, succeed idempotently.
  if (db) {
    try {
      const existing = await findRecentDuplicateLead(db, input.phone, input.category, 15);
      if (existing) {
        console.log(JSON.stringify({ requestId, code: "duplicate_submission_idempotent", leadId: existing.id }));
        return noJs ? redirect("/enquiry-received", 303) : json({ ok: true }, 200);
      }
    } catch {
      // Non-blocking if D1 lookup fails
    }
  }

  // 8. Persist FIRST (when a database is actually available on this runtime).
  const lead = leadFromInput(input, { ipHash, turnstileStatus: turnstile.outcome });
  let persisted = false;
  if (db) {
    try {
      await insertLead(db, lead);
      persisted = true;
    } catch (err) {
      console.error(JSON.stringify({ requestId, level: "error", message: "d1_insert_failed", error: String(err) }));
    }
  }

  // 9. Send notification email (persisted or not — a lead must never be silently dropped).
  const dateUtc = new Date().toISOString().slice(0, 10);
  const sentToday = persisted && db ? await getDailyEmailCount(db, dateUtc).catch(() => 0) : 0;
  const quotaWarning = sentToday >= Math.floor(limits.resendDailyCap * 0.8);

  const payload: LeadEmailPayload = {
    leadId: lead.id,
    name: lead.name,
    phoneE164: lead.phoneE164,
    email: lead.email,
    businessName: lead.businessName,
    category: lead.category,
    needs: lead.needs,
    message: lead.message,
    sourcePage: lead.sourcePage,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    createdAtIso: lead.createdAt,
    persisted,
    quotaWarning,
  };

  let emailOk = false;
  let quotaAvailable = true;
  if (persisted && db) {
    try { quotaAvailable = await reserveEmailQuota(db, dateUtc, limits.resendDailyCap); }
    catch { quotaAvailable = false; console.warn(JSON.stringify({ requestId, code: "quota_store_unavailable_queued" })); }
  }
  if (quotaWarning) console.warn(JSON.stringify({ requestId, code: "email_quota_warning" }));
  try {
    if (!quotaAvailable) {
      console.warn(JSON.stringify({ requestId, code: "email_quota_exhausted_queued" }));
      return noJs ? redirect("/enquiry-received", 303) : json({ ok: true }, 200);
    }
    const provider = createEmailProvider(runtimeEnv.EMAIL_PROVIDER ?? "resend", runtimeEnv.RESEND_API_KEY);
    const result = await sendWithRetry(provider, payload, siteConfig.leadNotificationEmail, `${siteConfig.businessName} <leads@${siteConfig.domain}>`);
    emailOk = result.ok;
    if (persisted && db) {
      await updateLeadEmailStatus(db, lead.id, result.ok ? "sent" : "failed", result.error);
    }
  } catch (err) {
    console.error(JSON.stringify({ requestId, level: "error", message: "email_send_threw", error: String(err) }));
  }

  // 11. Respond. A lead is a success if it was persisted OR emailed — only
  // fail the user when BOTH storage and notification failed.
  if (!persisted && !emailOk) {
    return fail(
      502,
      "both_failed",
      "Something went wrong on our side and we couldn't record your enquiry. Please message us on WhatsApp or call us directly and we'll pick it up straight away.",
    );
  }

  if (noJs) {
    return redirect("/enquiry-received", 303);
  }
  return json({ ok: true }, 200);
};

export const GET: APIRoute = () => json({ ok: false, message: "Method not allowed" }, 405);
