/**
 * Usage limits for the builder's AI endpoints ("free within limits").
 *
 *   BUILDER_AI_DAILY_LIMIT_PER_IP      default 8   text AI requests (generate/edit) per visitor per UTC day
 *   BUILDER_AI_DAILY_LIMIT_GLOBAL      default 150 text AI requests across all visitors per day
 *   BUILDER_IMAGE_DAILY_LIMIT_PER_IP   default 4   AI images per visitor per day
 *   BUILDER_IMAGE_DAILY_LIMIT_GLOBAL   default 40  AI images across all visitors per day
 *   BUILDER_PUBLISH_DAILY_LIMIT_PER_IP  default 10  live publishes per visitor per day
 *   BUILDER_PUBLISH_DAILY_LIMIT_GLOBAL  default 300 live publishes across all visitors per day
 *     (Cloudflare KV free plan: 1,000 writes/day — one write per publish)
 *
 * Failed requests are refunded (refund()), so a provider outage never eats a
 * visitor's free allowance. One AI request per visitor runs at a time
 * (acquireSlot) so double-clicks or re-renders can't fan out into parallel
 * paid calls.
 *
 * Durability: with D1 (Cloudflare) counters are shared across instances via
 * the existing rate_limit_counters table. On Vercel there is no shared store,
 * so counters live in instance memory: they stop a visitor hammering a warm
 * instance but reset on cold starts. The providers' own quotas are the hard
 * backstop there. See docs/AI-WEBSITE-BUILDER.md.
 */
import { getRuntimeEnv } from "@/lib/runtime-env";
import { getClientIp, hashIp } from "@/lib/ip";
import { dayBucket, incrementAndCheck } from "@/lib/rate-limit";

export type QuotaKind = "text" | "image" | "publish";

export interface QuotaResult {
  allowed: boolean;
  /** Requests of this kind the visitor has left today (after this one, if allowed). */
  remaining: number;
  limit: number;
  reason?: "visitor" | "global";
  durable: boolean;
  /** Give the credit back (call when the AI request failed). Safe to call once. */
  refund: () => Promise<void>;
}

const memory = new Map<string, number>();

function memoryAdd(key: string, delta: number): number {
  // Drop old-day keys so the map can't grow without bound.
  const today = dayBucket(new Date());
  if (memory.size > 5000) for (const k of memory.keys()) if (!k.endsWith(today)) memory.delete(k);
  const next = Math.max(0, (memory.get(key) ?? 0) + delta);
  memory.set(key, next);
  return next;
}

function intEnv(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getQuotaLimits(kind: QuotaKind = "text"): Promise<{ perIp: number; global: number }> {
  const env = await getRuntimeEnv();
  if (kind === "publish") return { perIp: intEnv(env.BUILDER_PUBLISH_DAILY_LIMIT_PER_IP, 10), global: intEnv(env.BUILDER_PUBLISH_DAILY_LIMIT_GLOBAL, 300) };
  return kind === "image"
    ? { perIp: intEnv(env.BUILDER_IMAGE_DAILY_LIMIT_PER_IP, 4), global: intEnv(env.BUILDER_IMAGE_DAILY_LIMIT_GLOBAL, 40) }
    : { perIp: intEnv(env.BUILDER_AI_DAILY_LIMIT_PER_IP, 8), global: intEnv(env.BUILDER_AI_DAILY_LIMIT_GLOBAL, 150) };
}

export async function visitorKey(request: Request): Promise<string> {
  const env = await getRuntimeEnv();
  return hashIp(getClientIp(request), env.IP_HASH_SALT || "builder-quota-fallback-salt");
}

async function d1Decrement(db: D1Database, scope: string, bucket: string): Promise<void> {
  await db.prepare(`UPDATE rate_limit_counters SET count = MAX(count - 1, 0) WHERE scope = ?1 AND bucket = ?2`).bind(scope, bucket).run();
}

export async function consumeCredit(request: Request, kind: QuotaKind = "text"): Promise<QuotaResult> {
  const env = await getRuntimeEnv();
  const limits = await getQuotaLimits(kind);
  const ipHash = await visitorKey(request);
  const bucket = dayBucket(new Date());
  const prefix = kind === "image" ? "builder-img" : kind === "publish" ? "builder-pub" : "builder";
  const visitorScope = `${prefix}-ip:${ipHash}`;
  const globalScope = `${prefix}-global`;
  let refunded = false;
  const noop = async () => {};

  if (env.DB) {
    const db = env.DB;
    const visitor = await incrementAndCheck(db, visitorScope, bucket, limits.perIp);
    if (!visitor.allowed) {
      await d1Decrement(db, visitorScope, bucket);
      return { allowed: false, remaining: 0, limit: limits.perIp, reason: "visitor", durable: true, refund: noop };
    }
    const global = await incrementAndCheck(db, globalScope, bucket, limits.global);
    const remaining = Math.max(0, limits.perIp - visitor.current);
    const refund = async () => {
      if (refunded) return;
      refunded = true;
      await Promise.all([d1Decrement(db, visitorScope, bucket), d1Decrement(db, globalScope, bucket)]);
    };
    if (!global.allowed) {
      await refund();
      return { allowed: false, remaining, limit: limits.perIp, reason: "global", durable: true, refund: noop };
    }
    return { allowed: true, remaining, limit: limits.perIp, durable: true, refund };
  }

  const vKey = `${visitorScope}:${bucket}`;
  const gKey = `${globalScope}:${bucket}`;
  const visitorCount = memoryAdd(vKey, 1);
  if (visitorCount > limits.perIp) {
    memoryAdd(vKey, -1);
    return { allowed: false, remaining: 0, limit: limits.perIp, reason: "visitor", durable: false, refund: noop };
  }
  const globalCount = memoryAdd(gKey, 1);
  const refund = async () => {
    if (refunded) return;
    refunded = true;
    memoryAdd(vKey, -1);
    memoryAdd(gKey, -1);
  };
  if (globalCount > limits.global) {
    await refund();
    return { allowed: false, remaining: Math.max(0, limits.perIp - visitorCount + 1), limit: limits.perIp, reason: "global", durable: false, refund: noop };
  }
  return { allowed: true, remaining: Math.max(0, limits.perIp - visitorCount), limit: limits.perIp, durable: false, refund };
}

/** Back-compat alias (text quota). */
export const consumeAiCredit = (request: Request) => consumeCredit(request, "text");

// ---------------------------------------------------------------------------
// One in-flight AI request per visitor
// ---------------------------------------------------------------------------

const inFlight = new Map<string, number>();

/** Returns a release function, or null if this visitor already has a request running. */
export function acquireSlot(visitor: string, maxAgeMs = 70_000): (() => void) | null {
  const now = Date.now();
  const started = inFlight.get(visitor);
  if (started && now - started < maxAgeMs) return null;
  inFlight.set(visitor, now);
  return () => {
    if (inFlight.get(visitor) === now) inFlight.delete(visitor);
  };
}

/** Test hook. */
export function _resetMemoryQuota(): void {
  memory.clear();
  inFlight.clear();
}
