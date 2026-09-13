import type { EmailProvider } from "./types";
import { ResendEmailProvider } from "./resend";
import { NoneEmailProvider } from "./none";

export * from "./types";
export { buildLeadEmailHtml, buildLeadEmailSubject, buildLeadEmailText } from "./template";
export { sendWithRetry } from "./resend";

export function createEmailProvider(kind: string, apiKey: string | undefined): EmailProvider {
  switch (kind) {
    case "resend":
      if (!apiKey) {
        throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
      }
      return new ResendEmailProvider(apiKey);
    case "smtp":
      // Documented alternative, not implemented: see ARCHITECTURE.md "Email provider
      // alternatives" for why Resend was chosen first. Swapping in an SMTP-based
      // provider (e.g. via a transactional API like Brevo/MailerSend/ZeptoMail) means
      // implementing EmailProvider and returning it here — no other file changes.
      throw new Error("EMAIL_PROVIDER=smtp is not implemented yet — see ARCHITECTURE.md");
    case "none":
      return new NoneEmailProvider();
    default:
      throw new Error(`Unknown EMAIL_PROVIDER: ${kind}`);
  }
}
