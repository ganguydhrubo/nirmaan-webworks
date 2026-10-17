import { test, expect, type Page } from "@playwright/test";

/**
 * "Download Website" + "Publish Live Free" UI, with /api/builder/publish
 * MOCKED (no real Cloudflare deploy happens in this spec — see
 * PUBLISHING_IMPLEMENTATION_REPORT.txt for the separately run real deploy).
 */

const LIVE = "https://atittle-sites.example.workers.dev/small-business-abc123/";

async function openEditor(page: Page) {
  await page.goto("/free-website-builder/app?template=small-business");
  await expect(page.locator(".atb-toolbar")).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("publish: progress states, confirmed live link, actions, persisted across reopen", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  let checks = 0;
  let posted: Record<string, unknown> | null = null;
  await page.route("**/api/builder/publish**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      posted = req.postDataJSON();
      await new Promise((r) => setTimeout(r, 300));
      return route.fulfill({
        json: { ok: true, state: "verifying", slug: "small-business-abc123", url: LIVE, version: "a".repeat(24), publishedAt: Date.now(), bytes: 12345, files: 4, manageToken: "t".repeat(43) },
      });
    }
    checks++;
    // Not live on the first check: the UI must keep "verifying", not claim success.
    return route.fulfill({ json: { ok: true, live: checks >= 2, url: LIVE } });
  });

  await openEditor(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /Download Website/ })).toBeVisible();
  await expect(dialog.getByText("Put your website online instantly with a free ATITTLE link you can share. No hosting or setup needed.")).toBeVisible();
  await dialog.locator("[data-action=publish-live]").click();

  await expect(dialog.getByText("Confirming it's live")).toBeVisible();
  await expect(dialog.getByText("Published — your website is live")).toBeVisible({ timeout: 15_000 });
  expect(checks).toBeGreaterThanOrEqual(2);
  expect(posted!.doc).toBeTruthy();
  expect(posted!.slug).toBeUndefined(); // first publish: server allocates the address

  await expect(dialog.locator("[data-live-url]")).toHaveAttribute("href", LIVE);
  await expect(dialog.getByRole("link", { name: "Open Website" })).toHaveAttribute("href", LIVE);
  await dialog.getByRole("button", { name: "Copy Link" }).click();
  await expect(dialog.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(LIVE);
  await expect(dialog.getByRole("button", { name: "Download Website" }).last()).toBeVisible();

  // Reopen: the project remembers where it is published; Publish Again updates the same address.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("dialog").getByText("Published — your website is live")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Publish Again" }).click();
  await expect(page.getByRole("dialog").getByText("Published — your website is live")).toBeVisible({ timeout: 15_000 });
  expect(posted!.slug).toBe("small-business-abc123");
  expect(posted!.manageToken).toBe("t".repeat(43));
});

test("publish failure: honest error, retry and download fallback; no fake link", async ({ page }) => {
  await page.route("**/api/builder/publish**", (route) =>
    route.fulfill({ status: 503, json: { ok: false, code: "capacity", message: "Free publishing has reached today's limit. Please try again tomorrow, or download your website and host it yourself.", retryable: false } }),
  );
  await openEditor(page);
  const dialog = page.getByRole("dialog");
  await dialog.locator("[data-action=publish-live]").click();
  await expect(dialog.getByRole("alert")).toContainText("Publishing failed.");
  await expect(dialog.getByRole("alert")).toContainText("today's limit");
  await expect(dialog.locator("[data-live-url]")).toHaveCount(0);
  const [download] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Download instead" }).click()]);
  expect(download.suggestedFilename()).toMatch(/website\.zip$/);
});

test("download works from the same dialog", async ({ page }) => {
  await openEditor(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("[data-action=download-website]").click()]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  await expect(page.getByRole("dialog").getByText(/Downloaded\./)).toBeVisible();
});
