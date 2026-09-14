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
  status: "sent" | "failed" | "abandoned" | "skipped" | "pending" | "processing",
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

export async function findRecentDuplicateLead(
  db: D1Database,
  phoneE164: string,
  category: string,
  windowMinutes = 15,
): Promise<{ id: string; createdAt: string } | null> {
  const row = await db
    .prepare(
      `SELECT id, created_at FROM leads
       WHERE phone_e164 = ?1 AND category = ?2
         AND datetime(created_at) > datetime('now', '-' || ?3 || ' minutes')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(phoneE164, category, windowMinutes)
    .first<{ id: string; created_at: string }>();
  return row ? { id: row.id, createdAt: row.created_at } : null;
}

export async function getDailyEmailCount(db: D1Database, dateUtc: string): Promise<number> {
  const row = await db
    .prepare(`SELECT sent_count FROM email_quota_daily WHERE date = ?1`)
    .bind(dateUtc)
    .first<{ sent_count: number }>();
  return row?.sent_count ?? 0;
}

export async function getMonthlyEmailCount(db: D1Database, monthUtc: string): Promise<number> {
  try {
    const row = await db
      .prepare(`SELECT sent_count FROM email_quota_monthly WHERE month = ?1`)
      .bind(monthUtc)
      .first<{ sent_count: number }>();
    if (row && typeof row.sent_count === "number") return row.sent_count;
  } catch {
    // Fallback to summing daily table
  }
  const sumRow = await db
    .prepare(`SELECT COALESCE(SUM(sent_count), 0) as total FROM email_quota_daily WHERE date LIKE ?1 || '%'`)
    .bind(monthUtc)
    .first<{ total: number }>();
  return sumRow?.total ?? 0;
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

/** Atomically reserve quota before sending. Failed/ambiguous sends retain a
 * reservation: underusing a free quota is safer than overshooting it.
 * Checks both daily cap and monthly cap. */
export async function reserveEmailQuota(
  db: D1Database,
  dateUtc: string,
  dailyCap: number,
  monthlyCap = 3000,
): Promise<boolean> {
  const monthUtc = dateUtc.slice(0, 7);
  const monthlyCount = await getMonthlyEmailCount(db, monthUtc);
  if (monthlyCount >= monthlyCap) {
    return false;
  }

  const result = await db.prepare(
    `INSERT INTO email_quota_daily (date, sent_count) VALUES (?1, 1)
     ON CONFLICT (date) DO UPDATE SET sent_count = sent_count + 1
     WHERE sent_count < ?2 RETURNING sent_count`,
  ).bind(dateUtc, dailyCap).first<{ sent_count: number }>();

  if (!result) return false;

  try {
    await db.prepare(
      `INSERT INTO email_quota_monthly (month, sent_count) VALUES (?1, 1)
       ON CONFLICT (month) DO UPDATE SET sent_count = sent_count + 1`,
    ).bind(monthUtc).run();
  } catch {
    // Fallback if monthly table is not present
  }

  return true;
}

/** Atomically claim a lead for retry to prevent concurrent sweeps from double-sending */
export async function claimLeadForEmail(db: D1Database, leadId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const res = await db.prepare(
    `UPDATE leads
     SET email_status = 'processing', email_last_attempt_at = ?2, updated_at = ?2
     WHERE id = ?1 AND (
       email_status IN ('failed', 'pending')
       OR (email_status = 'processing' AND datetime(updated_at) < datetime('now', '-10 minutes'))
     )`,
  ).bind(leadId, now).run();
  return (res.meta?.changes ?? 0) > 0;
}

/** Retention cleanup for DPDP data minimization */
export async function cleanupOldRecords(db: D1Database): Promise<{ spamDeleted: number; countersDeleted: number; eventsDeleted: number }> {
  const spam = await db.prepare(`DELETE FROM spam_log WHERE datetime(created_at) < datetime('now', '-90 days')`).run();
  const counters = await db.prepare(`DELETE FROM rate_limit_counters WHERE bucket < date('now', '-7 days')`).run();
  const events = await db.prepare(`DELETE FROM analytics_events WHERE datetime(created_at) < datetime('now', '-180 days')`).run();
  return {
    spamDeleted: spam.meta?.changes ?? 0,
    countersDeleted: counters.meta?.changes ?? 0,
    eventsDeleted: events.meta?.changes ?? 0,
  };
}
