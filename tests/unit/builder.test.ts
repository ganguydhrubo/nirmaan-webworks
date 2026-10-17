import { describe, it, expect } from "vitest";
import { safeHref, safeImageSrc, escapeHtml, slugify } from "@/lib/builder/sanitize";
import { normalizeDoc, validateAsset, MAX_ASSET_BYTES } from "@/lib/builder/schema";
import { renderPageDocument, renderPageBody, exportRenderOptions } from "@/lib/builder/render";
import { buildSiteFiles, exportZip, exportChecklist } from "@/lib/builder/export";
import { createZip, readZip, isSafeZipPath } from "@/lib/builder/zip";
import { TEMPLATE_LIST, templateDoc, blankDoc } from "@/lib/builder/templates";
import { normalizeTheme, contrastRatio, withAccent } from "@/lib/builder/themes";

const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("builder: link and image sanitising", () => {
  it("allows safe link forms", () => {
    expect(safeHref("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeHref("page:about")).toBe("page:about");
    expect(safeHref("#contact")).toBe("#contact");
    expect(safeHref("mailto:hi@example.com")).toBe("mailto:hi@example.com");
    expect(safeHref("tel:+91 93303 93298")).toBe("tel:+919330393298");
    expect(safeHref("example.com")).toBe("https://example.com/");
  });

  it("rejects script and other dangerous schemes", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\tscript:alert(1)", " javascript:alert(1)", "data:text/html,<script>", "vbscript:x", "//evil.com", "file:///etc/passwd", "page:../x", "#\"><script>"]) {
      expect(safeHref(bad), bad).toBe("");
    }
  });

  it("only allows https raster images or known assets", () => {
    expect(safeImageSrc("https://images.example.com/a.jpg")).toBe("https://images.example.com/a.jpg");
    expect(safeImageSrc("http://example.com/a.jpg")).toBe("");
    expect(safeImageSrc("https://example.com/a.svg")).toBe("");
    expect(safeImageSrc("data:image/png;base64,AAAA")).toBe("");
    expect(safeImageSrc("asset:img-1", new Set(["img-1"]))).toBe("asset:img-1");
    expect(safeImageSrc("asset:missing", new Set(["img-1"]))).toBe("");
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<img src=x onerror="a">'`)).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;&#39;");
  });

  it("slugifies to file-safe names", () => {
    expect(slugify("Our Services & Prices!")).toBe("our-services-prices");
    expect(slugify("../../etc")).toBe("etc");
    expect(slugify("नमस्ते")).toBe("page");
  });
});

describe("builder: document normalisation", () => {
  it("repairs a messy AI-style document into a valid one", () => {
    const { doc, warnings } = normalizeDoc({
      name: "  Test <b>Site</b>  ",
      theme: { preset: "night", colors: { accent: "red", bg: "#123456" }, fontHeading: "Comic Sans" },
      pages: [
        {
          title: "Home",
          slug: "/",
          sections: [
            { type: "footer", props: { brand: "X" } },
            { type: "hero", variant: "nope", props: { headline: "Hi", primaryHref: "javascript:alert(1)" } },
            { type: "team", props: {} },
            { type: "navbar", props: { brand: "X" } },
            { type: "navbar", props: { brand: "Duplicate" } },
          ],
        },
        { title: "About Us", sections: [] },
        { title: "About Us", sections: [] },
      ],
    });
    expect(doc.name).toBe("Test <b>Site</b>"); // kept as text; escaped at render time
    expect(doc.theme.preset).toBe("night");
    expect(doc.theme.colors.bg).toBe("#123456");
    expect(doc.theme.colors.accent).not.toBe("red");
    expect(doc.theme.fontHeading).toBe("Space Grotesk");
    const home = doc.pages[0]!;
    expect(home.slug).toBe("index");
    expect(home.sections.map((s) => s.type)).toEqual(["navbar", "hero", "footer"]);
    expect(home.sections[1]!.variant).toBe("centered");
    expect(home.sections[1]!.props.primaryHref).toBe("");
    expect(doc.pages.map((p) => p.slug)).toEqual(["index", "about-us", "about-us-3"]);
    expect(warnings.some((w) => w.includes("team"))).toBe(true);
    expect(new Set(doc.pages.flatMap((p) => p.sections.map((s) => s.id))).size).toBe(3);
  });

  it("validates uploaded images by signature and size", () => {
    expect(validateAsset({ name: "a.png", mime: "image/png", dataUrl: PNG_1PX })).not.toBeNull();
    expect(validateAsset({ name: "a.jpg", mime: "image/jpeg", dataUrl: PNG_1PX.replace("image/png", "image/jpeg") })).toBeNull();
    expect(validateAsset({ name: "a.svg", mime: "image/svg+xml", dataUrl: "data:image/svg+xml;base64,PHN2Zz4=" })).toBeNull();
    const huge = "data:image/png;base64," + "iVBORw0KGgo" + "A".repeat(Math.ceil((MAX_ASSET_BYTES * 4) / 3) + 10);
    expect(validateAsset({ name: "big.png", mime: "image/png", dataUrl: huge })).toBeNull();
  });

  it("keeps theme colours safe for CSS interpolation", () => {
    const theme = normalizeTheme({ colors: { bg: "#fff;}</style><script>alert(1)</script>" } });
    expect(theme.colors.bg).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("picks readable button text for any brand colour", () => {
    for (const accent of ["#ffff00", "#000080", "#22c55e", "#c1522e"]) {
      const t = withAccent(normalizeTheme({}), accent);
      expect(contrastRatio(t.colors.accent, t.colors.accentText)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("builder: rendering", () => {
  it("escapes all user/AI text and never emits scripts in export mode", () => {
    const { doc } = normalizeDoc({
      name: "</title><script>alert(1)</script>",
      pages: [
        {
          title: "Home",
          sections: [
            { type: "hero", props: { headline: "<img src=x onerror=alert(1)>", subheadline: "\"'><svg onload=alert(1)>", primaryLabel: "Go", primaryHref: "javascript:alert(1)" } },
            { type: "contact", variant: "split", props: { email: "a@b.co\"><script>", formEndpoint: "javascript:alert(1)" } },
          ],
        },
      ],
    });
    const html = renderPageDocument(doc, doc.pages[0]!, exportRenderOptions());
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img src=x/i);
    expect(html).not.toMatch(/<svg onload/i);
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("resolves page links and cross-page anchors to relative files", () => {
    const { doc } = normalizeDoc({
      name: "Two pages",
      pages: [
        { title: "Home", sections: [{ type: "navbar", props: { ctaLabel: "Contact", ctaHref: "#contact" } }, { type: "hero", props: { primaryLabel: "About", primaryHref: "page:about" } }] },
        { title: "About", slug: "about", sections: [{ type: "contact", props: { email: "x@example.com" } }] },
      ],
    });
    const home = renderPageBody(doc, doc.pages[0]!, exportRenderOptions());
    expect(home).toContain('href="about.html"');
    expect(home).toContain('href="about.html#contact"');
    const about = renderPageBody(doc, doc.pages[1]!, exportRenderOptions());
    expect(about).toContain('id="contact"');
  });

  it("marks sample testimonials in the exported site", () => {
    const doc = templateDoc("small-business")!;
    const html = renderPageBody(doc, doc.pages[0]!, exportRenderOptions());
    expect(html).toContain("Sample testimonials");
    expect(exportChecklist(doc).some((i) => i.message.includes("Sample testimonials"))).toBe(true);
  });

  it("adds editing hooks only in editor mode", () => {
    const doc = templateDoc("consultant")!;
    const editor = renderPageBody(doc, doc.pages[0]!, { mode: "editor", pageHref: (s) => `#page:${s}`, assetUrl: () => "" });
    const exported = renderPageBody(doc, doc.pages[0]!, exportRenderOptions());
    expect(editor).toContain("data-edit=");
    expect(editor).toContain("data-section=");
    expect(exported).not.toContain("data-edit=");
    expect(exported).not.toContain("data-section=");
  });
});

describe("builder: export", () => {
  it("produces a self-contained file set with relative paths", () => {
    const { doc } = normalizeDoc({
      ...templateDoc("agency")!,
      assets: { "img-1": { name: "logo.png", mime: "image/png", dataUrl: PNG_1PX }, unused: { name: "u.png", mime: "image/png", dataUrl: PNG_1PX } },
    });
    doc.pages[0]!.sections[1]!.props.image = { src: "asset:img-1", alt: "Team at work" };
    const files = buildSiteFiles(doc);
    const paths = files.map((f) => f.path);
    expect(paths).toEqual(expect.arrayContaining(["index.html", "services.html", "assets/styles.css", "assets/images/img-1.png", "README.txt"]));
    expect(paths).not.toContain("assets/images/unused.png");
    const index = files.find((f) => f.path === "index.html")!.data as string;
    expect(index).toContain('href="assets/styles.css"');
    expect(index).toContain('src="assets/images/img-1.png"');
    expect(index).not.toMatch(/https?:\/\/(localhost|atittle)/);
    expect(index).not.toMatch(/<script/i);
    for (const f of files) expect(isSafeZipPath(f.path)).toBe(true);
  });

  it("writes a valid ZIP that round-trips byte-for-byte", () => {
    const doc = templateDoc("restaurant")!;
    const { bytes, fileName } = exportZip(doc);
    expect(fileName).toBe("the-courtyard-cafe-website.zip");
    const entries = readZip(bytes);
    expect(entries.map((e) => e.path)).toContain("index.html");
    expect(entries.every((e) => e.crcOk)).toBe(true);
    const files = buildSiteFiles(doc);
    const css = new TextDecoder().decode(entries.find((e) => e.path === "assets/styles.css")!.data);
    expect(css).toBe(files.find((f) => f.path === "assets/styles.css")!.data);
  });

  it("refuses path traversal in archives", () => {
    for (const bad of ["../evil.html", "/abs.html", "a/../../b", "a\\b", "a//b", ""]) {
      expect(() => createZip([{ path: bad, data: "x" }])).toThrow();
    }
  });
});

describe("builder: templates", () => {
  it("has 10 templates that all normalise and render", () => {
    expect(TEMPLATE_LIST).toHaveLength(10);
    for (const t of TEMPLATE_LIST) {
      const doc = templateDoc(t.id)!;
      expect(doc, t.id).not.toBeNull();
      const again = normalizeDoc(JSON.parse(JSON.stringify(doc)));
      expect(again.warnings, t.id).toEqual([]);
      for (const p of doc.pages) {
        const html = renderPageDocument(doc, p, exportRenderOptions());
        expect(html.length).toBeGreaterThan(1000);
        expect(html).not.toContain("undefined");
        expect(html).not.toContain("[object Object]");
      }
    }
    expect(blankDoc("X").pages[0]!.sections.length).toBeGreaterThan(0);
  });
});
