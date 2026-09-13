import type { EmailProvider, SendResult } from "./types";

/** Used only when EMAIL_PROVIDER=none — local dev / tests without hitting a real provider. */
export class NoneEmailProvider implements EmailProvider {
  async sendLeadEmail(): Promise<SendResult> {
    return { ok: false, error: "email_provider_disabled" };
  }
}
