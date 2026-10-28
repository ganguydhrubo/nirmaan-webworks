import fs from 'node:fs/promises';
import { chromium, expect as baseExpect } from '@playwright/test';
const expect = baseExpect.configure({ timeout: 20000 });

const base = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:8788';
const out = new URL('../docs/atittle-revamp/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const results = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const step = async (name, fn) => { await fn(); results.push(name); console.log(`PASS ${name}`); };
try {
  await step('All requested routes return HTTP 200', async () => {
    for (const path of ['/templates/', '/free-website-builder/app/', '/free-brand-studio/app/', '/api/media/search?q=business&category=business']) {
      const r = await context.request.get(base + path);
      expect(r.status(), path).toBe(200);
      if (path.startsWith('/api/')) { const data = await r.json(); expect(data.ok).toBe(true); expect(data.results.length).toBeGreaterThan(0); }
    }
  });
  await page.goto(`${base}/free-brand-studio/app/?view=editor`);
  await expect(page.locator('.studio-app')).toBeVisible();
  await step('Double-click canvas text, type multiline content and commit with Escape', async () => {
    await page.locator('.studio-rail').getByRole('button', { name: /Text/ }).click();
    await page.getByRole('button', { name: /Add a headline/ }).click();
    const text = page.locator('.studio-element[aria-label^="Edit text:"]').last();
    await text.dblclick();
    const editor = page.getByRole('textbox', { name: 'Edit canvas text' });
    await expect(editor).toBeFocused();
    await editor.fill('Founder canvas edit\nSecond line');
    await editor.press('Escape');
    await expect(editor).toHaveCount(0);
    await expect(text).toContainText('Founder canvas edit');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('atittle_brand_studio_projects_v1'))).toContain('Founder canvas edit');
    await page.getByTitle('Zoom In', { exact: true }).click();
    await text.dblclick();
    await editor.fill('Founder canvas edit\nSecond line');
    await page.locator('.studio-bottom-zoom').click();
    await expect(editor).toHaveCount(0);
  });
  await step('Changing a font loads its stylesheet and updates the stage', async () => {
    await page.locator('select').filter({ has: page.locator('option[value="Pacifico"]') }).selectOption('Pacifico');
    await expect(page.locator('#studio-font-Pacifico')).toHaveAttribute('href', /fonts.googleapis.com.*Pacifico/);
    await page.waitForFunction(() => [...document.fonts].some(font => font.family.replace(/["']/g, '') === 'Pacifico' && font.status === 'loaded'), null, { timeout: 30000 });
    const text = page.locator('.studio-element.selected > div').first();
    await expect(text).toHaveCSS('font-family', /Pacifico/);
  });
  await page.screenshot({ path: new URL('preview-studio.png', out).pathname.replace(/^\/(.:\/)/, '$1'), fullPage: true });
  await step('Layer visibility and lock controls affect the selected text', async () => {
    await page.locator('.studio-rail').getByRole('button', { name: /Layers/ }).click();
    const drawer = page.locator('.studio-drawer');
    await drawer.getByTitle('Hide layer').first().click();
    await expect(page.locator('.studio-element[aria-label*="Founder canvas edit"]')).toHaveCount(0);
    await drawer.getByTitle('Show layer').first().click();
    await drawer.getByTitle('Lock layer').first().click();
    await page.locator('.studio-element[aria-label*="Founder canvas edit"]').dblclick();
    await expect(page.getByRole('textbox', { name: 'Edit canvas text' })).toHaveCount(0);
    await drawer.getByTitle('Unlock layer').first().click();
  });
  await step('Brand Studio stock search inserts a real photo', async () => {
    await page.locator('.studio-rail').getByRole('button', { name: /Photos/ }).click();
    const stock = page.getByTitle(/^Insert /).first();
    await expect(stock).toBeVisible();
    const before = await page.locator('.studio-element img').count();
    await stock.click();
    await expect(page.locator('.studio-element img')).toHaveCount(before + 1);
  });
  await page.goto(`${base}/free-website-builder/app/?template=saas-telemetry`);
  await expect(page.locator('.atb-editor')).toBeVisible();
  const projectUrl = page.url();
  const sections = page.locator('.atb-section-item');
  await step('Section duplication, movement and undo persist correctly', async () => {
    const before = await sections.count();
    await sections.nth(2).click();
    await page.getByRole('button', { name: 'Duplicate section', exact: true }).click();
    await expect(sections).toHaveCount(before + 1);
    await page.getByRole('button', { name: 'Move section down', exact: true }).click();
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
    await expect(sections).toHaveCount(before);
  });
  await step('Builder stock picker applies the selected photo', async () => {
    await sections.nth(1).click();
    await page.getByRole('button', { name: 'Stock Media', exact: true }).click();
    await page.getByPlaceholder(/Search millions/).fill('business');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('button', { name: 'Use Photo', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Choose an image' })).toHaveCount(0);
    await expect.poll(async () => page.frameLocator('.atb-canvas iframe').locator('.hero-media img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  });
  await page.screenshot({ path: new URL('preview-builder.png', out).pathname.replace(/^\/(.:\/)/, '$1'), fullPage: true });
  await step('Logo handoff roundtrip survives save, navigation and reload', async () => {
    await sections.first().click();
    await page.getByRole('button', { name: 'Create or Edit Logo', exact: true }).click();
    await expect(page).toHaveURL(/returnTo=builder/);
    await expect(page.locator('.studio-app')).toBeVisible();
    await page.getByTitle('Clear Canvas').click();
    await page.locator('.studio-rail').getByRole('button', { name: /Text/ }).click();
    await page.getByRole('button', { name: /Add a headline/ }).click();
    await page.locator('.studio-element[aria-label^="Edit text:"]').dblclick();
    const editor = page.getByRole('textbox', { name: 'Edit canvas text' });
    await editor.fill('ATITTLE');
    await editor.press('Escape');
    await page.getByRole('button', { name: /Use in My Website/ }).click();
    await expect(page).toHaveURL(projectUrl);
    await expect(page.locator('.atb-editor')).toBeVisible();
    const frame = page.frameLocator('.atb-canvas iframe');
    await expect(frame.locator('img.brand-logo')).toHaveAttribute('src', /^data:image\/png/);
    await page.reload();
    await expect(page.frameLocator('.atb-canvas iframe').locator('img.brand-logo')).toHaveAttribute('src', /^data:image\/png/);
  });
  await step('Marketplace filters templates and opens responsive preview', async () => {
    await page.goto(`${base}/templates/`);
    await page.locator('#template-search').fill('Apex Telemetry');
    await expect(page.locator('.template-card:visible')).toHaveCount(1);
    await page.locator('.template-card:visible .btn-preview').last().click();
    await expect(page.locator('#preview-modal')).toBeVisible();
    await page.screenshot({ path: new URL('preview-marketplace.png', out).pathname.replace(/^\/(.:\/)/, '$1'), fullPage: false });
  });
  expect(errors).toEqual([]);
} catch (error) {
  console.error(error);
  await page.screenshot({ path: new URL('preview-failure.png', out).pathname.replace(/^\/(.:\/)/, '$1'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await fs.writeFile(new URL('browser-verification.json', out), JSON.stringify({ checkedAt: new Date().toISOString(), passed: results, pageErrors: errors, success: !process.exitCode }, null, 2));
  await browser.close();
}
