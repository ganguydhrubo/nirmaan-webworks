import type { EnquiryInput } from "./validation";

export interface LeadRecord {
  id: string;
  createdAt: string;
  name: string;
  phoneE164: string;
  email: string;
  businessName: string;
  category: string;
  needs: string;
  message: string;
  consent: boolean;
  sourcePage: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  ipHash: string;
  turnstileStatus: string;
}

export async function insertLead(db: D1Database, lead: LeadRecord): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO leads (
        id, created_at, updated_at, name, phone_e164, email, business_name, category, needs,
        message, consent, source_page, referrer, utm_source, utm_medium, utm_campaign, utm_term,
        utm_content, ip_hash, status, turnstile_status, email_status
      ) VALUES (?1,?2,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,'received',?19,'pending')`,
    )
    .bind(
      lead.id,
      now,
      lead.name,
      lead.phoneE164,
      lead.email,
      lead.businessName,
      lead.category,
      lead.needs,
      lead.message,
      lead.consent ? 1 : 0,
      lead.sourcePage,
      lead.referrer,
      lead.utmSource,
      lead.utmMedium,
      lead.utmCampaign,
      lead.utmTerm,
      lead.utmContent,
      lead.ipHash,
      lead.turnstileStatus,
    )
    .run();
}

export async function updateLeadEmailStatus(
  db: D1Database,
  id: string,
  status: "sent" | "failed" | "abandoned" | "skipped",
  error?: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE leads SET email_status = ?2, email_error = ?3, email_attempts = email_attempts + 1,
       email_last_attempt_at = ?4, updated_at = ?4 WHERE id = ?1`,
    )
    .bind(id, status, error ?? null, new Date().toISOString())
    .run();
}

export async function logSpam(db: D1Database, reason: string, ipHash: string, sourcePage: string): Promise<void> {
  await db
    .prepare(`INSERT INTO spam_log (id, created_at, reason, ip_hash, source_page) VALUES (?1,?2,?3,?4,?5)`)
    .bind(crypto.randomUUID(), new Date().toISOString(), reason, ipHash, sourcePage)
    .run();
}

export function leadFromInput(input: EnquiryInput, meta: { ipHash: string; turnstileStatus: string }): LeadRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: input.name,
    phoneE164: input.phone,
    email: input.email ?? "",
    businessName: input.businessName ?? "",
    category: input.category,
    needs: input.needs,
    message: input.message ?? "",
    consent: input.consent,
    sourcePage: input.pageSource ?? "",
    referrer: input.referrer ?? "",
    utmSource: input.utmSource ?? "",
    utmMedium: input.utmMedium ?? "",
    utmCampaign: input.utmCampaign ?? "",
    utmTerm: input.utmTerm ?? "",
    utmContent: input.utmContent ?? "",
    ipHash: meta.ipHash,
    turnstileStatus: meta.turnstileStatus,
  };
}

export async function getDailyEmailCount(db: D1Database, dateUtc: string): Promise<number> {
  const row = await db
    .prepare(`SELECT sent_count FROM email_quota_daily WHERE date = ?1`)
    .bind(dateUtc)
    .first<{ sent_count: number }>();
  return row?.sent_count ?? 0;
}

export async function incrementDailyEmailCount(db: D1Database, dateUtc: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO email_quota_daily (date, sent_count) VALUES (?1, 1)
       ON CONFLICT (date) DO UPDATE SET sent_count = sent_count + 1`,
    )
    .bind(dateUtc)
    .run();
}
