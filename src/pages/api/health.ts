import type { APIRoute } from "astro";
import { env as runtimeEnv } from "cloudflare:workers";
import { getDailyEmailCount } from "@/lib/leads";
import { getRateLimits } from "@/lib/config-validate";

export const prerender = false;

export const GET: APIRoute = async () => {

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // D1 reachability.
  if (runtimeEnv.DB) {
    try {
      await runtimeEnv.DB.prepare("SELECT 1").first();
      checks.d1 = { ok: true };
    } catch (err) {
      checks.d1 = { ok: false, detail: err instanceof Error ? err.message : "unknown_error" };
    }
  } else {
    checks.d1 = { ok: false, detail: "no_binding" };
  }

  // Email quota headroom (informational only — does not call the provider).
  const limits = getRateLimits(runtimeEnv);
  if (runtimeEnv.DB && checks.d1.ok) {
    try {
      const dateUtc = new Date().toISOString().slice(0, 10);
      const sentToday = await getDailyEmailCount(runtimeEnv.DB, dateUtc);
      checks.email_quota = {
        ok: sentToday < limits.resendDailyCap,
        detail: `${sentToday}/${limits.resendDailyCap} sent today (UTC)`,
      };
    } catch (err) {
      checks.email_quota = { ok: false, detail: err instanceof Error ? err.message : "unknown_error" };
    }
  }

  checks.email_provider_configured = { ok: !!runtimeEnv.RESEND_API_KEY };
  checks.turnstile_configured = { ok: !!runtimeEnv.TURNSTILE_SECRET_KEY };

  const healthy = Object.values(checks).every((c) => c.ok);

  return new Response(JSON.stringify({ ok: healthy, checks, timestamp: new Date().toISOString() }, null, 2), {
    status: healthy ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
};
