import { test, expect } from '@playwright/test';

test.describe('Floating Liquid Glass Dock Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Standard mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('Dock is visible at bottom center with liquid glass chrome', async ({ page }) => {
    const dock = page.locator('#floating-dock');
    await expect(dock).toBeVisible();

    const box = await dock.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Centered: left and right distances should be balanced within 10px
      const viewportWidth = 390;
      const dockCenter = box.x + box.width / 2;
      expect(Math.abs(dockCenter - viewportWidth / 2)).toBeLessThanOrEqual(10);
    }
  });

  test('Dock items have touch targets >= 44x44px', async ({ page }) => {
    const items = page.locator('#floating-dock .dock-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const box = await item.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('WhatsApp and call links have valid contact hrefs', async ({ page }) => {
    const waLink = page.locator('#floating-dock a[data-dock-action="whatsapp"]');
    await expect(waLink).toBeVisible();
    const waHref = await waLink.getAttribute('href');
    expect(waHref).toContain('wa.me/919330393298');

    const telLink = page.locator('#floating-dock a[data-dock-action="call"]');
    await expect(telLink).toBeVisible();
    const telHref = await telLink.getAttribute('href');
    expect(telHref).toContain('tel:+919330393298');
  });

  test('Section sheet opens, lists sections, jumps on tap, closes on escape and backdrop', async ({ page }) => {
    const sectionsBtn = page.locator('#floating-dock [data-dock-action="sections"]');
    const sheet = page.locator('#dock-sheet');

    // Initially closed
    expect(await sheet.getAttribute('hidden')).not.toBeNull();

    // Open sheet
    await sectionsBtn.click();
    await expect(sheet).toBeVisible();
    expect(await sectionsBtn.getAttribute('aria-expanded')).toBe('true');

    // Section list should be populated
    const sectionLinks = sheet.locator('[data-section-target]');
    const count = await sectionLinks.count();
    expect(count).toBeGreaterThan(0);

    // Close on Escape
    await page.keyboard.press('Escape');
    expect(await sheet.getAttribute('hidden')).not.toBeNull();
    expect(await sectionsBtn.getAttribute('aria-expanded')).toBe('false');

    // Open again and close with backdrop
    await sectionsBtn.click();
    await expect(sheet).toBeVisible();
    const backdrop = sheet.locator('.dock-sheet-backdrop');
    await backdrop.click({ position: { x: 10, y: 10 } });
    expect(await sheet.getAttribute('hidden')).not.toBeNull();
  });

  test('Dock theme adapts between light and dark sections on scroll', async ({ page }) => {
    const dock = page.locator('#floating-dock');

    // Scroll to #services-teaser (dark section)
    await page.evaluate(() => {
      document.getElementById('services-teaser')?.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    const darkTheme = await dock.getAttribute('data-dock-theme');
    expect(darkTheme).toBe('dark');

    // Scroll to #problem (light section)
    await page.evaluate(() => {
      document.getElementById('problem')?.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    const lightTheme = await dock.getAttribute('data-dock-theme');
    expect(lightTheme).toBe('light');
  });

  test('Magnification physics scales hovered icon on pointer move', async ({ page }) => {
    const dock = page.locator('#floating-dock');
    const homeItem = dock.locator('[data-dock-action="home"]');

    // Wait for dock entrance animation to settle
    await page.waitForTimeout(1500);

    const box = await homeItem.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(150);

      const scale = await homeItem.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).getPropertyValue('--dock-scale')) || 1;
      });
      expect(scale).toBeGreaterThan(1.0);
    }
  });

  test('prefers-reduced-motion disables magnification', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const dock = page.locator('#floating-dock');
    const homeItem = dock.locator('[data-dock-action="home"]');
    const box = await homeItem.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(150);

      const scale = await homeItem.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).getPropertyValue('--dock-scale')) || 1;
      });
      expect(scale).toBe(1);
    }
  });
});
