import type { APIRoute } from "astro";
import { env as runtimeEnv } from "cloudflare:workers";
import { enquirySchema, MAX_ENQUIRY_PAYLOAD_BYTES } from "@/lib/validation";
import { getClientIp, hashIp } from "@/lib/ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkGlobalRateLimit, checkIpRateLimit, checkPhoneRateLimit } from "@/lib/rate-limit";
import { getDailyEmailCount, incrementDailyEmailCount, insertLead, leadFromInput, logSpam, updateLeadEmailStatus } from "@/lib/leads";
import { createEmailProvider, sendWithRetry, type LeadEmailPayload } from "@/lib/email";
import { ConfigError, getIpHashSalt, getRateLimits, requireD1 } from "@/lib/config-validate";
import { siteConfig } from "@config/site";

export const prerender = false;

const MIN_HUMAN_SUBMIT_MS = 2500;

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

  const fail = (status: number, code: string, message: string, referer?: string) => {
    console.error(JSON.stringify({ requestId, level: "error", code, message }));
    if (noJs) {
      const back = referer ?? request.headers.get("referer") ?? "/contact";
      const url = new URL(back);
      url.searchParams.set("enquiry_error", code);
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
    if (noJs) {
      const fd = await request.formData();
      formData = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    } else {
      formData = await request.json();
    }
  } catch {
    return fail(400, "bad_body", "We couldn't read that submission.");
  }

  let db;
  let ipHashSalt;
  try {
    db = requireD1(runtimeEnv);
    ipHashSalt = getIpHashSalt(runtimeEnv);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(JSON.stringify({ requestId, level: "fatal", message: err.message }));
      return fail(500, "server_misconfigured", "Something went wrong on our side. Please message us on WhatsApp or call us and we'll pick it up straight away.");
    }
    throw err;
  }

  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, ipHashSalt);
  const limits = getRateLimits(runtimeEnv);

  // 3. Honeypot.
  if (formData.honeypot && formData.honeypot.length > 0) {
    await logSpam(db, "honeypot", ipHash, formData.pageSource ?? "");
    return noJs ? redirect("/enquiry-received", 303) : json({ ok: true, leadId: null }, 200); // generic success to the bot
  }

  // 4. Submit-timing check.
  const renderedAt = Number(formData.formRenderedAt ?? "0");
  if (renderedAt > 0 && Date.now() - renderedAt < MIN_HUMAN_SUBMIT_MS) {
    await logSpam(db, "too_fast", ipHash, formData.pageSource ?? "");
    return fail(400, "too_fast", "Please try submitting again.");
  }

  // 5. Turnstile verification (fails open on infra errors, tightens rate limit instead).
  const turnstile = await verifyTurnstile(formData.turnstileToken, runtimeEnv.TURNSTILE_SECRET_KEY, ip);
  const turnstileDegraded = turnstile.outcome === "failed" || turnstile.outcome === "skipped";
  if (turnstile.outcome === "unverified") {
    await logSpam(db, "turnstile_failed", ipHash, formData.pageSource ?? "");
    return fail(400, "verification_failed", "We couldn't verify you're human. Please try again or message us on WhatsApp.");
  }

  // 6. Schema validation + sanitisation.
  const parsed = enquirySchema.safeParse(formData);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.message === "spam") {
      await logSpam(db, "phrase_filter", ipHash, formData.pageSource ?? "");
      return fail(400, "invalid", "Please check your submission and try again.");
    }
    return fail(400, "invalid", firstIssue?.message ?? "Please check your submission and try again.");
  }
  const input = parsed.data;

  // 7. Rate limiting (stricter effective limits when Turnstile is degraded).
  const degradeFactor = turnstileDegraded ? 0.4 : 1;
  const [ipLimit, phoneLimit, globalLimit] = await Promise.all([
    checkIpRateLimit(db, ipHash, Math.max(1, Math.floor(limits.perIpPerHour * degradeFactor))),
    checkPhoneRateLimit(db, input.phone, Math.max(1, Math.floor(limits.perPhonePerDay * degradeFactor))),
    checkGlobalRateLimit(db, limits.globalPerHour),
  ]);
  if (!ipLimit.allowed || !phoneLimit.allowed || !globalLimit.allowed) {
    return fail(429, "rate_limited", "You've submitted a few times already — please wait a bit, or message us directly on WhatsApp.");
  }

  // 8. Persist FIRST.
  const lead = leadFromInput(input, { ipHash, turnstileStatus: turnstile.outcome });
  let persisted = true;
  try {
    await insertLead(db, lead);
  } catch (err) {
    persisted = false;
    console.error(JSON.stringify({ requestId, level: "error", message: "d1_insert_failed", error: String(err) }));
  }

  // 9. Send notification email (persisted or not — a lead must never be silently dropped).
  const dateUtc = new Date().toISOString().slice(0, 10);
  const sentToday = persisted ? await getDailyEmailCount(db, dateUtc).catch(() => 0) : 0;
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
  try {
    const provider = createEmailProvider(runtimeEnv.EMAIL_PROVIDER ?? "resend", runtimeEnv.RESEND_API_KEY);
    const result = await sendWithRetry(provider, payload, siteConfig.leadNotificationEmail, `${siteConfig.businessName} <leads@${siteConfig.domain}>`);
    emailOk = result.ok;
    if (persisted) {
      await updateLeadEmailStatus(db, lead.id, result.ok ? "sent" : "failed", result.error);
      if (result.ok) await incrementDailyEmailCount(db, dateUtc);
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
    const url = new URL("/enquiry-received", request.url);
    url.searchParams.set("name", input.name);
    url.searchParams.set("category", input.category);
    url.searchParams.set("phone", input.phone);
    return redirect(url.toString(), 303);
  }
  return json({ ok: true, leadId: persisted ? lead.id : null }, 200);
};

export const GET: APIRoute = () => json({ ok: false, message: "Method not allowed" }, 405);
