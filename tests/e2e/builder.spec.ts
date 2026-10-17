import { test, expect, type Page, type FrameLocator, type Locator } from "@playwright/test";
import { readZip } from "../../src/lib/builder/zip";
import { templateDoc } from "../../src/lib/builder/templates";
import { themeFromPreset } from "../../src/lib/builder/themes";

const templateDocJson = (id: string) => JSON.parse(JSON.stringify(templateDoc(id)));
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * End-to-end checks for the AI Website Builder (/free-website-builder).
 * Tests marked "(mocked AI)" intercept /api/builder/generate in the browser
 * so they don't spend real AI quota; the real-provider test only runs with
 * BUILDER_REAL_AI=1.
 */

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Pre-existing, unrelated: the site-wide demo theatre requests
    // /demos/<slug>/?theatre=1, which 404s on the dev server (trailing slash)
    // but redirects fine in production.
    if (/theatre=1/.test(m.location().url)) return;
    if (m.type() === "error" && !/favicon|fonts\.g|net::ERR/i.test(m.text())) errors.push(m.text());
  });
  return errors;
};

const canvas = (page: Page): FrameLocator => page.frameLocator(".atb-device iframe");

async function openTemplate(page: Page, id = "consultant") {
  await page.goto(`/free-website-builder/app?template=${id}`);
  // Generous first-load timeout: the dev server compiles the editor on first request.
  await expect(page.locator(".atb-editor")).toBeVisible({ timeout: 30_000 });
  await expect(canvas(page).locator("h1").first()).toBeVisible({ timeout: 15_000 });
}

/**
 * Real mouse click on an element inside the scaled preview iframe.
 * Playwright's own click ignores the iframe's CSS transform: scale() and
 * aims at unscaled coordinates; browsers themselves hit-test correctly.
 */
async function clickInCanvas(page: Page, target: Locator) {
  const frameEl = page.locator(".atb-device iframe");
  const box = (await frameEl.boundingBox())!;
  const scale = await frameEl.evaluate((f) => f.getBoundingClientRect().width / (f as HTMLElement).offsetWidth);
  const r = await target.evaluate((el) => {
    el.scrollIntoView({ block: "center" });
    const b = el.getBoundingClientRect();
    return { x: b.x + Math.min(b.width - 2, b.width / 2), y: b.y + b.height / 2 };
  });
  await page.mouse.click(box.x + r.x * scale, box.y + r.y * scale);
}

test("landing page: entry point, CTAs, SEO and live template previews", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/free-website-builder");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build your website with AI");
  await expect(page.getByRole("link", { name: "Create My Website Free" }).first()).toHaveAttribute("href", "/free-website-builder/app?start=ai");
  await expect(page.getByRole("link", { name: "Explore Templates" })).toHaveAttribute("href", "#templates");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://atittle.com/free-website-builder");
  await expect(page.locator("#templates li")).toHaveCount(10);
  // Entry points: mobile menu + footer (the desktop bar is intentionally unchanged — it's full).
  await expect(page.locator('nav[aria-label="Mobile"] a[href="/free-website-builder"]')).toHaveCount(1);
  await expect(page.locator('footer a[href="/free-website-builder"]').first()).toBeAttached();
  // Hero ad video: lazy (no download until near the viewport), captions burned in, sound on tap.
  const video = page.locator("[data-builder-video] video");
  await expect(video).toHaveAttribute("data-src", "/videos/atittle-builder-ad-hi.mp4");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(page.getByRole("button", { name: /वीडियो देखें/ })).toBeVisible();
  await expect(page.locator("#builder-video-transcript")).toContainText("ATITTLE का फ्री AI वेबसाइट बिल्डर");
  await expect(page.locator(".builder-thumb iframe").first()).toBeAttached();
  expect(errors, errors.join(" | ")).toEqual([]);
});

test("editor app is noindex and existing homepage still works", async ({ page }) => {
  await page.goto("/free-website-builder/app");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("#builder a[href='/free-website-builder/app?start=ai']")).toBeVisible();
  await expect(page.locator("#site-header-bar, header").first()).toBeVisible();
});

test("template → visual editing → undo/redo → persistence", async ({ page }) => {
  const errors = errorsOf(page);
  await openTemplate(page);
  const frame = canvas(page);

  // Select the hero from the section list and edit the headline in the panel.
  await page.locator(".atb-section-item", { hasText: "Hero" }).click();
  const headline = page.getByLabel("Headline", { exact: true });
  await headline.fill("Clear advice for growing clinics");
  await expect(frame.locator("h1")).toHaveText("Clear advice for growing clinics");

  // Inline edit directly in the canvas updates the panel.
  const h1 = frame.locator("h1");
  await clickInCanvas(page, h1);
  await page.keyboard.press("Control+End"); // end of the whole field, not just the first wrapped line
  await page.keyboard.type(" today");
  await page.keyboard.press("Enter"); // single-line field: Enter commits
  await expect(headline).toHaveValue("Clear advice for growing clinics today");

  // Undo / redo via toolbar.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(frame.locator("h1")).toHaveText("Clear advice for growing clinics");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(frame.locator("h1")).toHaveText("Clear advice for growing clinics today");

  // Change layout and section style.
  await page.getByLabel("Layout").selectOption("centered");
  await expect(frame.locator(".sec-hero.v-centered")).toHaveCount(1);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(frame.locator(".sec-hero.bg-dark")).toHaveCount(1);

  // Add, duplicate, reorder and delete sections.
  const before = await page.locator(".atb-section-list li").count();
  await page.getByRole("button", { name: "Add section" }).click();
  await page.locator(".atb-add-card", { hasText: "Gallery" }).click();
  await expect(page.locator(".atb-section-list li")).toHaveCount(before + 1);
  await page.getByRole("button", { name: "Duplicate section" }).click();
  await expect(page.locator(".atb-section-list li")).toHaveCount(before + 2);
  await expect(frame.locator(".sec-gallery")).toHaveCount(2);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete section" }).click();
  await expect(page.locator(".atb-section-list li")).toHaveCount(before + 1);

  const faqItem = page.locator(".atb-section-item", { hasText: "FAQ" });
  const idxBefore = await page.locator(".atb-section-item").evaluateAll((els) => els.findIndex((e) => e.textContent?.includes("FAQ")));
  await faqItem.focus();
  await page.keyboard.press("Alt+ArrowUp");
  const idxAfter = await page.locator(".atb-section-item").evaluateAll((els) => els.findIndex((e) => e.textContent?.includes("FAQ")));
  expect(idxAfter).toBe(idxBefore - 1);

  // Theme change reaches the canvas.
  await page.getByRole("tab", { name: "Design" }).click();
  await page.getByRole("button", { name: /Bold creative studio/ }).click();
  await expect.poll(async () => frame.locator("body").evaluate((b) => getComputedStyle(b).getPropertyValue("--accent").trim())).toBe(themeFromPreset("studio").colors.accent);
  // Component tokens reach the canvas too.
  await page.getByRole("radiogroup", { name: "Buttons" }).getByRole("radio", { name: "Pill" }).click();
  await expect.poll(async () => frame.locator("body").evaluate((b) => getComputedStyle(b).getPropertyValue("--r-btn").trim())).toBe("999px");

  // Autosave, then reload: the project reopens from browser storage.
  await expect(page.locator(".atb-save")).toContainText("Saved", { timeout: 10_000 });
  await page.reload();
  await expect(canvas(page).locator("h1")).toHaveText("Clear advice for growing clinics today");
  expect(page.url()).toContain("project=");
  expect(errors).toEqual([]);
});

test("pages: add a page, navigate via the canvas menu", async ({ page }) => {
  await openTemplate(page, "small-business");
  await page.getByRole("tab", { name: "Pages" }).click();
  await page.getByLabel("New page name").fill("Our Services");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(canvas(page).locator("h1")).toHaveText("Our Services");
  await clickInCanvas(page, canvas(page).locator(".nav-link", { hasText: "Home" }));
  await expect(canvas(page).locator("h1")).toContainText("Everything you need");
});

test("download ZIP: valid archive that works without the editor", async ({ page, browser }) => {
  await openTemplate(page, "agency");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Sample testimonials", { timeout: 2000 }).catch(() => undefined);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("[data-action=download-website]").click()]);
  expect(download.suggestedFilename()).toBe("northwind-creative-website.zip");
  const zipPath = await download.path();
  const entries = readZip(new Uint8Array(fs.readFileSync(zipPath!)));
  const names = entries.map((e) => e.path);
  expect(names).toEqual(expect.arrayContaining(["index.html", "services.html", "assets/styles.css", "README.txt"]));
  expect(entries.every((e) => e.crcOk)).toBe(true);

  // Extract and open the site straight from disk.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atb-export-"));
  for (const e of entries) {
    const target = path.join(dir, e.path);
    expect(target.startsWith(dir)).toBe(true);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, e.data);
  }
  const index = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  expect(index).not.toMatch(/<script/i);
  expect(index).not.toMatch(/data-edit|data-section|localhost|127\.0\.0\.1/);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const site = await ctx.newPage();
  const siteErrors = errorsOf(site);
  await site.goto("file://" + path.join(dir, "index.html").replace(/\\/g, "/"));
  await expect(site.locator("h1")).toBeVisible();
  // CSS loaded from the relative path:
  expect(await site.locator("body").evaluate((b) => getComputedStyle(b).getPropertyValue("--accent").trim())).toMatch(/^#/);
  // No horizontal overflow on a phone.
  expect(await site.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  // Mobile menu (native <details>) opens and links to the other page.
  await site.locator(".nav-mobile summary").click();
  await site.locator(".nav-mlink", { hasText: "Services" }).click();
  await expect(site).toHaveURL(/services\.html$/);
  await expect(site.locator("h1")).toBeVisible();
  expect(siteErrors).toEqual([]);
  await ctx.close();
});

test("AI generation (mocked AI): progress, result in editor, quota display", async ({ page }) => {
  await page.route("**/api/builder/generate", async (route) => {
    const { templateDoc } = await import("../../src/lib/builder/templates");
    await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ json: { ok: true, doc: { ...templateDoc("restaurant")!, name: "Masala Lane" }, remaining: 4 } });
  });
  await page.goto("/free-website-builder/app?start=ai");
  await page.getByLabel(/Business or website name/).fill("Masala Lane");
  await page.getByLabel(/Describe your business/).fill("A small Bengali home-style restaurant in Gariahat with a lunch thali.");
  await page.getByRole("button", { name: "Generate my website" }).click();
  await expect(page.locator(".atb-build")).toBeVisible();
  await expect(page.locator(".atb-editor")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".atb-tb-name")).toHaveText("Masala Lane");
});

test("AI errors (mocked AI): quota exceeded offers templates, not a paid retry", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/builder/generate", (route) => {
    calls++;
    return route.fulfill({ status: 429, json: { ok: false, code: "quota_exceeded", message: "You've used your 5 free AI requests for today.", remaining: 0 } });
  });
  await page.goto("/free-website-builder/app?start=ai");
  await page.getByLabel(/Business or website name/).fill("Test Co");
  await page.getByLabel(/Describe your business/).fill("We test things carefully every day.");
  const button = page.getByRole("button", { name: "Generate my website" });
  await button.dblclick(); // a double click must not fire two paid requests
  await expect(page.getByRole("alert")).toContainText("free AI requests");
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start from a template instead" })).toBeVisible();
  expect(calls).toBe(1);
});

test("server rejects invalid input before spending AI quota", async ({ request }) => {
  const res = await request.post("/api/builder/generate", { data: { mode: "generate", brief: { businessName: "", websiteType: "other", description: "x" } } });
  expect(res.status()).toBe(400);
  const big = await request.post("/api/builder/generate", { data: { mode: "edit", instruction: "x".repeat(100), doc: { pad: "x".repeat(90_000) } } });
  expect(big.status()).toBe(413);
  // Non-JSON posts are refused (Astro's origin check answers 403 for
  // cross-site form-style requests before our handler's own 415).
  const wrongType = await request.post("/api/builder/generate", { headers: { "content-type": "text/plain" }, data: "hello" });
  expect([403, 415]).toContain(wrongType.status());
});

test("preview iframe is sandboxed away from the app origin", async ({ page }) => {
  await openTemplate(page);
  await expect(page.locator(".atb-device iframe")).toHaveAttribute("sandbox", "allow-scripts");
  const origin = await canvas(page).locator("body").evaluate(() => {
    try {
      return window.origin + "|" + String(window.parent.document);
    } catch {
      return window.origin + "|blocked";
    }
  });
  expect(origin).toBe("null|blocked");
});

test("mobile: builder is usable with tabbed panes", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await openTemplate(page, "freelancer");
  await expect(page.locator(".atb-mobile-tabs")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole("tab", { name: "Sections & design" }).click();
  await page.locator(".atb-section-item", { hasText: "Pricing" }).click();
  await expect(page.locator(".atb-col-right")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await ctx.close();
});

test("real AI generation end-to-end", async ({ page }) => {
  test.skip(process.env.BUILDER_REAL_AI !== "1", "set BUILDER_REAL_AI=1 to spend one real AI request");
  test.setTimeout(120_000);
  await page.goto("/free-website-builder/app?start=ai");
  await page.getByLabel(/Business or website name/).fill("Bloom Yoga Studio");
  await page.getByLabel(/Describe your business/).fill("Small yoga studio in New Town, Kolkata offering morning and evening classes for beginners and seniors.");
  await page.getByRole("button", { name: "Generate my website" }).click();
  await expect(page.locator(".atb-editor")).toBeVisible({ timeout: 90_000 });
  await expect(canvas(page).locator("h1")).toBeVisible();
  await expect(canvas(page).locator(".sec-navbar")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// Image workflows
// ---------------------------------------------------------------------------

async function makeJpeg(page: Page, w = 640, h = 420): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ({ w, h }) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#c1522e");
      grad.addColorStop(1, "#2b5f5c");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.9);
    },
    { w, h },
  );
  return Buffer.from(dataUrl.split(",")[1]!, "base64");
}

async function openHeroImage(page: Page) {
  await page.locator(".atb-section-item", { hasText: "Hero" }).click();
  await expect(page.locator(".atb-image-sources")).toBeVisible();
}

test("upload image → shows in canvas → survives reload → included in ZIP", async ({ page }) => {
  await openTemplate(page, "small-business");
  await openHeroImage(page);
  await page.locator(".atb-image-sources").getByRole("button", { name: "Upload" }).click();
  await page.locator('.atb-studio-pane input[type="file"]').setInputFiles({ name: "shop.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page) });
  await expect(canvas(page).locator(".sec-hero img")).toHaveCount(1);
  expect(await canvas(page).locator(".sec-hero img").evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(100);
  await expect(page.locator(".atb-image-field .atb-tag")).toHaveText("Uploaded");

  await expect(page.locator(".atb-save")).toContainText("Saved", { timeout: 10_000 });
  await page.reload();
  await expect(canvas(page).locator(".sec-hero img")).toHaveCount(1, { timeout: 15_000 });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("[data-action=download-website]").click()]);
  const entries = readZip(new Uint8Array(fs.readFileSync((await download.path())!)));
  const img = entries.find((e) => e.path.startsWith("assets/images/"));
  expect(img, entries.map((e) => e.path).join(",")).toBeDefined();
  expect([...img!.data.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]); // real JPEG bytes
  const index = new TextDecoder().decode(entries.find((e) => e.path === "index.html")!.data);
  expect(index).toContain(`src="${img!.path}"`);
});

test("library reuse, rename and safe delete", async ({ page }) => {
  await openTemplate(page, "small-business");
  await openHeroImage(page);
  await page.locator(".atb-image-sources").getByRole("button", { name: "Upload" }).click();
  await page.locator('.atb-studio-pane input[type="file"]').setInputFiles({ name: "front.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page) });
  await expect(canvas(page).locator(".sec-hero img")).toHaveCount(1);
  // Reuse it in the About section
  await page.locator(".atb-section-item", { hasText: "About" }).click();
  await page.locator(".atb-image-sources").getByRole("button", { name: "Your images" }).click();
  await expect(page.locator(".atb-library li")).toHaveCount(1);
  await page.getByLabel("Image name").fill("Shop front");
  const del = page.getByRole("button", { name: "Delete Shop front" });
  await expect(del).toBeDisabled(); // in use → can't be deleted
  await page.getByRole("button", { name: "Use Shop front" }).click();
  await expect(canvas(page).locator(".sec-about img")).toHaveCount(1);
});

test("illustration fallback is applied and labelled as an illustration", async ({ page }) => {
  await openTemplate(page, "consultant");
  await page.locator(".atb-section-item", { hasText: "Hero" }).click();
  await page.getByLabel("Layout").selectOption("split");
  await page.locator(".atb-image-sources").getByRole("button", { name: "Illustration" }).click();
  await page.getByRole("button", { name: "Waves" }).click();
  await page.getByRole("button", { name: "Use this illustration" }).click();
  await expect(canvas(page).locator(".sec-hero img")).toHaveCount(1);
  await expect(page.locator(".atb-image-field .atb-tag")).toHaveText("Illustration");
});

test("AI image (mocked AI): honest unavailable notice, then a generated image is applied and tagged", async ({ page }) => {
  let available = false;
  await page.route("**/api/builder/image", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { ok: true, available, reason: available ? null : "AI image generation is temporarily unavailable (the image service's quota is used up)." } });
    const jpeg = await makeJpeg(page, 800, 600);
    return route.fulfill({ json: { ok: true, image: { dataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}`, mime: "image/jpeg", width: 800, height: 600, provider: "gemini", model: "mock", prompt: "a cafe" }, remaining: 3 } });
  });
  await openTemplate(page, "restaurant");
  await openHeroImage(page);
  await page.locator(".atb-image-sources").getByRole("button", { name: "AI image" }).click();
  await expect(page.getByText("Trust us, AI-generated images aren't exactly free magic!")).toBeVisible();
  await expect(page.getByText("Our AI image generator is currently unavailable.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /Contact Us/ })).toHaveAttribute("href", "/contact");
  await expect(page.getByRole("button", { name: "Generate image" })).toHaveCount(0); // no fake generation path
  await page.keyboard.press("Escape");

  available = true;
  await page.locator(".atb-image-sources").getByRole("button", { name: "AI image" }).click();
  await page.getByLabel("Describe the image").fill("A warm cafe interior with plants");
  await page.getByRole("button", { name: "Generate image" }).click();
  await page.getByRole("button", { name: "Use this image" }).click();
  await expect(canvas(page).locator(".sec-hero img")).toHaveCount(1);
  await expect(page.locator(".atb-image-field .atb-tag")).toHaveText("AI-generated");
});

test("AI generation (mocked AI): a failed attempt keeps the brief and isn't charged", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/builder/generate", (route) => {
    calls++;
    return calls === 1
      ? route.fulfill({ status: 429, json: { ok: false, code: "rate_limited", message: "All our AI services are busy at the moment.", remaining: 8, retryable: true } })
      : route.fulfill({ json: { ok: true, doc: templateDocJson("consultant"), remaining: 7 } });
  });
  await page.goto("/free-website-builder/app?start=ai");
  await page.getByLabel(/Business or website name/).fill("Clearpath");
  await page.getByLabel(/Describe your business/).fill("Business advice for small companies in Pune.");
  await page.getByRole("button", { name: "Generate my website" }).click();
  await expect(page.getByRole("alert")).toContainText("busy");
  await expect(page.getByText("Failed attempts don't use up your free AI requests")).toBeVisible();
  await page.getByRole("button", { name: "Change my answers" }).click();
  await expect(page.getByLabel(/Business or website name/)).toHaveValue("Clearpath"); // nothing to retype
  await page.getByRole("button", { name: "Generate my website" }).click();
  await expect(page.locator(".atb-editor")).toBeVisible({ timeout: 15_000 });
});
