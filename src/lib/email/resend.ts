import type { EmailProvider, LeadEmailPayload, SendResult } from "./types";
import { buildLeadEmailHtml, buildLeadEmailSubject, buildLeadEmailText } from "./template";

const RESEND_API_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

/**
 * Resend provider. Chosen over Brevo/MailerSend/ZeptoMail/SES because its free
 * tier needs no card, has the simplest single-endpoint API, and its 100/day +
 * 3,000/month caps comfortably exceed the volume a new brochure site expects
 * (see INFRASTRUCTURE.md for the comparison of alternatives).
 */
export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async sendLeadEmail(payload: LeadEmailPayload, to: string, from: string): Promise<SendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `lead/${payload.leadId}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: payload.email || undefined,
          subject: buildLeadEmailSubject(payload),
          text: buildLeadEmailText(payload),
          html: buildLeadEmailHtml(payload),
        }),
        signal: controller.signal,
      });

      if (res.ok) return { ok: true };

      // Never leak provider response bodies to end users; log server-side only.
      const status = res.status;
      return { ok: false, error: `resend_http_${status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Send with retry: up to 3 attempts, exponential backoff with jitter. */
export async function sendWithRetry(provider: EmailProvider, payload: LeadEmailPayload, to: string, from: string, maxAttempts = 3): Promise<SendResult> {
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await provider.sendLeadEmail(payload, to, from);
    if (result.ok) return result;
    lastError = result.error;
    if (lastError === "email_provider_disabled" || /^resend_http_4(?!29)/.test(lastError ?? "")) return result;
    if (attempt < maxAttempts) {
      const backoffMs = 300 * 2 ** (attempt - 1);
      const jitterMs = Math.random() * 150;
      await new Promise((r) => setTimeout(r, backoffMs + jitterMs));
    }
  }
  return { ok: false, error: lastError };
}
