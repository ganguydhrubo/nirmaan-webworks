/**
 * Provider gateway for JSON-producing chat completions (AI Website Builder).
 *
 * All text providers speak the OpenAI chat-completions dialect, so they share
 * one request path, but each has its own quirks handled here:
 *
 *   groq        GROQ_API_KEY        BUILDER_GROQ_MODEL        default openai/gpt-oss-120b
 *   gemini      GEMINI_API_KEY      BUILDER_GEMINI_MODEL      default gemini-flash-latest
 *   openrouter  OPENROUTER_API_KEY  BUILDER_OPENROUTER_MODELS default: free models, fastest first
 *   xai         XAI_API_KEY         BUILDER_XAI_MODEL         (no default — only used when both are set,
 *                                                             because model ids change and we can't verify one)
 *
 * Order: BUILDER_AI_PROVIDERS (default "groq,gemini,openrouter,xai"); providers without a key are skipped.
 *
 * Reliability policy (see docs/AI-WEBSITE-BUILDER.md §2):
 * - Failures are classified. Transient (429, 5xx, timeout) → the provider is
 *   cooled down briefly and the next one is tried. Permanent (401/403 bad
 *   key, 402 no credits, 404 unknown model, 400 bad request) → benched for
 *   10 minutes, so we stop paying the latency of something that can't work.
 * - Groq's free tier allows only ~8K tokens/minute; its x-ratelimit headers
 *   are read after every call and Groq is skipped while it can't fit a
 *   request, instead of burning a doomed call.
 * - Groq JSON-mode sometimes rejects its own output ("json_validate_failed")
 *   but returns it as `failed_generation`; we salvage and validate it.
 * - One overall deadline; at most one attempt per provider, plus one short
 *   Retry-After wait on the final eligible provider. Never loops.
 *
 * Health state lives in instance memory (best effort on serverless) and
 * reflects real request outcomes, not just "a key exists".
 */
import { getRuntimeEnv } from "@/lib/runtime-env";

export type ChatErrorCode = "not_configured" | "rate_limited" | "timeout" | "provider_error" | "empty_output" | "invalid_json" | "unavailable";
export type FailureKind = "transient" | "permanent" | "output";

export class ChatError extends Error {
  constructor(
    public code: ChatErrorCode,
    message: string,
    public status?: number,
    public kind: FailureKind = "transient",
    /** Seconds the provider asked us to wait, if any. */
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ChatError";
  }
}

export interface ChatJsonRequest {
  system: string;
  user: string;
  maxTokens: number;
  /** Overall budget across every provider attempt. */
  timeoutMs: number;
  temperature?: number;
  /** Approximate prompt+output tokens, used to skip providers whose rate window can't fit it. */
  estimatedTokens?: number;
}

export interface Attempt {
  provider: string;
  model: string;
  ms: number;
  ok: boolean;
  error?: ChatErrorCode;
  status?: number;
  salvaged?: boolean;
  skipped?: string;
}

export interface ChatJsonResult {
  json: unknown;
  provider: string;
  model: string;
  attempts: number;
  trace: Attempt[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface Provider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  extraBody?: Record<string, unknown>;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Health / circuit breaker (per instance)
// ---------------------------------------------------------------------------

interface Health {
  cooldownUntil: number;
  reason?: string;
  /** Tokens left in the provider's current rate window, when it tells us. */
  tokensRemaining?: number;
  tokensResetAt?: number;
  recent: { at: number; ok: boolean; code?: string; ms: number }[];
}

const health = new Map<string, Health>();

function h(name: string): Health {
  let entry = health.get(name);
  if (!entry) {
    entry = { cooldownUntil: 0, recent: [] };
    health.set(name, entry);
  }
  return entry;
}

function record(name: string, ok: boolean, ms: number, code?: string): void {
  const entry = h(name);
  entry.recent = [...entry.recent, { at: Date.now(), ok, code, ms }].slice(-20);
  if (ok) {
    entry.cooldownUntil = 0;
    entry.reason = undefined;
  }
}

function bench(name: string, seconds: number, reason: string): void {
  const entry = h(name);
  entry.cooldownUntil = Math.max(entry.cooldownUntil, Date.now() + seconds * 1000);
  entry.reason = reason;
}

/** Parse Groq/OpenAI-style durations like "38.7s", "4m19.2s", "120ms", or plain seconds. */
export function parseDuration(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  let total = 0;
  let matched = false;
  for (const [, num, unit] of value.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    matched = true;
    const n = Number(num);
    total += unit === "h" ? n * 3600 : unit === "m" ? n * 60 : unit === "ms" ? n / 1000 : n;
  }
  return matched ? total : undefined;
}

function noteRateHeaders(name: string, res: Response): void {
  const remaining = res.headers.get("x-ratelimit-remaining-tokens");
  const reset = parseDuration(res.headers.get("x-ratelimit-reset-tokens"));
  if (remaining !== null && Number.isFinite(Number(remaining))) {
    const entry = h(name);
    entry.tokensRemaining = Number(remaining);
    entry.tokensResetAt = Date.now() + (reset ?? 60) * 1000;
  }
}

export interface ProviderHealth {
  name: string;
  model: string;
  available: boolean;
  reason?: string;
  cooldownSeconds: number;
  recentSuccessRate: number | null;
  recentCalls: number;
  lastError?: string;
  avgMs: number | null;
}

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const providers = await getProviders();
  const now = Date.now();
  return providers.map((p) => {
    const entry = h(p.name);
    const recent = entry.recent.filter((r) => now - r.at < 60 * 60 * 1000);
    const okCount = recent.filter((r) => r.ok).length;
    return {
      name: p.name,
      model: p.model,
      available: entry.cooldownUntil <= now,
      reason: entry.cooldownUntil > now ? entry.reason : undefined,
      cooldownSeconds: Math.max(0, Math.ceil((entry.cooldownUntil - now) / 1000)),
      recentSuccessRate: recent.length ? okCount / recent.length : null,
      recentCalls: recent.length,
      lastError: [...recent].reverse().find((r) => !r.ok)?.code,
      avgMs: recent.length ? Math.round(recent.reduce((a, r) => a + r.ms, 0) / recent.length) : null,
    };
  });
}

/** Test hook. */
export function _resetProviderHealth(): void {
  health.clear();
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

// Fastest-first; free models come and go, so this is overridable by env.
const DEFAULT_OPENROUTER_MODELS = "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,nvidia/nemotron-3-super-120b-a12b:free";

export async function getProviders(): Promise<Provider[]> {
  const env = await getRuntimeEnv();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const order = (str(env.BUILDER_AI_PROVIDERS) || "groq,gemini,openrouter,xai").split(",").map((s) => s.trim().toLowerCase());
  const all: Record<string, Provider | null> = {
    groq: str(env.GROQ_API_KEY)
      ? {
          name: "groq",
          baseUrl: "https://api.groq.com/openai/v1",
          apiKey: str(env.GROQ_API_KEY),
          model: str(env.BUILDER_GROQ_MODEL) || "openai/gpt-oss-120b",
          // gpt-oss spends hidden reasoning tokens first; "low" keeps it fast
          // and inside free-tier token budgets (same as groq-evaluator.ts).
          extraBody: { reasoning_effort: "low" },
        }
      : null,
    gemini: str(env.GEMINI_API_KEY)
      ? {
          name: "gemini",
          // Gemini's OpenAI-compatible endpoint.
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: str(env.GEMINI_API_KEY),
          // "-latest" alias: Google retires pinned versions for new keys.
          model: str(env.BUILDER_GEMINI_MODEL) || "gemini-flash-latest",
          extraBody: { reasoning_effort: "low" },
        }
      : null,
    openrouter: str(env.OPENROUTER_API_KEY)
      ? (() => {
          const models = (str(env.BUILDER_OPENROUTER_MODELS) || DEFAULT_OPENROUTER_MODELS).split(",").map((m) => m.trim()).filter(Boolean).slice(0, 3);
          return {
            name: "openrouter",
            baseUrl: "https://openrouter.ai/api/v1",
            apiKey: str(env.OPENROUTER_API_KEY),
            model: models[0]!,
            // OpenRouter falls through this list itself when a model is busy.
            extraBody: models.length > 1 ? { models } : {},
            headers: { "HTTP-Referer": "https://atittle.com", "X-Title": "ATITTLE AI Website Builder" },
          };
        })()
      : null,
    xai:
      str(env.XAI_API_KEY) && str(env.BUILDER_XAI_MODEL)
        ? { name: "xai", baseUrl: "https://api.x.ai/v1", apiKey: str(env.XAI_API_KEY), model: str(env.BUILDER_XAI_MODEL) }
        : null,
  };
  return order.map((name) => all[name]).filter((p): p is Provider => !!p);
}

// ---------------------------------------------------------------------------
// One call
// ---------------------------------------------------------------------------

type RawCompletion = {
  model?: string;
  usage?: ChatJsonResult["usage"];
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
};

export function classifyHttp(name: string, status: number, body: string): ChatError {
  const lower = body.toLowerCase();
  if (status === 429) return new ChatError("rate_limited", `${name} rate limited`, 429, "transient");
  if (status === 401 || status === 403) return new ChatError("not_configured", `${name} rejected credentials`, status, "permanent");
  if (status === 402) return new ChatError("unavailable", `${name} has no credits`, status, "permanent");
  if (status === 404) return new ChatError("not_configured", `${name} model not found`, status, "permanent");
  if (status === 400 && lower.includes("json_validate_failed")) return new ChatError("invalid_json", `${name} rejected its own JSON`, status, "output");
  if (status === 400 || status === 422) return new ChatError("provider_error", `${name} rejected the request`, status, "permanent");
  if (status === 408 || status >= 500) return new ChatError("provider_error", `${name} server error`, status, "transient");
  return new ChatError("provider_error", `${name} error ${status}`, status, "transient");
}

async function callProvider(p: Provider, req: ChatJsonRequest, timeoutMs: number): Promise<{ json: unknown; data: RawCompletion | null; salvaged: boolean }> {
  // The timer covers the WHOLE exchange, body included: some providers send
  // headers immediately and then hold the connection open while generating.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}`, ...p.headers },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          temperature: req.temperature ?? 0.6,
          max_tokens: req.maxTokens,
          response_format: { type: "json_object" },
          ...p.extraBody,
        }),
      });
    } catch {
      if (controller.signal.aborted) throw new ChatError("timeout", `${p.name} timed out`, undefined, "transient");
      throw new ChatError("provider_error", `${p.name} unreachable`, undefined, "transient");
    }
    noteRateHeaders(p.name, response);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const err = classifyHttp(p.name, response.status, body);
      err.retryAfter = parseDuration(response.headers.get("retry-after")) ?? parseDuration(response.headers.get("x-ratelimit-reset-tokens"));
      // Salvage: Groq returns the rejected generation; it is often valid or nearly valid JSON.
      if (err.code === "invalid_json") {
        try {
          const failed = (JSON.parse(body) as { error?: { failed_generation?: string } }).error?.failed_generation;
          const parsed = failed ? parseJsonLoose(failed) : undefined;
          if (parsed !== undefined) return { json: parsed, data: null, salvaged: true };
        } catch {
          /* fall through to the error */
        }
      }
      // Operator log: status + bounded snippet. Never forwarded to the
      // browser (may contain account/quota details).
      console.warn(`[builder-ai] ${p.name} HTTP ${response.status}: ${body.slice(0, 200).replace(/\s+/g, " ")}`);
      throw err;
    }

    let data: RawCompletion | null;
    try {
      data = (await response.json()) as RawCompletion;
    } catch {
      if (controller.signal.aborted) throw new ChatError("timeout", `${p.name} timed out while sending its answer`, undefined, "transient");
      throw new ChatError("provider_error", `${p.name} sent an unreadable response`, undefined, "transient");
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new ChatError("empty_output", `${p.name} returned no content`, undefined, "output");
    const parsed = parseJsonLoose(content);
    if (parsed === undefined) {
      const cut = data?.choices?.[0]?.finish_reason === "length";
      throw new ChatError("invalid_json", `${p.name} ${cut ? "output was cut off" : "returned malformed JSON"}`, undefined, "output");
    }
    return { json: parsed, data, salvaged: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Parse JSON, tolerating code fences or chatter around it (some models add them despite JSON mode). */
export function parseJsonLoose(text: string): unknown {
  const attempt = (s: string) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return undefined;
    }
  };
  const direct = attempt(text);
  if (direct !== undefined) return direct;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const v = attempt(fenced.trim());
    if (v !== undefined) return v;
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? attempt(text.slice(start, end + 1)) : undefined;
}

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

export async function chatJson(req: ChatJsonRequest): Promise<ChatJsonResult> {
  return chatJsonValidated(req, (json) => json);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ChatErrorWithTrace = ChatError & { trace?: Attempt[] };

/**
 * Run the provider chain; `accept` turns raw JSON into the caller's value or
 * returns null to reject it, which moves on to the next provider (so an
 * incomplete website from one model is retried on another automatically).
 */
export async function chatJsonValidated<T>(req: ChatJsonRequest, accept: (json: unknown) => T | null): Promise<ChatJsonResult & { value: T }> {
  const providers = await getProviders();
  if (!providers.length) throw new ChatError("not_configured", "No AI provider is configured on the server.", undefined, "permanent");
  const deadline = Date.now() + req.timeoutMs;
  const trace: Attempt[] = [];
  let lastError: ChatError | null = null;
  const need = req.estimatedTokens ?? req.maxTokens;

  const eligible = providers.filter((p) => {
    const entry = h(p.name);
    const now = Date.now();
    if (entry.cooldownUntil > now) {
      trace.push({ provider: p.name, model: p.model, ms: 0, ok: false, skipped: entry.reason ?? "cooling down" });
      return false;
    }
    if (entry.tokensRemaining !== undefined && entry.tokensResetAt && entry.tokensResetAt > now && entry.tokensRemaining < need) {
      trace.push({ provider: p.name, model: p.model, ms: 0, ok: false, skipped: `rate window full (${entry.tokensRemaining} tokens left)` });
      return false;
    }
    return true;
  });
  // Everyone is cooling down: try the (non-misconfigured) provider that recovers soonest rather than failing instantly.
  if (!eligible.length) {
    const candidates = providers.filter((p) => !h(p.name).reason?.startsWith("permanent"));
    if (!candidates.length) {
      const e: ChatErrorWithTrace = new ChatError("not_configured", "No AI provider is currently usable.", undefined, "permanent");
      e.trace = trace;
      throw e;
    }
    candidates.sort((a, b) => h(a.name).cooldownUntil - h(b.name).cooldownUntil);
    eligible.push(candidates[0]!);
  }

  for (const [i, p] of eligible.entries()) {
    const isLast = i === eligible.length - 1;
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 4000) break;
      // Leave later providers a fair share of the budget.
      const share = isLast ? remaining : Math.max(15_000, Math.floor(remaining * 0.55));
      const started = Date.now();
      try {
        const { json, data, salvaged } = await callProvider(p, req, Math.min(share, remaining));
        const value = accept(json);
        if (value === null) throw new ChatError("invalid_json", `${p.name} returned unusable content`, undefined, "output");
        const ms = Date.now() - started;
        record(p.name, true, ms);
        trace.push({ provider: p.name, model: data?.model ?? p.model, ms, ok: true, salvaged });
        return { json, value, provider: p.name, model: data?.model ?? p.model, attempts: trace.filter((t) => !t.skipped).length, trace, usage: data?.usage };
      } catch (err) {
        const e = err instanceof ChatError ? err : new ChatError("provider_error", String(err));
        const ms = Date.now() - started;
        lastError = e;
        record(p.name, false, ms, e.code);
        trace.push({ provider: p.name, model: p.model, ms, ok: false, error: e.code, status: e.status });
        if (e.kind === "permanent") {
          bench(p.name, 600, `permanent: ${e.message}`);
          break;
        }
        if (e.code === "rate_limited") {
          const wait = e.retryAfter ?? 20;
          // A huge retry delay means a quota that won't come back this session.
          bench(p.name, Math.min(Math.max(wait, 10), 3600), "rate limited");
          // Final provider and a short, explicit wait: one bounded retry with jitter.
          if (isLast && attempt === 0 && wait <= 8 && deadline - Date.now() > wait * 1000 + 8000) {
            await sleep(wait * 1000 + Math.floor(Math.random() * 400));
            h(p.name).cooldownUntil = 0;
            continue;
          }
          break;
        }
        if (e.code === "timeout" || e.code === "provider_error") bench(p.name, 20, "recent failure");
        break; // output problems: move on to the next provider
      }
    }
  }
  const err: ChatErrorWithTrace = lastError ?? new ChatError("timeout", "Ran out of time before any provider answered.");
  err.trace = trace;
  throw err;
}
