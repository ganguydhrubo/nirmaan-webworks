import type { APIRoute } from "astro";
import manifest from "@/lib/builder/template-media.json";
import { safeImageSrc } from "@/lib/builder/sanitize";

const aliases: Record<string, string> = {
  business: "corporate consulting", technology: "software technology tech", healthcare: "medical healthcare",
  restaurant: "food restaurants dining", "real-estate": "real estate properties", fitness: "fitness sports",
  creative: "creative design photography", retail: "retail fashion ecommerce", sports: "fitness sports",
};
const clean = (v: unknown) => typeof v === "string" ? v.replace(/<[^>]*>/g, "").slice(0, 240) : "";
const https = (v: unknown) => typeof v === "string" && v.startsWith("https://") ? safeImageSrc(v) : "";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const page = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1));
  const category = (url.searchParams.get("category") || "all").toLowerCase().slice(0, 80);
  let upstreamAvailable = true;
  let remote: Record<string, unknown>[] = [];
  if (q || category !== "all") {
    try {
      const query = [q, category !== "all" ? category.replace(/-/g, " ") : ""].filter(Boolean).join(" ");
      const params = new URLSearchParams({ q: query, page: String(page), page_size: "24", license: "cc0,pdm", mature: "false", filter_dead: "true" });
      const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error("Stock provider unavailable");
      const data = await res.json() as { results?: Record<string, unknown>[] };
      remote = (data.results || []).filter(r => ["cc0", "pdm"].includes(String(r.license).toLowerCase()) && https(r.url)).map(r => ({
        id: `ov-${r.id}`, title: clean(r.title) || q, url: https(r.url), previewUrl: https(r.thumbnail) || https(r.url),
        width: Number(r.width) || 0, height: Number(r.height) || 0, photographer: clean(r.creator) || "Openverse contributor",
        attribution: `${clean(r.creator) || "Openverse contributor"} · ${String(r.license).toUpperCase()}`,
        sourceUrl: https(r.foreign_landing_url) || "https://openverse.org", license: String(r.license).toUpperCase(),
        licenseUrl: https(r.license_url) || "https://creativecommons.org/publicdomain/zero/1.0/", provider: "Openverse",
      }));
    } catch { upstreamAvailable = false; }
  }
  const matches = (text: string, query: string) => query.toLowerCase().split(/[\s&-]+/).filter(Boolean).some(word => text.includes(word));
  const curated = Object.values(manifest).filter(photo => {
    const text = `${photo.title} ${photo.category} ${photo.query}`.toLowerCase();
    return (category === "all" || matches(text, aliases[category] || category)) && (!q || matches(text, q));
  }).map(photo => ({ ...photo, previewUrl: photo.previewUrl || photo.url, provider: "Wikimedia", attribution: `${photo.photographer} · ${photo.license}` }));
  const seen = new Set<string>();
  const results = [...remote, ...curated.slice((page - 1) * 24, page * 24)].filter(p => { const src = String(p.url); if (seen.has(src)) return false; seen.add(src); return true; }).slice(0, 24);
  return Response.json({ ok: true, results, total: results.length, page, query: q, category, upstreamAvailable, source: remote.length ? "openverse" : "curated", hasMore: remote.length >= 24 || curated.length > page * 24 }, { headers: { "Cache-Control": "public, max-age=300" } });
};
