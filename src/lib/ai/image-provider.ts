/**
 * Image generation gateway for the AI Website Builder.
 *
 * Only models that actually output images are used — text models are never
 * asked for pictures, and a text-only answer is never treated as an image.
 *
 *   gemini      GEMINI_API_KEY      BUILDER_GEMINI_IMAGE_MODELS     default gemini-3.1-flash-image,gemini-2.5-flash-image
 *   openrouter  OPENROUTER_API_KEY  BUILDER_OPENROUTER_IMAGE_MODEL  default google/gemini-3.1-flash-lite-image
 *   order       BUILDER_IMAGE_PROVIDERS (default "gemini,openrouter")
 *
 * Verified 2026-10-17 against the live APIs with this project's keys: both
 * accounts are on free tiers where image models have NO quota (Gemini: 429
 * GenerateRequestsPerDay…FreeTier with a ~15h retry delay; OpenRouter: 402
 * "never purchased credits"). The code paths follow the documented response
 * formats (Gemini `candidates[].content.parts[].inlineData`, OpenRouter
 * `choices[].message.images[].image_url.url`) and are unit-tested against
 * them; real generation starts working once billing/credits are enabled.
 * Until then the UI says so honestly and offers illustrations instead.
 */
import { getRuntimeEnv } from "@/lib/runtime-env";
import { ChatError, parseDuration } from "./chat-provider";

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export interface GeneratedImage {
  mime: ImageMime;
  base64: string;
  width: number;
  height: number;
  provider: string;
  model: string;
}

export interface ImageRequest {
  prompt: string;
  aspectRatio: "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2";
  timeoutMs: number;
}

interface ImageProvider {
  name: string;
  models: string[];
  apiKey: string;
}

const MAX_IMAGE_BYTES = 10_000_000;

// Health (per instance): benched providers are skipped until their cooldown ends.
const benched = new Map<string, { until: number; reason: string }>();

export function _resetImageHealth(): void {
  benched.clear();
}

export async function getImageProviders(): Promise<ImageProvider[]> {
  const env = await getRuntimeEnv();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const order = (str(env.BUILDER_IMAGE_PROVIDERS) || "gemini,openrouter").split(",").map((s) => s.trim().toLowerCase());
  const all: Record<string, ImageProvider | null> = {
    gemini: str(env.GEMINI_API_KEY)
      ? { name: "gemini", apiKey: str(env.GEMINI_API_KEY), models: (str(env.BUILDER_GEMINI_IMAGE_MODELS) || "gemini-3.1-flash-image,gemini-2.5-flash-image").split(",").map((m) => m.trim()).filter(Boolean).slice(0, 3) }
      : null,
    openrouter: str(env.OPENROUTER_API_KEY)
      ? { name: "openrouter", apiKey: str(env.OPENROUTER_API_KEY), models: [str(env.BUILDER_OPENROUTER_IMAGE_MODEL) || "google/gemini-3.1-flash-lite-image"] }
      : null,
  };
  return order.map((n) => all[n]).filter((p): p is ImageProvider => !!p);
}

export interface ImageAvailability {
  available: boolean;
  /** Customer-safe explanation when unavailable. */
  reason?: string;
  providers: { name: string; available: boolean; reason?: string; retryInSeconds?: number }[];
}

export async function getImageAvailability(): Promise<ImageAvailability> {
  const providers = await getImageProviders();
  const now = Date.now();
  const list = providers.map((p) => {
    const b = benched.get(p.name);
    return b && b.until > now ? { name: p.name, available: false, reason: b.reason, retryInSeconds: Math.ceil((b.until - now) / 1000) } : { name: p.name, available: true };
  });
  if (!providers.length) return { available: false, reason: "AI image generation isn't configured on this site.", providers: list };
  const available = list.some((p) => p.available);
  return { available, reason: available ? undefined : "AI image generation is temporarily unavailable (the image service's quota is used up). You can upload a photo or use an illustration instead.", providers: list };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function sniffImage(bytes: Uint8Array): { mime: ImageMime; width: number; height: number } | null {
  const b = bytes;
  // PNG: IHDR width/height at 16..24
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { mime: "image/png", width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // JPEG: walk segments to the first SOFn marker.
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1]!;
      const len = (b[i + 2]! << 8) | b[i + 3]!;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { mime: "image/jpeg", height: (b[i + 5]! << 8) | b[i + 6]!, width: (b[i + 7]! << 8) | b[i + 8]! };
      }
      i += 2 + len;
    }
    return null;
  }
  // WebP: RIFF....WEBP + VP8 / VP8L / VP8X chunk
  if (b.length > 30 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!);
    if (chunk === "VP8X") return { mime: "image/webp", width: 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16)), height: 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16)) };
    if (chunk === "VP8 ") return { mime: "image/webp", width: (b[26]! | (b[27]! << 8)) & 0x3fff, height: (b[28]! | (b[29]! << 8)) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
      return { mime: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Turn provider image data into a validated image, or throw an "output" error. */
export function validateImageData(base64: string, provider: string, model: string): GeneratedImage {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new ChatError("invalid_json", `${provider} returned image data that isn't valid base64`, undefined, "output");
  if ((base64.length * 3) / 4 > MAX_IMAGE_BYTES) throw new ChatError("invalid_json", `${provider} returned an oversized image`, undefined, "output");
  const bytes = b64ToBytes(base64);
  const info = sniffImage(bytes);
  if (!info) throw new ChatError("invalid_json", `${provider} returned data that isn't a PNG/JPEG/WebP image`, undefined, "output");
  if (info.width < 64 || info.height < 64 || info.width > 8192 || info.height > 8192) throw new ChatError("invalid_json", `${provider} returned an image with unusable dimensions`, undefined, "output");
  return { mime: info.mime, base64, width: info.width, height: info.height, provider, model };
}

// ---------------------------------------------------------------------------
// Response parsers (exported for tests)
// ---------------------------------------------------------------------------

type GeminiPart = { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } };

export function extractGeminiImage(json: unknown): { data: string } | { text: string } | null {
  const parts = ((json as { candidates?: { content?: { parts?: GeminiPart[] } }[] })?.candidates?.[0]?.content?.parts ?? []) as GeminiPart[];
  for (const part of parts) {
    const data = part.inlineData?.data ?? part.inline_data?.data;
    if (data) return { data };
  }
  const text = parts.map((p) => p.text ?? "").join(" ").trim();
  return text ? { text } : null;
}

export function extractOpenRouterImage(json: unknown): { data: string } | { text: string } | null {
  const msg = (json as { choices?: { message?: { content?: string; images?: { image_url?: { url?: string } }[] } }[] })?.choices?.[0]?.message;
  const url = msg?.images?.find((i) => i.image_url?.url?.startsWith("data:image/"))?.image_url?.url;
  if (url) return { data: url.slice(url.indexOf(",") + 1) };
  return msg?.content ? { text: msg.content } : null;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<{ status: number; json: unknown; text: string; headers: Headers }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON error page */
    }
    return { status: res.status, json, text, headers: res.headers };
  } catch {
    if (controller.signal.aborted) throw new ChatError("timeout", "image provider timed out", undefined, "transient");
    throw new ChatError("provider_error", "image provider unreachable", undefined, "transient");
  } finally {
    clearTimeout(timer);
  }
}

/** Gemini answers 429 for both "slow down" and "no free quota at all"; the RetryInfo delay tells them apart. */
function geminiRetryDelay(json: unknown): number | undefined {
  const details = (json as { error?: { details?: { "@type"?: string; retryDelay?: string }[] } })?.error?.details ?? [];
  return parseDuration(details.find((d) => d["@type"]?.endsWith("RetryInfo"))?.retryDelay ?? null);
}

async function callGemini(p: ImageProvider, model: string, req: ImageRequest, timeoutMs: number): Promise<GeneratedImage> {
  const res = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": p.apiKey },
    { contents: [{ parts: [{ text: req.prompt }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: req.aspectRatio } } },
    timeoutMs,
  );
  if (res.status !== 200) throw imageHttpError("gemini", res.status, res.text, geminiRetryDelay(res.json));
  const found = extractGeminiImage(res.json);
  if (!found || "text" in found) throw new ChatError("empty_output", "gemini answered with text instead of an image", undefined, "output");
  return validateImageData(found.data, "gemini", model);
}

async function callOpenRouter(p: ImageProvider, model: string, req: ImageRequest, timeoutMs: number): Promise<GeneratedImage> {
  const res = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    { Authorization: `Bearer ${p.apiKey}`, "HTTP-Referer": "https://atittle.com", "X-Title": "ATITTLE AI Website Builder" },
    { model, modalities: ["image", "text"], messages: [{ role: "user", content: req.prompt }], image_config: { aspect_ratio: req.aspectRatio } },
    timeoutMs,
  );
  if (res.status !== 200) throw imageHttpError("openrouter", res.status, res.text, parseDuration(res.headers.get("retry-after")));
  const found = extractOpenRouterImage(res.json);
  if (!found || "text" in found) throw new ChatError("empty_output", "openrouter answered with text instead of an image", undefined, "output");
  return validateImageData(found.data, "openrouter", model);
}

function imageHttpError(name: string, status: number, body: string, retryAfter?: number): ChatError {
  console.warn(`[builder-image] ${name} HTTP ${status}: ${body.slice(0, 200).replace(/\s+/g, " ")}`);
  if (status === 429) {
    // A retry delay of more than ~5 minutes = an exhausted (often zero) free quota, not momentary load.
    const quotaGone = (retryAfter ?? 0) > 300 || /free.?tier|exceeded your current quota/i.test(body);
    return new ChatError(quotaGone ? "unavailable" : "rate_limited", `${name} image quota ${quotaGone ? "exhausted" : "busy"}`, 429, quotaGone ? "permanent" : "transient", retryAfter);
  }
  if (status === 402) return new ChatError("unavailable", `${name} has no credits for image models`, 402, "permanent");
  if (status === 401 || status === 403) return new ChatError("not_configured", `${name} rejected credentials`, status, "permanent");
  if (status === 404) return new ChatError("not_configured", `${name} image model not found`, status, "permanent");
  if (status === 400) return new ChatError("provider_error", `${name} rejected the image request`, status, "permanent");
  return new ChatError("provider_error", `${name} image service error`, status, "transient");
}

export async function generateImage(req: ImageRequest): Promise<GeneratedImage & { trace: { provider: string; model: string; ok: boolean; error?: string; ms: number }[] }> {
  const providers = await getImageProviders();
  if (!providers.length) throw new ChatError("not_configured", "No image provider is configured.", undefined, "permanent");
  const deadline = Date.now() + req.timeoutMs;
  const trace: { provider: string; model: string; ok: boolean; error?: string; ms: number }[] = [];
  let last: ChatError | null = null;
  for (const p of providers) {
    const b = benched.get(p.name);
    if (b && b.until > Date.now()) {
      trace.push({ provider: p.name, model: p.models[0]!, ok: false, error: `skipped: ${b.reason}`, ms: 0 });
      continue;
    }
    for (const model of p.models) {
      const remaining = deadline - Date.now();
      if (remaining < 5000) break;
      const started = Date.now();
      try {
        const img = p.name === "gemini" ? await callGemini(p, model, req, remaining) : await callOpenRouter(p, model, req, remaining);
        trace.push({ provider: p.name, model, ok: true, ms: Date.now() - started });
        return { ...img, trace };
      } catch (err) {
        last = err instanceof ChatError ? err : new ChatError("provider_error", String(err));
        trace.push({ provider: p.name, model, ok: false, error: last.code, ms: Date.now() - started });
        // Free-tier quota/credit problems apply to the whole account: skip the provider's other models.
        if (last.code === "unavailable" || last.code === "not_configured") {
          benched.set(p.name, { until: Date.now() + Math.min(Math.max(last.retryAfter ?? 1800, 300), 6 * 3600) * 1000, reason: last.message });
          break;
        }
        if (last.code === "rate_limited") {
          benched.set(p.name, { until: Date.now() + Math.min(Math.max(last.retryAfter ?? 30, 10), 600) * 1000, reason: "busy" });
          break;
        }
        // Output problems (text instead of image, bad bytes): try this provider's next model.
      }
    }
  }
  const e = last ?? new ChatError("timeout", "No image provider answered in time.");
  (e as ChatError & { trace?: unknown }).trace = trace;
  throw e;
}
