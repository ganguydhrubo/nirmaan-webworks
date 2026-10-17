import type { BriefShape as Brief } from "@/lib/builder/options";
import { normalizeDoc, stripAssets, type Section, type SiteDoc } from "@/lib/builder/schema";

export interface ApiError {
  ok: false;
  code: string;
  message: string;
  remaining?: number;
}

export type GenerateResult = { ok: true; doc: SiteDoc; remaining: number } | ApiError;
export type EditResult = { ok: true; doc?: SiteDoc; section?: Section; remaining: number } | ApiError;

const ENDPOINT = "/api/builder/generate";

async function post(body: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, code: "aborted", message: "Cancelled." };
    return { ok: false, code: "network", message: "Couldn't reach the server. Check your internet connection and try again." };
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return { ok: false, code: "bad_response", message: `Unexpected server response (${res.status}). Please try again.` };
  return data;
}

export async function generateSite(brief: Brief, signal?: AbortSignal): Promise<GenerateResult> {
  const data = await post({ mode: "generate", brief }, signal);
  if (data.ok !== true) return data as unknown as ApiError;
  // Re-validate on the client too: the editor only ever holds normalised documents.
  return { ok: true, doc: normalizeDoc(data.doc).doc, remaining: Number(data.remaining ?? 0) };
}

export async function editWithAi(doc: SiteDoc, instruction: string, sectionId: string | null, signal?: AbortSignal): Promise<EditResult> {
  const assetIds = Object.keys(doc.assets);
  const data = await post({ mode: "edit", instruction, doc: stripAssets(doc), sectionId: sectionId ?? undefined, assetIds }, signal);
  if (data.ok !== true) return data as unknown as ApiError;
  if (data.section) {
    const check = normalizeDoc({ pages: [{ title: "x", sections: [data.section] }], assets: doc.assets }).doc.pages[0]?.sections[0];
    if (!check) return { ok: false, code: "invalid_output", message: "The AI returned a section we couldn't use." };
    check.id = (data.section as Section).id;
    return { ok: true, section: check, remaining: Number(data.remaining ?? 0) };
  }
  const merged = normalizeDoc({ ...(data.doc as object), assets: doc.assets }).doc;
  return { ok: true, doc: merged, remaining: Number(data.remaining ?? 0) };
}
