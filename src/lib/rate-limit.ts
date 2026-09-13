/**
 * D1-backed rate limiting. We deliberately do NOT use Workers KV here: the
 * free KV plan caps writes at ~1,000/day, which a rate limiter would burn
 * through immediately (see INFRASTRUCTURE.md). D1's free write quota
 * (~100k rows/day) comfortably covers this.
 */

export interface RateLimitCheck {
  allowed: boolean;
  scope: string;
  current: number;
  limit: number;
}

function hourBucket(now: Date): string {
  return `${now.toISOString().slice(0, 13)}h`; // e.g. 2026-09-13T10h
}

function dayBucket(now: Date): string {
  return now.toISOString().slice(0, 10); // e.g. 2026-09-13
}

async function incrementAndCheck(db: D1Database, scope: string, bucket: string, limit: number): Promise<RateLimitCheck> {
  await db
    .prepare(
      `INSERT INTO rate_limit_counters (scope, bucket, count) VALUES (?1, ?2, 1)
       ON CONFLICT (scope, bucket) DO UPDATE SET count = count + 1`,
    )
    .bind(scope, bucket)
    .run();

  const row = await db
    .prepare(`SELECT count FROM rate_limit_counters WHERE scope = ?1 AND bucket = ?2`)
    .bind(scope, bucket)
    .first<{ count: number }>();

  const current = row?.count ?? 1;
  return { allowed: current <= limit, scope, current, limit };
}

export async function checkIpRateLimit(db: D1Database, ipHash: string, limitPerHour: number): Promise<RateLimitCheck> {
  return incrementAndCheck(db, `ip:${ipHash}`, hourBucket(new Date()), limitPerHour);
}

export async function checkPhoneRateLimit(db: D1Database, phoneE164: string, limitPerDay: number): Promise<RateLimitCheck> {
  return incrementAndCheck(db, `phone:${phoneE164}`, dayBucket(new Date()), limitPerDay);
}

export async function checkGlobalRateLimit(db: D1Database, limitPerHour: number): Promise<RateLimitCheck> {
  return incrementAndCheck(db, "global", hourBucket(new Date()), limitPerHour);
}
