/**
 * Provider chain for JSON-producing chat completions, used by the AI Website
 * Builder. All providers speak the OpenAI chat-completions dialect, so they
 * share one code path; the builder never knows which one answered.
 *
 * Providers are tried in order (BUILDER_AI_PROVIDERS, default
 * "groq,gemini,openrouter"), skipping any without a key. If one fails —
 * rate limit, outage, timeout, empty or malformed output — the next one gets
 * whatever is left of the request's overall time budget. Each attempt is a
 * separate paid/free-tier call, so the chain is bounded by the number of
 * configured providers (max 3) and never loops.
 *
 *   GROQ_API_KEY        BUILDER_GROQ_MODEL        default openai/gpt-oss-120b
 *   GEMINI_API_KEY      BUILDER_GEMINI_MODEL      default gemini-flash-latest
 *   OPENROUTER_API_KEY  BUILDER_OPENROUTER_MODELS default: comma list of free models,
 *                                                 OpenRouter itself falls through them
 *
 * Keys are read server-side from the runtime env and never leave the server.
 */
import { getRuntimeEnv } from "@/lib/runtime-env";

export type ChatErrorCode = "not_configured" | "rate_limited" | "timeout" | "provider_error" | "empty_output" | "invalid_json";

export class ChatError extends Error {
  constructor(
    public code: ChatErrorCode,
    message: string,
    public status?: number,
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
}

export interface ChatJsonResult {
  json: unknown;
  provider: string;
  model: string;
  attempts: number;
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

// Fastest-first; free models come and go, so this is overridable by env.
const DEFAULT_OPENROUTER_MODELS = "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,nvidia/nemotron-3-super-120b-a12b:free";

export async function getProviders(): Promise<Provider[]> {
  const env = await getRuntimeEnv();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const order = (str(env.BUILDER_AI_PROVIDERS) || "groq,gemini,openrouter").split(",").map((s) => s.trim().toLowerCase());
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
  };
  return order.map((name) => all[name]).filter((p): p is Provider => !!p);
}

async function callProvider(p: Provider, req: ChatJsonRequest, timeoutMs: number): Promise<ChatJsonResult> {
  // The timer covers the WHOLE exchange, body included: some providers send
  // headers immediately and then hold the connection open while generating.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  let data: {
    model?: string;
    usage?: ChatJsonResult["usage"];
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  } | null;
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
    if (!response.ok) {
      // Log status + a bounded snippet for operators; never forward provider
      // bodies to the browser (they can include account/quota details).
      const snippet = (await response.text().catch(() => "")).slice(0, 240).replace(/\s+/g, " ");
      console.warn(`[builder-ai] ${p.name} HTTP ${response.status}: ${snippet}`);
      if (response.status === 429) throw new ChatError("rate_limited", `${p.name} rate limited`, 429);
      if (response.status === 401 || response.status === 403) throw new ChatError("not_configured", `${p.name} rejected credentials`, response.status);
      throw new ChatError("provider_error", `${p.name} error`, response.status);
    }
    data = (await response.json()) as typeof data;
  } catch (err) {
    if (err instanceof ChatError) throw err;
    if (controller.signal.aborted) throw new ChatError("timeout", `${p.name} timed out`);
    throw new ChatError("provider_error", `${p.name} unreachable or unreadable response`);
  } finally {
    clearTimeout(timer);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new ChatError("empty_output", `${p.name} empty output`);
  const parsed = parseJsonLoose(content);
  if (parsed === undefined) {
    const cut = data?.choices?.[0]?.finish_reason === "length";
    throw new ChatError("invalid_json", `${p.name} ${cut ? "output cut off" : "malformed JSON"}`);
  }
  return { json: parsed, provider: p.name, model: data?.model ?? p.model, attempts: 1, usage: data?.usage };
}

/** Parse JSON, tolerating a markdown code fence around it (some models add one despite JSON mode). */
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

export async function chatJson(req: ChatJsonRequest): Promise<ChatJsonResult> {
  return chatJsonValidated(req, (json) => json);
}

/**
 * Run the provider chain; `accept` turns raw JSON into the caller's value or
 * returns null to reject it, which moves on to the next provider (so an
 * incomplete website from one model is retried on another automatically).
 */
export async function chatJsonValidated<T>(req: ChatJsonRequest, accept: (json: unknown) => T | null): Promise<ChatJsonResult & { value: T }> {
  const providers = await getProviders();
  if (!providers.length) throw new ChatError("not_configured", "No AI provider is configured on the server.");
  const deadline = Date.now() + req.timeoutMs;
  let lastError: ChatError | null = null;
  for (const [i, p] of providers.entries()) {
    const remaining = deadline - Date.now();
    if (remaining < 4000) break;
    const isLast = i === providers.length - 1;
    const share = isLast ? remaining : Math.max(15_000, Math.floor(remaining * 0.55));
    try {
      const result = await callProvider(p, req, Math.min(share, remaining));
      const value = accept(result.json);
      if (value === null) throw new ChatError("invalid_json", `${p.name} returned unusable content`);
      return { ...result, value, attempts: i + 1 };
    } catch (err) {
      lastError = err instanceof ChatError ? err : new ChatError("provider_error", String(err));
      console.warn(`[builder-ai] ${p.name} failed (${lastError.code}); ${isLast ? "no more providers" : "trying next provider"}`);
    }
  }
  throw lastError ?? new ChatError("timeout", "Ran out of time before any provider answered.");
}
