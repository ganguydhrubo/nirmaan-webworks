import { test, expect, type Page } from "@playwright/test";

/**
 * FloatingGrowthActions — the two site-wide CTA bubbles (BaseLayout).
 * Checks real rendered pages at the five required viewports: exact URLs,
 * presence per route, no overlap with each other / the Dock / WhatsApp /
 * header, no horizontal overflow, no clipped text, keyboard + touch use,
 * reduced motion, and tucking while a form field has focus on mobile.
 */

const BUILD_URL = "https://atittle.com/free-website-builder/app?start=ai";
const AUDIT_URL = "https://atittle.com/tools/website-evaluator";
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
const ROUTES = ["/", "/pricing", "/contact", "/industries", "/faq"];

/** Stub only the two CTA destinations, so navigation can be asserted without leaving the test. */
async function stubDestinations(p: Page) {
  for (const url of [BUILD_URL, AUDIT_URL]) await p.route(url, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>ok</title>" }));
}

const build = (p: Page) => p.locator("[data-fga] a.fga-build");
const audit = (p: Page) => p.locator("[data-fga] a.fga-audit");

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

async function visibleBox(p: Page, selector: string): Promise<Box | null> {
  const el = p.locator(selector).first();
  if (!(await el.count()) || !(await el.isVisible())) return null;
  return el.boundingBox();
}

for (const vp of VIEWPORTS) {
  test(`bubbles render cleanly at ${vp.width}x${vp.height}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 1024 });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "load" });
      await expect(build(page)).toHaveAttribute("href", BUILD_URL);
      await expect(audit(page)).toHaveAttribute("href", AUDIT_URL);
      await expect(page.locator("[data-fga]")).toHaveCount(1); // no duplicate instances
      // Tucked (hidden while a form is on screen, small screens) → nothing visible to collide.
      if (await page.locator("[data-fga].is-tucked").count()) continue;
      const b = (await build(page).boundingBox())!;
      const a = (await audit(page).boundingBox())!;
      // inside the viewport, not overlapping each other
      for (const box of [a, b]) {
        expect(box.x, route).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, route).toBeLessThanOrEqual(vp.width);
        expect(box.y + box.height, route).toBeLessThanOrEqual(vp.height);
        expect(box.height, route).toBeGreaterThanOrEqual(44); // touch target
      }
      expect(overlaps(a, b), `${route}: bubbles overlap`).toBe(false);
      // existing floating widgets
      for (const sel of [".dock-container", "a[aria-label*='WhatsApp'].fixed", "#site-header-bar"]) {
        const other = await visibleBox(page, sel);
        if (other) {
          expect(overlaps(a, other), `${route}: audit overlaps ${sel}`).toBe(false);
          expect(overlaps(b, other), `${route}: build overlaps ${sel}`).toBe(false);
        }
      }
      // labels not clipped, no horizontal page scroll
      const clipped = await page.locator("[data-fga] .fga-label > span").evaluateAll((els) =>
        els.filter((e) => (e as HTMLElement).offsetParent && (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1).length,
      );
      expect(clipped, route).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), route).toBe(true);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test("bubbles are hidden on the page they link to", async ({ page }) => {
  await page.goto("/tools/website-evaluator");
  await expect(build(page)).toHaveCount(1);
  await expect(audit(page)).toHaveCount(0);
  await page.goto("/free-website-builder");
  await expect(build(page)).toHaveCount(0);
  await expect(audit(page)).toHaveCount(1);
});

test("keyboard: both actions are reachable, focus is visible, Enter navigates", async ({ page }) => {
  await page.goto("/pricing");
  await build(page).focus();
  await expect(build(page)).toBeFocused();
  const outline = await build(page).locator(".fga-float").evaluate((e) => getComputedStyle(e).outlineStyle + " " + getComputedStyle(e).outlineWidth);
  expect(outline).toContain("solid");
  await page.keyboard.press("Tab");
  await expect(audit(page)).toBeFocused();
  // navigation itself (to the production URL) is a plain anchor; intercept it to assert the target
  await stubDestinations(page);
  await Promise.all([page.waitForURL(AUDIT_URL), page.keyboard.press("Enter")]);
});

test("mouse click opens the builder URL", async ({ page }) => {
  await stubDestinations(page);
  await page.goto("/faq");
  // Real pointer input at the bubble's current position (Playwright's element
  // click waits for the gently floating element to be "stable", which it never is;
  // a person just clicks it).
  const b = (await build(page).boundingBox())!;
  await Promise.all([page.waitForURL(BUILD_URL), page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)]);
});

test("touch tap opens the audit URL on mobile", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await stubDestinations(page);
  await page.goto("/");
  const a = (await audit(page).boundingBox())!;
  await Promise.all([page.waitForURL(AUDIT_URL), page.touchscreen.tap(a.x + a.width / 2, a.y + a.height / 2)]);
  await ctx.close();
});

test("reduced motion stops the ambient animation; normal motion runs it", async ({ browser }) => {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    const ctx = await browser.newContext({ reducedMotion });
    const page = await ctx.newPage();
    await page.goto("/");
    const names = await page.locator("[data-fga] .fga-build, [data-fga] .fga-scan").evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));
    if (reducedMotion === "reduce") expect(names.every((n) => n === "none")).toBe(true);
    else expect(names.some((n) => n !== "none")).toBe(true);
    await ctx.close();
  }
});

test("mobile: bubbles never cover a form — tucked while a form is on screen", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/contact");
  const form = page.locator("form").first();
  await form.scrollIntoViewIfNeeded();
  await expect(page.locator("[data-fga]")).toHaveClass(/is-tucked/);
  await expect(build(page)).toBeHidden();
  // the submit button is reachable and not covered
  const submit = form.locator("button[type=submit]").first();
  await submit.scrollIntoViewIfNeeded();
  const box = (await submit.boundingBox())!;
  const topEl = await page.evaluate(({ x, y }) => (document.elementFromPoint(x, y)?.closest("[data-fga]") ? "bubble" : "ok"), { x: box.x + box.width - 10, y: box.y + box.height / 2 });
  expect(topEl).toBe("ok");
  // back at the top of the page (form out of view) the bubbles return
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const formVisible = await form.evaluate((f) => f.getBoundingClientRect().top < window.innerHeight);
  if (!formVisible) await expect(page.locator("[data-fga]")).not.toHaveClass(/is-tucked/);
  await ctx.close();
});

test("desktop: forms do not tuck the bubbles", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/contact");
  await page.locator("form").first().scrollIntoViewIfNeeded();
  await expect(page.locator("[data-fga]")).not.toHaveClass(/is-tucked/);
});
