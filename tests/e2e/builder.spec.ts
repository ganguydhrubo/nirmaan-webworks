import { test, expect, type Page, type FrameLocator, type Locator } from "@playwright/test";
import { readZip } from "../../src/lib/builder/zip";
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
  const first = page.frameLocator(".builder-hero-frame-0");
  await expect(first.locator("h1")).toBeVisible();
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
  await page.getByRole("button", { name: /Bold & energetic/ }).click();
  await expect.poll(async () => frame.locator("body").evaluate((b) => getComputedStyle(b).getPropertyValue("--accent").trim())).toBe("#d63d1f");

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
  await page.getByRole("button", { name: "Download" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Sample testimonials", { timeout: 2000 }).catch(() => undefined);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download website (.zip)" }).click()]);
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
