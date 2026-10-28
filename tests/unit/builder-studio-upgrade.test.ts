import { afterEach, describe, expect, it, vi } from "vitest";
import { videoSource } from "@/lib/builder/video";
import { normalizeDoc, validateAsset } from "@/lib/builder/schema";
import { exportRenderOptions, renderPageDocument } from "@/lib/builder/render";
import { GET } from "@/pages/api/media/search";
import type { APIContext } from "astro";
type MediaResponse = { ok: boolean; results: { id: string; url: string; attribution: string }[] };

const render = (sections: unknown[]) => {
  const { doc, warnings } = normalizeDoc({ name: "Test", pages: [{ title: "Home", sections }] });
  expect(warnings).toEqual([]);
  return renderPageDocument(doc, doc.pages[0]!, { ...exportRenderOptions(), stylesheetHref: undefined });
};
afterEach(() => vi.restoreAllMocks());

describe("builder media blocks", () => {
  it("canonicalizes supported providers and rejects executable or lookalike embeds", () => {
    expect(videoSource("https://youtu.be/aqz-KE-bpKQ?t=10")).toEqual({ kind: "embed", src: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" });
    expect(videoSource("https://vimeo.com/123456")).toEqual({ kind: "embed", src: "https://player.vimeo.com/video/123456" });
    expect(videoSource("https://cdn.example.com/film.mp4?token=abc")?.kind).toBe("mp4");
    for (const raw of ["javascript:alert(1)", "data:text/html,x", "http://cdn.example.com/x.mp4", "https://youtube.com.evil.test/embed/aqz-KE-bpKQ", "https://player.vimeo.com@evil.test/123", "https://evil.test/embed/x"]) expect(videoSource(raw)).toBeNull();
  });
  it("exports an accessible native video popover and transcript without scripts", () => {
    const html = render([{ type: "video", variant: "modal", props: { heading: "Demo", videoUrl: "https://youtu.be/aqz-KE-bpKQ", transcript: "A <safe> transcript" } }]);
    expect(html).toContain(" popover ");
    expect(html).toContain('popovertargetaction="hide"');
    expect(html).toContain("https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ");
    expect(html).toContain("A &lt;safe&gt; transcript");
    expect(html).not.toContain("<script");
  });
  it("keeps background video muted, looping and hidden under reduced motion", () => {
    const html = render([{ type: "hero", variant: "video", props: { videoUrl: "https://cdn.example.com/background.mp4" } }]);
    expect(html).toContain("autoplay muted loop playsinline");
    expect(html).toContain("@media(prefers-reduced-motion:reduce){.hero-video{display:none}}");
  });
  it("provides separate yearly prices and scoped native billing controls", () => {
    const html = render([{ type: "pricing", variant: "toggle", props: { plans: [{ name: "One", price: "$10", annualPrice: "$100", features: ["Feature"] }] } }]);
    expect(html).toContain('value="annual"');
    expect(html).toContain('class="annual-price"');
    expect(html).toContain("$100");
  });
  it("exports configured contact and newsletter endpoints and escapes labels", () => {
    const html = render([{ type: "contact", variant: "split", props: { formEndpoint: "https://formspree.io/f/example" } }, { type: "footer", variant: "columns", props: { newsletterEndpoint: "https://example.com/subscribe", socials: [{ label: "<Brand>", href: "https://example.com" }] } }]);
    expect(html).toContain('name="phone"');
    expect(html).toContain('action="https://example.com/subscribe"');
    expect(html).toContain("&lt;Brand&gt;");
  });
  it("keeps imported brand PNG assets through normalization and static export", () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const asset = validateAsset({ name: "Logo", mime: "image/png", dataUrl: png });
    expect(asset).not.toBeNull();
    const { doc } = normalizeDoc({ name: "Brand", assets: { logo: asset }, pages: [{ sections: [{ type: "navbar", props: { logo: { src: "asset:logo", alt: "Brand logo" } } }] }] });
    const html = renderPageDocument(doc, doc.pages[0]!, { ...exportRenderOptions(), assetUrl: () => "assets/logo.png" });
    expect(html).toContain('src="assets/logo.png"');
    expect(html).not.toContain(png);
  });
});

describe("stock media API contract", () => {
  it("requests public-domain media and drops restricted or unsafe upstream images", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ results: [
      { id: "good", url: "https://example.com/good.jpg", license: "cc0", creator: "Photographer", foreign_landing_url: "https://example.com/photo" },
      { id: "nc", url: "https://example.com/nc.jpg", license: "by-nc" },
      { id: "bad", url: "javascript:alert(1)", license: "cc0" },
    ] }));
    const response = await GET({ request: new Request("https://atittle.test/api/media/search?q=nonexistentuniquequery") } as APIContext);
    const json = await response.json() as MediaResponse;
    expect(String(fetch.mock.calls[0]?.[0])).toContain("license=cc0%2Cpdm");
    expect(json.ok).toBe(true);
    expect(json.results).toHaveLength(1);
    expect(json.results[0]).toMatchObject({ id: "ov-good", provider: "Openverse", attribution: "Photographer · CC0" });
  });
  it("returns relevant curated media and a valid page when the provider fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const response = await GET({ request: new Request("https://atittle.test/api/media/search?q=business&category=business&page=invalid") } as APIContext);
    const json = await response.json() as MediaResponse;
    expect(json).toMatchObject({ ok: true, page: 1, upstreamAvailable: false, source: "curated" });
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.every((p: { url: string; attribution: string }) => p.url.startsWith("https://") && p.attribution)).toBe(true);
  });
});
