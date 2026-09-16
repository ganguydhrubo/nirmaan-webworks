import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Mobile First-View "2-Second Hook"', () => {
  const viewports = [
    { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
    { name: 'Android Mid (360x800)', width: 360, height: 800 },
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    test(`First-paint visibility and dock clearance at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Check first frame computed styles for H1, subcopy, and CTAs
      const checkFirstFrame = await page.evaluate(() => {
        return new Promise<{ h1Opacity: string; descOpacity: string; actionsOpacity: string }>((resolve) => {
          requestAnimationFrame(() => {
            const h1 = document.querySelector('h1');
            const desc = document.querySelector('.hero-description');
            const actions = document.querySelector('.hero-actions');
            resolve({
              h1Opacity: h1 ? window.getComputedStyle(h1).opacity : '0',
              descOpacity: desc ? window.getComputedStyle(desc).opacity : '0',
              actionsOpacity: actions ? window.getComputedStyle(actions).opacity : '0',
            });
          });
        });
      });

      expect(checkFirstFrame.h1Opacity).toBe('1');
      expect(checkFirstFrame.descOpacity).toBe('1');
      expect(checkFirstFrame.actionsOpacity).toBe('1');

      // Dock clearance check: No hero first-view element intersects dock
      const dock = page.locator('#floating-dock');
      await expect(dock).toBeVisible();
      const dockBox = await dock.boundingBox();
      expect(dockBox).not.toBeNull();

      const heroElements = page.locator('.hero-eyebrow, h1, #enquiry-stack-wrapper, .hero-actions, .hero-response');
      const count = await heroElements.count();
      for (let i = 0; i < count; i++) {
        const elBox = await heroElements.nth(i).boundingBox();
        if (elBox && dockBox) {
          // Bounding box must be completely above dock
          expect(elBox.y + elBox.height).toBeLessThan(dockBox.y);
        }
      }
    });
  }

  test('LCP entry element is strictly the H1 headline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const lcpTag = await page.evaluate(() => {
      return new Promise<string | null>((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const last = entries[entries.length - 1] as any;
          resolve(last && last.element ? last.element.tagName : null);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    // LCP element must be H1
    expect(lcpTag).toBe('H1');
  });

  test('Frame strip captures at 0, 300, 700, 1100, 1500, 2100, and 3500ms', async ({ page }) => {
    const outDir = path.resolve(process.cwd(), 'test-results', 'hero-hook');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const captureTimes = [0, 300, 700, 1100, 1500, 2100, 3500];
    let previousTime = 0;

    for (const time of captureTimes) {
      const wait = time - previousTime;
      if (wait > 0) {
        await page.waitForTimeout(wait);
      }
      previousTime = time;
      await page.screenshot({ path: path.join(outDir, `frame-${time}ms.png`) });
    }

    // Verify frames exist
    for (const time of captureTimes) {
      expect(fs.existsSync(path.join(outDir, `frame-${time}ms.png`))).toBe(true);
    }
  });

  test('prefers-reduced-motion renders final state immediately with no running hero animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const state = await page.evaluate(() => {
      const card = document.getElementById('enquiry-card-btn');
      const isHook = document.documentElement.classList.contains('hook');
      const cardAnim = card ? window.getComputedStyle(card).animationName : 'none';

      return {
        isHook,
        cardAnim,
        cardOpacity: card ? window.getComputedStyle(card).opacity : '0',
      };
    });

    expect(state.isHook).toBe(false);
    expect(state.cardAnim).toBe('none');
    expect(state.cardOpacity).toBe('1');
  });

  test('Second load in the same session does not replay the choreography', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // First load
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);

    // Verify sessionStorage has key
    const hasKey = await page.evaluate(() => sessionStorage.getItem('atittle-hook-played'));
    expect(hasKey).toBe('1');

    // Second load in same session
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const isHookOnSecondLoad = await page.evaluate(() => document.documentElement.classList.contains('hook'));
    expect(isHookOnSecondLoad).toBe(false);
  });

  test('Tapping enquiry card expands chat panel, shows reply, and Esc collapses', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const card = page.locator('#enquiry-card-btn');
    await expect(card).toBeVisible();

    // Initial state
    expect(await card.getAttribute('aria-expanded')).toBe('false');
    const panel = page.locator('#enquiry-chat-panel');
    expect(await panel.getAttribute('hidden')).not.toBeNull();

    // Tap card to expand
    await card.click();
    expect(await card.getAttribute('aria-expanded')).toBe('true');
    await expect(panel).toBeVisible();

    // Reply bubble appears within 1200ms
    const replyBubble = page.locator('#panel-reply-bubble');
    await expect(replyBubble).toBeVisible({ timeout: 1200 });

    // Open demo link matches current route
    const openDemoBtn = page.locator('#panel-open-demo-btn');
    const href = await openDemoBtn.getAttribute('href');
    expect(href).toMatch(/^\/demos\/[a-z0-9-]+$/);

    // Press Escape to collapse
    await page.keyboard.press('Escape');
    expect(await card.getAttribute('aria-expanded')).toBe('false');
    expect(await panel.getAttribute('hidden')).not.toBeNull();

    // Focus returned to card
    const isFocused = await card.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('Swiping left on collapsed card shows the next business demo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const activeBiz = page.locator('#card-active-business');
    const firstBizText = (await activeBiz.textContent())?.trim();

    const card = page.locator('#enquiry-card-btn');
    const box = await card.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Simulate swipe left using mouse drag (supported across desktop and mobile)
      const startX = box.x + box.width * 0.8;
      const endX = box.x + box.width * 0.2;
      const centerY = box.y + box.height / 2;

      await page.mouse.move(startX, centerY);
      await page.mouse.down();
      await page.mouse.move(endX, centerY, { steps: 5 });
      await page.mouse.up();

      await page.waitForTimeout(300);
      const secondBizText = (await activeBiz.textContent())?.trim();
      expect(secondBizText).not.toBe(firstBizText);
    }
  });

  test('Stubbed PerformanceObserver keeps speed chip cleanly unrendered', async ({ page }) => {
    await page.addInitScript(() => {
      // Stub out PerformanceObserver
      // @ts-ignore
      delete window.PerformanceObserver;
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const speedContainer = page.locator('#speed-chip-container');
    const isHidden = await speedContainer.evaluate((el) => el.classList.contains('hidden'));
    expect(isHidden).toBe(true);
  });
});
