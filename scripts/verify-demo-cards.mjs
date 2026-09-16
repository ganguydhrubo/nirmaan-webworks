import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4321';
await fs.mkdir('playwright-report/cards', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/demos`, { waitUntil: 'networkidle' });

  // Open details and verify 15 cards exist
  await page.locator('.demo-directory summary').click();
  const cards = page.locator('[data-demo-card]');
  const count = await cards.count();
  console.log(`Found ${count} demo cards in directory.`);
  assert.equal(count, 15, 'Should have exactly 15 demo cards.');

  // Verify all 15 images loaded
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    const img = card.locator('.demo-thumb');
    await img.evaluate(el => el.complete || new Promise(r => { el.onload = r; el.onerror = r; }));
    const naturalWidth = await img.evaluate(el => el.naturalWidth);
    assert.ok(naturalWidth > 0, `Card ${i} image naturalWidth should be > 0, got ${naturalWidth}`);
  }
  console.log('All 15 thumbnail images loaded cleanly.');

  // Test hover interaction on first card
  const firstCard = cards.first();
  await firstCard.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'playwright-report/cards/grid-desktop.png' });

  await firstCard.hover();
  await page.waitForTimeout(400);
  const isPlaying = await firstCard.evaluate(el => el.classList.contains('is-playing'));
  console.log(`Hover active state: ${isPlaying}`);
  await page.screenshot({ path: 'playwright-report/cards/hover-active.png' });

  // Move mouse away
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const isStillPlaying = await firstCard.evaluate(el => el.classList.contains('is-playing'));
  console.log(`Leave state (is-playing removed): ${!isStillPlaying}`);
  assert.equal(isStillPlaying, false, 'Card should remove is-playing on mouse leave.');

  // Axe accessibility audit
  const axe = await new AxeBuilder({ page }).analyze();
  console.log(`Axe violations: ${axe.violations.length}`);
  assert.equal(axe.violations.length, 0, 'Should have 0 accessibility violations.');

  // Mobile layout check (390px)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/demos`, { waitUntil: 'networkidle' });
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(`Mobile horizontal overflow: ${hasOverflow}`);
  assert.equal(hasOverflow, false, 'Mobile viewport should have no horizontal overflow.');
  await page.screenshot({ path: 'playwright-report/cards/grid-mobile.png' });

  console.log('All demo card tests passed with flying colors!');
} finally {
  await browser.close();
}
