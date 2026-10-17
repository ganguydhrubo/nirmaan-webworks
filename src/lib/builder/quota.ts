/**
 * Usage limits for the builder's AI endpoint ("free within limits").
 *
 *   BUILDER_AI_DAILY_LIMIT_PER_IP   default 5   AI requests per visitor per UTC day
 *   BUILDER_AI_DAILY_LIMIT_GLOBAL   default 60  AI requests across all visitors per UTC day
 *
 * The global default is sized for Groq's free tier on openai/gpt-oss-120b
 * (~200K tokens/day shared with the Website Evaluator; a full site
 * generation uses roughly 4–8K tokens). Raise it after upgrading the plan.
 *
 * On Cloudflare (D1 available) counters are durable and shared across all
 * instances, using the existing rate_limit_counters table. On Vercel there is
 * no D1, so counters live in instance memory: they still stop a single
 * visitor hammering one warm instance, but reset on cold starts and are not
 * shared across instances. The provider's own quota (HTTP 429, handled
 * gracefully) is the hard backstop there. See docs/AI-WEBSITE-BUILDER.md.
 */
import { getRuntimeEnv } from "@/lib/runtime-env";
import { getClientIp, hashIp } from "@/lib/ip";
import { dayBucket, incrementAndCheck } from "@/lib/rate-limit";

export interface QuotaResult {
  allowed: boolean;
  /** AI requests this visitor has left today (after this one, if allowed). */
  remaining: number;
  limit: number;
  reason?: "visitor" | "global";
  durable: boolean;
}

const memory = new Map<string, number>();

function memoryIncrement(key: string): number {
  // Drop yesterday's keys so the map can't grow without bound.
  const today = dayBucket(new Date());
  if (memory.size > 5000) for (const k of memory.keys()) if (!k.endsWith(today)) memory.delete(k);
  const next = (memory.get(key) ?? 0) + 1;
  memory.set(key, next);
  return next;
}

function intEnv(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getQuotaLimits(): Promise<{ perIp: number; global: number }> {
  const env = await getRuntimeEnv();
  return {
    perIp: intEnv(env.BUILDER_AI_DAILY_LIMIT_PER_IP, 5),
    global: intEnv(env.BUILDER_AI_DAILY_LIMIT_GLOBAL, 60),
  };
}

export async function consumeAiCredit(request: Request): Promise<QuotaResult> {
  const env = await getRuntimeEnv();
  const limits = await getQuotaLimits();
  const salt = env.IP_HASH_SALT || "builder-quota-fallback-salt";
  const ipHash = await hashIp(getClientIp(request), salt);
  const bucket = dayBucket(new Date());

  if (env.DB) {
    const visitor = await incrementAndCheck(env.DB, `builder-ip:${ipHash}`, bucket, limits.perIp);
    if (!visitor.allowed) return { allowed: false, remaining: 0, limit: limits.perIp, reason: "visitor", durable: true };
    const global = await incrementAndCheck(env.DB, "builder-global", bucket, limits.global);
    if (!global.allowed) return { allowed: false, remaining: Math.max(0, limits.perIp - visitor.current), limit: limits.perIp, reason: "global", durable: true };
    return { allowed: true, remaining: Math.max(0, limits.perIp - visitor.current), limit: limits.perIp, durable: true };
  }

  const visitorCount = memoryIncrement(`ip:${ipHash}:${bucket}`);
  if (visitorCount > limits.perIp) return { allowed: false, remaining: 0, limit: limits.perIp, reason: "visitor", durable: false };
  const globalCount = memoryIncrement(`global:${bucket}`);
  if (globalCount > limits.global) return { allowed: false, remaining: Math.max(0, limits.perIp - visitorCount), limit: limits.perIp, reason: "global", durable: false };
  return { allowed: true, remaining: Math.max(0, limits.perIp - visitorCount), limit: limits.perIp, durable: false };
}

/** Test hook. */
export function _resetMemoryQuota(): void {
  memory.clear();
}
