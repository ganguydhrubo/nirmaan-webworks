export type TurnstileOutcome = "verified" | "unverified" | "skipped" | "failed";

export interface TurnstileResult {
  outcome: TurnstileOutcome;
  reason?: string;
}

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

/**
 * Verifies a Turnstile token server-side. Fails OPEN on infrastructure
 * problems (network error, timeout, 5xx from Cloudflare) so a broken
 * CAPTCHA never blocks a genuine lead — callers must apply a stricter rate
 * limit when outcome is "failed" or "skipped" (see api/enquiry.ts).
 */
export async function verifyTurnstile(
  token: string | undefined,
  secretKey: string | undefined,
  remoteIp: string,
): Promise<TurnstileResult> {
  if (!secretKey) {
    return { outcome: "skipped", reason: "no_secret_configured" };
  }
  if (!token) {
    // No token could mean the Turnstile script failed to load client-side —
    // NOT necessarily a bot. Degrade to stricter rate limiting rather than
    // blocking a genuine lead (see Section 8.5 dependency-failure matrix).
    return { outcome: "skipped", reason: "no_token_supplied" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token, remoteip: remoteIp });
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body, signal: controller.signal });

    if (!res.ok) {
      return { outcome: "failed", reason: `siteverify_http_${res.status}` };
    }

    const json = (await res.json()) as { success: boolean; ["error-codes"]?: string[] };
    if (json.success) return { outcome: "verified" };
    return { outcome: "unverified", reason: json["error-codes"]?.join(",") ?? "rejected" };
  } catch (err) {
    return { outcome: "failed", reason: err instanceof Error ? err.message : "unknown_error" };
  } finally {
    clearTimeout(timeout);
  }
}
