// Capture the real demos without changing their source or existing thumbnails.
// The old cards crop horizontal edges; the new desktop stage needs an uncropped
// image. Both viewport ratios match their output exactly, so no UI is trimmed.
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { siteConfig } from '../config/site.ts';

const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4322';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 520 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await fs.mkdir('public/images/showcase', { recursive: true });
  for (const format of ['mobile','desktop']) {
   await page.setViewportSize(format === 'mobile' ? {width:390,height:520} : {width:1280,height:960});
   for (const demo of siteConfig.demoRegistry) {
    const output = `public/images/showcase/${demo.slug}-${format}.webp`;
    try { await fs.access(output); continue; } catch { /* Only capture missing assets. */ }
    await page.goto(`${base}/demos/${demo.slug}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'astro-dev-toolbar,[data-demo-banner]{display:none!important}' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const visible = [...document.images].filter(img => {
        const box = img.getBoundingClientRect();
        return box.width && box.top < innerHeight && box.bottom > 0;
      });
      await Promise.race([Promise.all(visible.map(img => img.decode().catch(() => {}))), new Promise(resolve => setTimeout(resolve, 2500))]);
    });
    await sharp(await page.screenshot()).resize(format === 'mobile' ? 585 : 1152, format === 'mobile' ? 780 : 864).webp({ quality: 82 }).toFile(output);
    console.log(output);
  }
  }
} finally { await browser.close(); }
