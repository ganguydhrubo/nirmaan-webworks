import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chatJson, chatJsonValidated, ChatError, parseJsonLoose } from "@/lib/ai/chat-provider";
import { briefSchema, docFromGeneration, docFromEdit, sectionFromEdit, systemPrompt } from "@/lib/builder/ai";
import { consumeAiCredit, _resetMemoryQuota } from "@/lib/builder/quota";
import { templateDoc } from "@/lib/builder/templates";

const ENV_KEYS = ["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "BUILDER_AI_PROVIDERS", "BUILDER_AI_DAILY_LIMIT_PER_IP", "BUILDER_AI_DAILY_LIMIT_GLOBAL"];
const saved: Record<string, string | undefined> = {};

function completion(content: string, status = 200) {
  return new Response(JSON.stringify({ model: "m", choices: [{ message: { content } }], usage: { total_tokens: 10 } }), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.GROQ_API_KEY = "g";
  process.env.GEMINI_API_KEY = "m";
  process.env.OPENROUTER_API_KEY = "o";
  delete process.env.BUILDER_AI_PROVIDERS;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("AI provider chain", () => {
  it("falls back from a rate-limited provider to the next one", async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      calls.push(String(url));
      if (String(url).includes("groq")) return new Response("{}", { status: 429 });
      return completion('{"ok":true}');
    });
    const r = await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    expect(r.provider).toBe("gemini");
    expect(r.attempts).toBe(2);
    expect(calls).toHaveLength(2);
  });

  it("moves on when output is rejected by the validator, and stops after the last provider", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => completion('{"bad":true}'));
    await expect(chatJsonValidated({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 }, () => null)).rejects.toBeInstanceOf(ChatError);
    expect(fetchMock).toHaveBeenCalledTimes(3); // bounded: one call per configured provider, no loops
  });

  it("skips providers without keys and respects the configured order", async () => {
    delete process.env.GROQ_API_KEY;
    process.env.BUILDER_AI_PROVIDERS = "openrouter,gemini";
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      urls.push(String(url));
      return completion('{"x":1}');
    });
    const r = await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 });
    expect(r.provider).toBe("openrouter");
    expect(urls[0]).toContain("openrouter.ai");
  });

  it("reports not_configured when no keys exist", async () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    await expect(chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 1000 })).rejects.toMatchObject({ code: "not_configured" });
  });

  it("never sends keys anywhere but the provider's own endpoint", async () => {
    const seen: { url: string; auth: string }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      seen.push({ url: String(url), auth: String((init?.headers as Record<string, string>).Authorization) });
      return new Response("{}", { status: 500 });
    });
    await chatJson({ system: "s", user: "u", maxTokens: 10, timeoutMs: 30_000 }).catch(() => undefined);
    expect(seen).toEqual([
      { url: "https://api.groq.com/openai/v1/chat/completions", auth: "Bearer g" },
      { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", auth: "Bearer m" },
      { url: "https://openrouter.ai/api/v1/chat/completions", auth: "Bearer o" },
    ]);
  });

  it("parses JSON wrapped in code fences", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Here you go: {"a":2} hope it helps')).toEqual({ a: 2 });
    expect(parseJsonLoose("not json")).toBeUndefined();
  });
});

describe("AI output guards (no fabricated facts)", () => {
  const brief = briefSchema.parse({
    businessName: "Bloom Yoga",
    websiteType: "local-service",
    description: "Yoga studio in New Town. Open Mon-Sat.",
    contact: { email: "hi@bloom.example", phone: "", whatsapp: "", address: "" },
  });

  it("overwrites invented contact details and flags testimonials as samples", () => {
    const doc = docFromGeneration(
      {
        name: "Bloom Yoga",
        stylePreset: "fresh",
        pages: [
          {
            title: "Home",
            sections: [
              { type: "hero", props: { headline: "Breathe" } },
              { type: "testimonials", props: { isSample: false, items: [{ quote: "Best studio!", name: "Priya S." }] } },
              { type: "contact", props: { email: "fake@made-up.com", phone: "+91 99999 99999", address: "12 Fake Street", hours: "6am - 9pm" } },
              { type: "faq", props: {} },
            ],
          },
        ],
      },
      brief,
    );
    const sections = doc.pages[0]!.sections;
    expect(sections[0]!.type).toBe("navbar"); // chrome added
    expect(sections[sections.length - 1]!.type).toBe("footer");
    const contact = sections.find((s) => s.type === "contact")!;
    expect(contact.props.email).toBe("hi@bloom.example");
    expect(contact.props.phone).toBe("");
    expect(contact.props.address).toBe("");
    expect(contact.props.hours).toBe(""); // user gave no times
    expect(sections.find((s) => s.type === "testimonials")!.props.isSample).toBe(true);
    expect(doc.theme.preset).toBe("fresh");
  });

  it("AI edits keep the user's contact details, ids and real-testimonial choice", () => {
    const current = templateDoc("consultant")!;
    const contact = current.pages[0]!.sections.find((s) => s.type === "contact")!;
    contact.props.email = "owner@real.example";
    const edited = JSON.parse(JSON.stringify(current));
    edited.pages[0].sections.find((s: { type: string }) => s.type === "contact").props.email = "ai@invented.example";
    const result = docFromEdit(edited, current, []);
    expect(result.pages[0]!.sections.find((s) => s.type === "contact")!.props.email).toBe("owner@real.example");
    expect(result.pages[0]!.sections.map((s) => s.id)).toEqual(current.pages[0]!.sections.map((s) => s.id));

    const hero = current.pages[0]!.sections.find((s) => s.type === "hero")!;
    const updated = sectionFromEdit({ type: "faq", props: { headline: "New headline", primaryHref: "javascript:alert(1)" } }, hero, []);
    expect(updated!.type).toBe("hero"); // type can't be changed by the model
    expect(updated!.id).toBe(hero.id);
    expect(updated!.props.headline).toBe("New headline");
    expect(updated!.props.primaryHref).toBe("");
  });

  it("describes every section type to the model", () => {
    const prompt = systemPrompt();
    for (const type of ["navbar", "hero", "about", "services", "features", "gallery", "testimonials", "pricing", "faq", "contact", "cta", "text", "footer"]) {
      expect(prompt).toContain(`- ${type}`);
    }
  });
});

describe("AI usage quota", () => {
  it("limits each visitor per day and keeps a global cap", async () => {
    process.env.BUILDER_AI_DAILY_LIMIT_PER_IP = "2";
    process.env.BUILDER_AI_DAILY_LIMIT_GLOBAL = "3";
    _resetMemoryQuota();
    const req = (ip: string) => new Request("https://x/api", { headers: { "X-Forwarded-For": ip } });
    expect((await consumeAiCredit(req("1.1.1.1"))).allowed).toBe(true);
    const second = await consumeAiCredit(req("1.1.1.1"));
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(await consumeAiCredit(req("1.1.1.1"))).toMatchObject({ allowed: false, reason: "visitor" });
    expect((await consumeAiCredit(req("2.2.2.2"))).allowed).toBe(true);
    expect(await consumeAiCredit(req("3.3.3.3"))).toMatchObject({ allowed: false, reason: "global" });
  });
});
