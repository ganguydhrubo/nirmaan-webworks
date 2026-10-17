import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chatJson, chatJsonValidated, classifyHttp, parseDuration, getProviderHealth, _resetProviderHealth } from "@/lib/ai/chat-provider";
import { extractGeminiImage, extractOpenRouterImage, sniffImage, validateImageData, generateImage, getImageAvailability, _resetImageHealth } from "@/lib/ai/image-provider";
import { consumeCredit, acquireSlot, _resetMemoryQuota } from "@/lib/builder/quota";
import { assessAndRepair } from "@/lib/builder/quality";
import { briefSchema, docFromGeneration, themeFromDesign } from "@/lib/builder/ai";
import { normalizeDoc } from "@/lib/builder/schema";
import { contrastRatio, themeFromPreset, THEME_PRESETS, FONTS } from "@/lib/builder/themes";
import { templateDoc } from "@/lib/builder/templates";

// 1x1 PNG / 64x64 PNG-like header for dimension sniffing
const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
function pngHeader(w: number, h: number): string {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(16, w);
  dv.setUint32(20, h);
  return btoa(String.fromCharCode(...bytes));
}

const KEYS = ["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "XAI_API_KEY", "BUILDER_XAI_MODEL", "BUILDER_AI_PROVIDERS", "BUILDER_IMAGE_PROVIDERS"];
const saved: Record<string, string | undefined> = {};
const completion = (content: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ model: "m", choices: [{ message: { content } }], usage: { total_tokens: 5 } }), { status: 200, headers: { "content-type": "application/json", ...headers } });

beforeEach(() => {
  for (const k of KEYS) saved[k] = process.env[k];
  process.env.GROQ_API_KEY = "g";
  process.env.GEMINI_API_KEY = "m";
  process.env.OPENROUTER_API_KEY = "o";
  delete process.env.BUILDER_AI_PROVIDERS;
  delete process.env.BUILDER_IMAGE_PROVIDERS;
  _resetProviderHealth();
  _resetImageHealth();
  _resetMemoryQuota();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("failure classification and circuit breaker", () => {
  it("classifies provider errors", () => {
    expect(classifyHttp("x", 429, "").kind).toBe("transient");
    expect(classifyHttp("x", 503, "").kind).toBe("transient");
    expect(classifyHttp("x", 401, "").kind).toBe("permanent");
    expect(classifyHttp("x", 402, "").code).toBe("unavailable");
    expect(classifyHttp("x", 404, "").kind).toBe("permanent");
    expect(classifyHttp("x", 400, '{"error":{"code":"json_validate_failed"}}').kind).toBe("output");
    expect(parseDuration("4m19.2s")).toBeCloseTo(259.2);
    expect(parseDuration("38.7s")).toBeCloseTo(38.7);
    expect(parseDuration("120ms")).toBeCloseTo(0.12);
    expect(parseDuration("7")).toBe(7);
  });

  it("benches a provider with bad credentials instead of calling it again", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      urls.push(String(url));
      return String(url).includes("groq") ? new Response("{}", { status: 401 }) : completion('{"ok":1}');
    });
    await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    expect(urls.filter((u) => u.includes("groq"))).toHaveLength(1); // second request skipped groq
    const health = await getProviderHealth();
    expect(health.find((h) => h.name === "groq")).toMatchObject({ available: false });
  });

  it("salvages Groq's failed_generation when it is valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("groq")
        ? new Response(JSON.stringify({ error: { code: "json_validate_failed", failed_generation: '```json\n{"name":"Saved"}\n```' } }), { status: 400 })
        : completion('{"name":"Other"}'),
    );
    const r = await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    expect(r.provider).toBe("groq");
    expect((r.json as { name: string }).name).toBe("Saved");
    expect(r.trace[0]).toMatchObject({ salvaged: true });
  });

  it("skips a provider whose token window can't fit the request", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      urls.push(String(url));
      return completion('{"x":1}', String(url).includes("groq") ? { "x-ratelimit-remaining-tokens": "900", "x-ratelimit-reset-tokens": "40s" } : {});
    });
    await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 }); // groq answers, reports 900 tokens left
    const r = await chatJson({ system: "s", user: "u", maxTokens: 4800, estimatedTokens: 7000, timeoutMs: 30_000 });
    expect(r.provider).toBe("gemini");
    expect(r.trace[0]).toMatchObject({ provider: "groq", skipped: expect.stringContaining("rate window") });
  });

  it("waits once for a short Retry-After on the last provider, then stops", async () => {
    process.env.BUILDER_AI_PROVIDERS = "groq";
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls++;
      return calls === 1 ? new Response("{}", { status: 429, headers: { "retry-after": "1" } }) : completion('{"ok":true}');
    });
    const r = await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    expect(r.provider).toBe("groq");
    expect(calls).toBe(2);
  });

  it("never loops: a rejecting validator costs one call per provider", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => completion('{"bad":1}'));
    await expect(chatJsonValidated({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 }, () => null)).rejects.toMatchObject({ code: "invalid_json" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses xAI only when both key and model are configured", async () => {
    process.env.XAI_API_KEY = "x";
    process.env.BUILDER_AI_PROVIDERS = "xai,groq";
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      urls.push(String(url));
      return completion('{"ok":1}');
    });
    await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    expect(urls[0]).toContain("groq"); // no BUILDER_XAI_MODEL → xai skipped
    process.env.BUILDER_XAI_MODEL = "grok-test";
    await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    expect(urls[1]).toContain("api.x.ai");
  });
});

describe("image generation", () => {
  it("extracts the image part from a Gemini response with text and image parts", () => {
    const res = { candidates: [{ content: { parts: [{ text: "Here is your image" }, { inlineData: { mimeType: "image/png", data: PNG_1PX } }] } }] };
    expect(extractGeminiImage(res)).toEqual({ data: PNG_1PX });
  });

  it("does not mistake a text-only answer for an image", () => {
    expect(extractGeminiImage({ candidates: [{ content: { parts: [{ text: "A lovely cafe with plants…" }] } }] })).toEqual({ text: "A lovely cafe with plants…" });
    expect(extractOpenRouterImage({ choices: [{ message: { content: "I can't draw that" } }] })).toEqual({ text: "I can't draw that" });
  });

  it("extracts OpenRouter image URLs", () => {
    expect(extractOpenRouterImage({ choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${PNG_1PX}` } }] } }] })).toEqual({ data: PNG_1PX });
  });

  it("validates real image bytes and dimensions", () => {
    const ok = validateImageData(pngHeader(1024, 768), "gemini", "m");
    expect(ok).toMatchObject({ mime: "image/png", width: 1024, height: 768 });
    expect(() => validateImageData(btoa("not an image at all"), "gemini", "m")).toThrow();
    expect(() => validateImageData(PNG_1PX, "gemini", "m")).toThrow(/dimensions/); // 1x1 is unusable
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 200, 1, 44, 3, 1, 0x22, 0, 2, 0x11, 1]))).toMatchObject({ mime: "image/jpeg", width: 300, height: 200 });
  });

  it("treats a free-tier zero quota as unavailable and benches the provider (no repeated calls)", async () => {
    process.env.BUILDER_IMAGE_PROVIDERS = "gemini";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: { code: 429, message: "You exceeded your current quota", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "55048s" }] } }), { status: 429 }),
    );
    await expect(generateImage({ prompt: "x", aspectRatio: "1:1", timeoutMs: 20_000 })).rejects.toMatchObject({ code: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(1); // other models of the same account not hammered
    expect((await getImageAvailability()).available).toBe(false);
  });

  it("falls back from Gemini to OpenRouter and returns a validated image", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("googleapis")
        ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "no image" }] } }] }), { status: 200 })
        : new Response(JSON.stringify({ choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${pngHeader(800, 600)}` } }] } }] }), { status: 200 }),
    );
    const img = await generateImage({ prompt: "cafe", aspectRatio: "4:3", timeoutMs: 30_000 });
    expect(img).toMatchObject({ provider: "openrouter", width: 800, height: 600 });
  });
});

describe("quota refunds and concurrency", () => {
  it("refunds failed requests and keeps text and image limits separate", async () => {
    process.env.BUILDER_AI_DAILY_LIMIT_PER_IP = "1";
    process.env.BUILDER_IMAGE_DAILY_LIMIT_PER_IP = "1";
    const req = new Request("https://x", { headers: { "X-Forwarded-For": "9.9.9.9" } });
    const first = await consumeCredit(req, "text");
    expect(first.allowed).toBe(true);
    expect((await consumeCredit(req, "text")).allowed).toBe(false);
    await first.refund();
    await first.refund(); // idempotent
    expect((await consumeCredit(req, "text")).allowed).toBe(true);
    expect((await consumeCredit(req, "image")).allowed).toBe(true);
    delete process.env.BUILDER_AI_DAILY_LIMIT_PER_IP;
    delete process.env.BUILDER_IMAGE_DAILY_LIMIT_PER_IP;
  });

  it("allows one in-flight AI request per visitor", () => {
    const release = acquireSlot("v1")!;
    expect(release).toBeTypeOf("function");
    expect(acquireSlot("v1")).toBeNull();
    expect(acquireSlot("v2")).not.toBeNull();
    release();
    expect(acquireSlot("v1")).not.toBeNull();
  });
});

describe("design system and quality gate", () => {
  it("has 12 design directions with readable palettes and real font specs", () => {
    expect(THEME_PRESETS).toHaveLength(12);
    for (const p of THEME_PRESETS) {
      expect(contrastRatio(p.colors.text, p.colors.bg), p.preset).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.colors.muted, p.colors.bg), p.preset).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.colors.accent, p.colors.accentText), p.preset).toBeGreaterThanOrEqual(3);
      expect(FONTS[p.fontHeading], p.preset).toBeDefined();
    }
  });

  it("repairs an unreadable AI palette", () => {
    const t = themeFromDesign({ direction: "saas", palette: { bg: "#ffffff", text: "#eeeeee", muted: "#f0f0f0", accent: "#ffff99", dark: "#f5f5f5" } }, "local");
    expect(t.preset).toBe("saas");
    expect(contrastRatio(t.colors.text, t.colors.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.colors.muted, t.colors.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.colors.dark, t.colors.darkText)).toBeGreaterThanOrEqual(4.5);
  });

  it("switches to Devanagari fonts for Hindi content", () => {
    const brief = briefSchema.parse({ businessName: "शर्मा डेंटल", websiteType: "local-service", description: "कोलकाता में परिवार के लिए दांतों का क्लिनिक" });
    const doc = docFromGeneration({ design: { direction: "local", fontHeading: "Fraunces" }, pages: [{ title: "होम", sections: [{ type: "hero", props: { headline: "मुस्कान आपकी, देखभाल हमारी" } }] }] }, brief);
    expect(FONTS[doc.theme.fontHeading]!.category).toBe("devanagari");
    expect(doc.language).toBe("hi");
  });

  it("rejects thin or headline-less output so the next provider gets a turn", () => {
    const { doc } = normalizeDoc({ pages: [{ title: "Home", sections: [{ type: "hero", props: { headline: "" } }] }] });
    const report = assessAndRepair(doc);
    expect(report.ok).toBe(false);
    expect(report.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["no_hero", "thin_home"]));
  });

  it("repairs monotone backgrounds, repeated layouts and broken page links", () => {
    const { doc } = normalizeDoc({
      theme: themeFromPreset("saas"),
      pages: [
        {
          title: "Home",
          sections: [
            { type: "hero", props: { headline: "Hi", primaryLabel: "Go", primaryHref: "page:missing" }, style: { background: "default" } },
            { type: "services", variant: "cards", props: { heading: "A" }, style: { background: "default" } },
            { type: "services", variant: "cards", props: { heading: "B" }, style: { background: "default" } },
            { type: "faq", props: { heading: "C" }, style: { background: "default" } },
          ],
        },
      ],
    });
    const report = assessAndRepair(doc);
    expect(report.ok).toBe(true);
    const body = doc.pages[0]!.sections;
    expect(body[0]!.props.primaryHref).toBe("#contact");
    expect(body[2]!.variant).not.toBe(body[1]!.variant);
    expect(new Set(body.map((s) => s.style.background)).size).toBeGreaterThan(1);
  });

  it("all templates pass the quality gate", () => {
    for (const id of ["small-business", "portfolio", "consultant", "freelancer", "agency", "restaurant", "local-service", "personal-brand", "startup", "product"]) {
      expect(assessAndRepair(templateDoc(id)!).ok, id).toBe(true);
    }
  });
});
