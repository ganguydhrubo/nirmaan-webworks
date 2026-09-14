-- Migration 0001: initial schema for leads, spam log and email quota tracking.
-- Idempotent: safe to re-run because every statement uses IF NOT EXISTS.
-- Apply with: wrangler d1 migrations apply webjobs_site_leads --local|--remote

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,                 -- crypto.randomUUID()
  created_at TEXT NOT NULL,            -- ISO 8601 UTC
  updated_at TEXT NOT NULL,

  name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  email TEXT,
  business_name TEXT,
  category TEXT NOT NULL,
  needs TEXT NOT NULL,
  message TEXT,
  consent INTEGER NOT NULL DEFAULT 0,  -- 0/1

  source_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  ip_hash TEXT,                        -- SHA-256(IP + salt), never raw IP (DPDP minimisation)

  status TEXT NOT NULL DEFAULT 'received',       -- received | not_persisted | archived
  turnstile_status TEXT NOT NULL DEFAULT 'unknown', -- verified | unverified | skipped | failed

  email_status TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed | abandoned | skipped
  email_error TEXT,
  email_attempts INTEGER NOT NULL DEFAULT 0,
  email_last_attempt_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone_e164);
CREATE INDEX IF NOT EXISTS idx_leads_ip_hash ON leads (ip_hash);
CREATE INDEX IF NOT EXISTS idx_leads_email_status ON leads (email_status);

-- Bot / honeypot / timing / spam-heuristic hits. Kept separate from `leads`
-- so spam never pollutes the real pipeline or counts against quotas.
CREATE TABLE IF NOT EXISTS spam_log (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  reason TEXT NOT NULL,               -- honeypot | too_fast | turnstile_failed | phrase_filter | oversized
  ip_hash TEXT,
  source_page TEXT
);

CREATE INDEX IF NOT EXISTS idx_spam_log_created_at ON spam_log (created_at);

-- Daily counters for provider-quota awareness (Resend free tier: 100/day, 3000/month).
CREATE TABLE IF NOT EXISTS email_quota_daily (
  date TEXT PRIMARY KEY,              -- YYYY-MM-DD in UTC
  sent_count INTEGER NOT NULL DEFAULT 0
);

-- Generic rate-limit counters, keyed by a scope string (e.g. "ip:<hash>" or "phone:<e164>")
-- and a bucket string (e.g. hour-of-day or day). D1 is used instead of KV because the
-- free KV write quota (~1,000/day) is too low to be a dependable write path (see
-- INFRASTRUCTURE.md).
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  scope TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, bucket)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  event_name TEXT NOT NULL,           -- e.g. whatsapp_click, demo_view, enquiry_submit
  page_path TEXT,
  demo_slug TEXT,
  category TEXT,
  meta TEXT                           -- small JSON blob, no PII
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events (event_name);
