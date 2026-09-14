import type { RuntimeEnv } from "@/lib/runtime-env";

/**
 * Runtime validation of secrets/bindings that can't be checked at build time
 * (Cloudflare secrets don't exist until deploy). Throws a named error that
 * the caller turns into a clear, logged, user-visible failure — we never
 * want a form that silently does nothing because a key was never set.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function getRateLimits(env: RuntimeEnv) {
  return {
    perIpPerHour: Number(env.ENQUIRY_RATE_LIMIT_PER_IP_PER_HOUR ?? "5"),
    perPhonePerDay: Number(env.ENQUIRY_RATE_LIMIT_PER_PHONE_PER_DAY ?? "3"),
    globalPerHour: Number(env.ENQUIRY_RATE_LIMIT_GLOBAL_PER_HOUR ?? "40"),
    resendDailyCap: Number(env.RESEND_DAILY_CAP ?? "100"),
    resendMonthlyCap: Number((env as unknown as Record<string, unknown>).RESEND_MONTHLY_CAP ?? "3000"),
  };
}
