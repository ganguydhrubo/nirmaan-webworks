# MONITORING.md

How to check quota headroom on the free stack, what the warning thresholds are, and the cheapest upgrade path for each service if a ceiling is hit. See INFRASTRUCTURE.md for the source limits this table is built from (re-verify against each provider's current pricing page periodically — free-tier terms change).

## Quick health check

`GET /api/health` reports D1 reachability and today's email send count vs. the configured daily cap (`RESEND_DAILY_CAP`, default 100) without calling the email provider. Point an uptime monitor (even a free one like UptimeRobot, outside this stack) at this endpoint.

## Quota table

| Metric | Where to check | Warning (80%) | Hard ceiling | What happens at ceiling | Cheapest upgrade |
|---|---|---|---|---|---|
| Workers requests/day | Cloudflare dashboard → Workers & Pages → your worker → Metrics | 80,000/day | 100,000/day (free plan) | Requests beyond the daily cap are throttled/rejected until the next UTC day | Workers Paid: $5/month, 10M requests included |
| D1 rows read/day | Cloudflare dashboard → D1 → your database → Metrics | ~4M/day | ~5M/day (free plan) | Queries fail with an error once the daily cap is crossed (strict enforcement since Sep 2026 per INFRASTRUCTURE.md) | D1 on Workers Paid: pay-as-you-go beyond included rows |
| D1 rows written/day | Same as above | ~80k/day | ~100k/day (free plan) | Same — writes fail with an error | Same |
| D1 storage | Cloudflare dashboard → D1 → your database | 4 GB | 5 GB (free plan) | New writes fail once storage is full | Workers Paid tier raises the cap |
| Resend emails/day | Resend dashboard → Usage, or `GET /api/health`'s `email_quota` check | 80/day | 100/day (free plan) | `sendWithRetry` fails; the lead is still persisted in D1 (never dropped) and the retry worker (`workers/retry-worker.ts`) picks it up on the next 30-minute sweep, checking the quota again before resending | Resend Pro: $20/month, 50,000 emails/month |
| Resend emails/month | Resend dashboard → Usage | 2,400/month | 3,000/month (free plan) | Same as above | Same |
| Turnstile siteverify calls/month | Cloudflare dashboard → Turnstile → your widget → Analytics | ~800k/month | ~1M/month (free plan, per INFRASTRUCTURE.md) | Cloudflare's own docs describe no hard block at this volume for end users, but re-verify current terms before relying on that | N/A — Turnstile has no paid tier; if this is ever actually approached, traffic has outgrown a brochure site's needs entirely |
| Cron Trigger invocations (retry worker) | Cloudflare dashboard → your retry worker → Metrics | — | Counts against the same 100k/day Workers request pool, but at 48 invocations/day (every 30 min) this is not a realistic constraint | — | — |

## What to actually watch week to week

For a new site, the binding constraint is almost never bandwidth (Cloudflare serves static assets free and unmetered) — it's the **Resend email cap**. 100 emails/day sounds like a lot until you remember every genuine enquiry AND every retry attempt AND any manual re-send all count against it. If daily enquiry volume regularly approaches 80-100/day, that's a good problem (the business is getting real traffic) and the fix is a $20/month Resend upgrade, not an architecture change.

## Alerting (not automated in this build)

No automated alerting is wired up — this build has no live account to configure it against. The recommended, still-free approach once deployed: Cloudflare's dashboard supports email notifications on Workers error-rate thresholds (Notifications → Create → Workers). Set one for the main worker and one for the retry worker.
