-- Migration 0002: Monthly email quota tracking, lead deduplication and claim locking.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS email_quota_monthly (
  month TEXT PRIMARY KEY,              -- YYYY-MM in UTC
  sent_count INTEGER NOT NULL DEFAULT 0
);

-- Index for rapid deduplication lookup
CREATE INDEX IF NOT EXISTS idx_leads_dedup ON leads (phone_e164, category, created_at);
