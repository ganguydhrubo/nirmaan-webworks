import { test, expect, type Page } from "@playwright/test";

/**
 * Builder ↔ browser history (src/scripts/builder/nav.ts).
 * Every builder screen has its own URL; browser Back/Forward move between
 * screens; the in-app Back leaves to the previous site page or, with no
 * usable history, to the homepage — never in a loop.
 */

const APP = "/free-website-builder/app";
const path = (p: Page) => {
  const u = new URL(p.url());
  return u.pathname + u.search;
};
const startScreen = (p: Page) => p.getByRole("heading", { name: "How would you like to start?" });
const wizard = (p: Page) => p.getByRole("heading", { name: "Tell us about your website" });

test("home → builder → browser Back returns to the homepage", async ({ page }) => {
  await page.goto("/");
  await page.goto(APP);
  await expect(startScreen(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL((u) => u.pathname === "/");
});

test("Back/Forward move through builder screens and then leave to the site", async ({ page }) => {
  await page.goto("/");
  await page.goto("/free-website-builder");
  await page.goto(APP);
  await expect(startScreen(page)).toBeVisible();

  await page.getByRole("button", { name: /Generate with AI/ }).click();
  await expect(wizard(page)).toBeVisible();
  expect(path(page)).toBe(`${APP}?start=ai`);

  await page.goBack(); // browser Back: wizard → start
  await expect(startScreen(page)).toBeVisible();
  expect(path(page)).toBe(APP);

  await page.goForward(); // Forward: start → wizard
  await expect(wizard(page)).toBeVisible();

  await page.getByRole("button", { name: "Back", exact: true }).click(); // in-app Back = history back
  await expect(startScreen(page)).toBeVisible();
  expect(path(page)).toBe(APP);

  // template → editor (own entry), editor "Projects" → start
  await page.locator("[data-template]").first().click();
  await expect(page).toHaveURL(/\?project=p-/);
  await page.getByTitle("Back to your projects").click();
  await expect(startScreen(page)).toBeVisible();
  expect(path(page)).toBe(APP);

  // Forward re-opens the same project (state preserved in IndexedDB)
  await page.goForward();
  await expect(page).toHaveURL(/\?project=p-/);
  await expect(page.locator(".atb-toolbar")).toBeVisible();
  await page.goBack();
  await expect(startScreen(page)).toBeVisible();

  // leaving the builder: browser Back goes to the landing, then home — no loop
  await page.goBack();
  await expect(page).toHaveURL((u) => u.pathname === "/free-website-builder");
  await page.goBack();
  await expect(page).toHaveURL((u) => u.pathname === "/");
});

test("in-app Back on the start screen returns to the previous site page", async ({ page }) => {
  await page.goto("/pricing");
  await page.evaluate(() => (location.href = "/free-website-builder/app"));
  await expect(startScreen(page)).toBeVisible();
  await page.getByRole("button", { name: /Back to the previous page/ }).click();
  await expect(page).toHaveURL((u) => u.pathname === "/pricing");
});

test("new tab / direct open: in-app Back falls back to the homepage", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(APP);
  await expect(startScreen(page)).toBeVisible();
  await page.getByRole("button", { name: /Back to the previous page/ }).click();
  await expect(page).toHaveURL((u) => u.pathname === "/");
  await ctx.close();
});

test("direct refresh of the AI brief URL shows the brief; Back reaches home", async ({ page }) => {
  await page.goto(`${APP}?start=ai`);
  await expect(wizard(page)).toBeVisible();
  await page.reload();
  await expect(wizard(page)).toBeVisible();
  // no in-app history: Back replaces with the start screen, then leaves to the homepage
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(startScreen(page)).toBeVisible();
  expect(path(page)).toBe(APP);
  await page.getByRole("button", { name: /Back to the previous page/ }).click();
  await expect(page).toHaveURL((u) => u.pathname === "/");
});

test("'ATITTLE home' link goes to the homepage", async ({ page }) => {
  await page.goto(APP);
  await page.getByRole("link", { name: "ATITTLE home" }).click();
  await expect(page).toHaveURL((u) => u.pathname === "/");
});
