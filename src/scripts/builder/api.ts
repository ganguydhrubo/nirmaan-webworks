import type { BriefShape as Brief } from "@/lib/builder/options";
import { normalizeDoc, stripAssets, validateAsset, type Asset, type Section, type SiteDoc } from "@/lib/builder/schema";

export interface ApiError {
  ok: false;
  code: string;
  message: string;
  remaining?: number;
  /** False for problems another attempt won't fix (quota, configuration). */
  retryable?: boolean;
}

export type GenerateResult = { ok: true; doc: SiteDoc; remaining: number } | ApiError;
export type EditResult = { ok: true; doc?: SiteDoc; section?: Section; remaining: number } | ApiError;

const ENDPOINT = "/api/builder/generate";

export function newRequestId(): string {
  return crypto.randomUUID();
}

async function post(url: string, body: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, code: "aborted", message: "Cancelled." };
    return { ok: false, code: "network", message: "Couldn't reach the server. Check your internet connection and try again — nothing you've done is lost.", retryable: true };
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return { ok: false, code: "bad_response", message: `Unexpected server response (${res.status}). Please try again.`, retryable: true };
  return data;
}

/**
 * `requestId` makes retries safe: if the connection drops after the server
 * already generated the site, resending the same id returns that result
 * instead of spending a second AI request.
 */
export async function generateSite(brief: Brief, requestId: string, signal?: AbortSignal): Promise<GenerateResult> {
  const data = await post(ENDPOINT, { mode: "generate", brief, requestId }, signal);
  if (data.ok !== true) return data as unknown as ApiError;
  // Re-validate on the client too: the editor only ever holds normalised documents.
  return { ok: true, doc: normalizeDoc(data.doc).doc, remaining: Number(data.remaining ?? 0) };
}

export async function editWithAi(doc: SiteDoc, instruction: string, sectionId: string | null, requestId: string, signal?: AbortSignal): Promise<EditResult> {
  const assetIds = Object.keys(doc.assets);
  const data = await post(ENDPOINT, { mode: "edit", instruction, doc: stripAssets(doc), sectionId: sectionId ?? undefined, assetIds, requestId }, signal);
  if (data.ok !== true) return data as unknown as ApiError;
  if (data.section) {
    const check = normalizeDoc({ pages: [{ title: "x", sections: [data.section] }], assets: doc.assets }).doc.pages[0]?.sections[0];
    if (!check) return { ok: false, code: "invalid_output", message: "The AI returned a section we couldn't use.", retryable: true };
    check.id = (data.section as Section).id;
    return { ok: true, section: check, remaining: Number(data.remaining ?? 0) };
  }
  const merged = normalizeDoc({ ...(data.doc as object), assets: doc.assets }).doc;
  return { ok: true, doc: merged, remaining: Number(data.remaining ?? 0) };
}

// ---------------------------------------------------------------------------
// AI images
// ---------------------------------------------------------------------------

export async function imageAvailability(): Promise<{ available: boolean; reason: string | null }> {
  try {
    const res = await fetch("/api/builder/image", { headers: { Accept: "application/json" } });
    const data = (await res.json()) as { available?: boolean; reason?: string | null };
    return { available: !!data.available, reason: data.reason ?? null };
  } catch {
    return { available: false, reason: "Couldn't check the image service. Check your connection." };
  }
}

export type ImageResult = { ok: true; asset: Asset; width: number; height: number; remaining: number } | ApiError;

export async function generateAiImage(prompt: string, aspectRatio: string, style: string, signal?: AbortSignal): Promise<ImageResult> {
  const data = await post("/api/builder/image", { prompt, aspectRatio, style }, signal);
  if (data.ok !== true) return data as unknown as ApiError;
  const img = data.image as { dataUrl: string; mime: Asset["mime"]; width: number; height: number; prompt: string };
  return { ok: true, asset: { name: prompt.slice(0, 60), mime: img.mime, dataUrl: img.dataUrl, source: "ai", prompt: img.prompt }, width: img.width, height: img.height, remaining: Number(data.remaining ?? 0) };
}

/** Re-encode an image (AI result or URL import) to web size and validate it as a project asset. */
export async function toWebAsset(dataUrl: string, name: string, source: Asset["source"], prompt?: string): Promise<Asset> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const max = 1800;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  let out = canvas.toDataURL("image/jpeg", 0.85);
  for (const q of [0.72, 0.6]) if (out.length * 0.75 > 1_400_000) out = canvas.toDataURL("image/jpeg", q);
  const asset = validateAsset({ name, mime: "image/jpeg", dataUrl: out, source, prompt });
  if (!asset) throw new Error("The image couldn't be saved in a supported format.");
  return asset;
}
