/**
 * Standalone Cloudflare Worker, deployed separately from the main Astro
 * site, whose only job is to sweep D1 for leads whose notification email
 * failed or is stuck pending, and retry them.
 *
 * WHY A SEPARATE WORKER: Astro's Cloudflare adapter (@astrojs/cloudflare)
 * builds a worker that exports a `fetch` handler; it does not currently
 * expose a way to also export a `scheduled` handler for Cron Triggers. Bolting
 * a scheduled handler onto the generated dist/_worker.js would mean patching
 * a build artifact, which is fragile. A small, independently deployed worker
 * bound to the same D1 database is simpler, easier to reason about, and
 * documented here rather than hidden inside a build hack. See
 * ARCHITECTURE.md "Retry cron" for the alternatives considered.
 *
 * Deploy with: wrangler deploy --config wrangler.retry.jsonc
 * Schedule: configured in wrangler.retry.jsonc (every 30 minutes).
 */
import { createEmailProvider, sendWithRetry, type LeadEmailPayload } from "../src/lib/email";
import { claimLeadForEmail, cleanupOldRecords, getDailyEmailCount, reserveEmailQuota, updateLeadEmailStatus } from "../src/lib/leads";

export interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  EMAIL_PROVIDER?: string;
  RESEND_DAILY_CAP?: string;
  LEAD_NOTIFICATION_EMAIL: string;
  FROM_EMAIL: string;
}

const MAX_RETRY_ATTEMPTS = 5;
const SWEEP_BATCH_SIZE = 25;

interface FailedLeadRow {
  id: string;
  created_at: string;
  name: string;
  phone_e164: string;
  email: string;
  business_name: string;
  category: string;
  needs: string;
  message: string;
  source_page: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  email_attempts: number;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const dailyCap = Number(env.RESEND_DAILY_CAP ?? "100");
    const dateUtc = new Date().toISOString().slice(0, 10);
    const sentToday = await getDailyEmailCount(env.DB, dateUtc);
    if (sentToday >= dailyCap) {
      console.log(JSON.stringify({ level: "warn", message: "retry_sweep_skipped_quota_exhausted", sentToday, dailyCap }));
      return;
    }

    const { results } = await env.DB.prepare(
      `SELECT id, created_at, name, phone_e164, email, business_name, category, needs, message,
              source_page, utm_source, utm_medium, utm_campaign, email_attempts
       FROM leads
       WHERE (email_status IN ('failed', 'pending') OR (email_status = 'processing' AND datetime(updated_at) < datetime('now', '-10 minutes')))
         AND email_attempts < ?1
         AND datetime(created_at) < datetime('now', '-5 minutes')
       ORDER BY created_at ASC
       LIMIT ?2`,
    )
      .bind(MAX_RETRY_ATTEMPTS, SWEEP_BATCH_SIZE)
      .all<FailedLeadRow>();

    if (!results || results.length === 0) return;

    const provider = createEmailProvider(env.EMAIL_PROVIDER ?? "resend", env.RESEND_API_KEY);

    for (const row of results) {
      // 1. Atomically claim row to prevent overlapping workers from double-sending
      const claimed = await claimLeadForEmail(env.DB, row.id);
      if (!claimed) continue;

      // 2. Reserve quota
      const quotaReserved = await reserveEmailQuota(env.DB, dateUtc, dailyCap);
      if (!quotaReserved) {
        // Revert to pending if quota exhausted
        await updateLeadEmailStatus(env.DB, row.id, "pending", "quota_exhausted_during_sweep");
        break;
      }

      const payload: LeadEmailPayload = {
        leadId: row.id,
        name: row.name,
        phoneE164: row.phone_e164,
        email: row.email,
        businessName: row.business_name,
        category: row.category,
        needs: row.needs,
        message: row.message,
        sourcePage: row.source_page,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        createdAtIso: row.created_at,
        persisted: true,
        quotaWarning: false,
      };

      const result = await sendWithRetry(provider, payload, env.LEAD_NOTIFICATION_EMAIL, env.FROM_EMAIL, 2);
      const nextAttempts = row.email_attempts + 1;
      const nextStatus = result.ok ? "sent" : nextAttempts >= MAX_RETRY_ATTEMPTS ? "abandoned" : "failed";

      await env.DB.prepare(
        `UPDATE leads SET email_status = ?2, email_error = ?3, email_attempts = ?4, email_last_attempt_at = ?5, updated_at = ?5 WHERE id = ?1`,
      )
        .bind(row.id, nextStatus, result.error ?? null, nextAttempts, new Date().toISOString())
        .run();

      if (nextStatus === "abandoned") {
        console.error(JSON.stringify({
          level: "fatal",
          message: "lead_email_abandoned_requires_manual_attention",
          leadId: row.id,
          phoneE164: row.phone_e164,
          attempts: nextAttempts,
          lastError: result.error,
        }));
      }
    }

    // Run DPDP retention cleanup once per sweep
    try {
      const cleaned = await cleanupOldRecords(env.DB);
      if (cleaned.spamDeleted || cleaned.countersDeleted || cleaned.eventsDeleted) {
        console.log(JSON.stringify({ level: "info", message: "retention_cleanup_completed", ...cleaned }));
      }
    } catch (cleanErr) {
      console.warn(JSON.stringify({ level: "warn", message: "retention_cleanup_failed", error: String(cleanErr) }));
    }
  },
};
