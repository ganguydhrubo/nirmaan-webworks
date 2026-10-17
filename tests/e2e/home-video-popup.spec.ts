import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Homepage "How to build a free website" video popup (HomeVideoPopup.astro).
 * The popup skips auto-open for automated browsers; these tests present as a
 * normal browser (navigator.webdriver = false) to exercise the real behaviour.
 */

const VIDEO = "/videos/atittle-builder-ad-hi.mp4";

async function asVisitor(ctx: BrowserContext) {
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
}
const dialog = (p: Page) => p.locator("dialog[data-home-video]");

async function expectFits(page: Page, vp: { width: number; height: number }) {
  const panel = (await dialog(page).locator(".hvp-panel").boundingBox())!;
  const frame = (await dialog(page).locator(".hvp-frame").boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.y).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(panel.y + panel.height).toBeLessThanOrEqual(vp.height + 0.5);
  expect(Math.abs(frame.width / frame.height - 16 / 9)).toBeLessThan(0.02); // 16:9, not clipped
  expect(Math.abs(panel.x + panel.width / 2 - vp.width / 2)).toBeLessThan(2); // centred
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const close = (await dialog(page).getByRole("button", { name: "Close video" }).boundingBox())!;
  expect(close.width).toBeGreaterThanOrEqual(44);
  return { panel, frame };
}

for (const vp of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test(`opens automatically and fits at ${vp.width}x${vp.height}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 1024, isMobile: vp.width < 768 });
    await asVisitor(ctx);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Resource 404s elsewhere on the page are reported separately below; only script errors count here.
    page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(m.text()));
    const popupAssets: string[] = [];
    page.on("response", (r) => /atittle-builder-ad-hi/.test(r.url()) && r.status() >= 400 && popupAssets.push(`${r.status()} ${r.url()}`));
    await page.goto("/");
    await expect(dialog(page)).toBeVisible({ timeout: 8000 });
    await expect(dialog(page).getByRole("heading", { name: "How to build a free website" })).toBeVisible();
    await page.waitForTimeout(400); // entrance animation
    const { frame } = await expectFits(page, vp);
    if (vp.width >= 1024) {
      expect(frame.width).toBeGreaterThan(vp.width * 0.45); // prominent landscape video
      expect((await dialog(page).locator(".hvp-panel").boundingBox())!.y).toBeLessThan(vp.height * 0.15); // near the top
    }
    await page.screenshot({ path: `test-results/home-video-${vp.width}.png` });
    expect(errors).toEqual([]);
    expect(popupAssets).toEqual([]); // poster + video load
    expect(await dialog(page).locator("video").evaluate((v: HTMLVideoElement) => v.error)).toBeNull();
    await ctx.close();
  });
}

test("plays the existing video; Escape closes; not reopened in the same session; deep link reopens", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await asVisitor(ctx);
  const page = await ctx.newPage();
  const videoRequests: number[] = [];
  page.on("response", (r) => r.url().includes(VIDEO) && videoRequests.push(r.status()));
  await page.goto("/");
  await expect(dialog(page)).toBeVisible({ timeout: 8000 });

  // The source is the existing file, and it really plays (muted autoplay or after Play).
  const video = dialog(page).locator("video");
  await expect(video).toHaveAttribute("src", VIDEO);
  const playBtn = dialog(page).locator("[data-hvp-play]");
  if (await playBtn.isVisible()) await playBtn.click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.5);
  expect(await video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(1920);
  expect(videoRequests.some((s) => s === 200 || s === 206)).toBe(true);
  await expect(video).toHaveJSProperty("controls", true);

  // Background scroll is locked while open
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  // Same session: reload and navigate back home — stays closed
  await page.reload();
  await page.waitForTimeout(3500);
  await expect(dialog(page)).toBeHidden();
  await page.goto("/pricing");
  await page.goto("/");
  await page.waitForTimeout(3500);
  await expect(dialog(page)).toBeHidden();

  // Shareable deep link opens it on demand
  await page.goto("/#how-to-video");
  await expect(dialog(page)).toBeVisible();
  await ctx.close();
});

test("close button and backdrop click close it; focus is inside while open", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await asVisitor(ctx);
  const page = await ctx.newPage();
  await page.goto("/#how-to-video");
  await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog[data-home-video]"))).toBe(true);
  await dialog(page).getByRole("button", { name: "Close video" }).tap();
  await expect(dialog(page)).toBeHidden();

  await page.goto("/#how-to-video");
  await expect(dialog(page)).toBeVisible();
  await page.mouse.click(5, 830); // outside the panel = backdrop
  await expect(dialog(page)).toBeHidden();
  await ctx.close();
});

test("only on the homepage", async ({ browser }) => {
  const ctx = await browser.newContext();
  await asVisitor(ctx);
  const page = await ctx.newPage();
  for (const path of ["/pricing", "/free-website-builder", "/contact"]) {
    await page.goto(path);
    await expect(page.locator("dialog[data-home-video]")).toHaveCount(0);
  }
  await ctx.close();
});

test("automated browsers are not interrupted (existing suites keep working)", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(3500);
  await expect(dialog(page)).toBeHidden();
});
