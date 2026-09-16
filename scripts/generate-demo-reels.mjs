import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs/promises';

const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4321';
const tempDir = 'reel-temp';
await fs.mkdir('public/videos/demos', { recursive: true });

const demoSlugs = [
  'shivalik-homes',
  'kayal-backwaters',
  'sanjeevani-clinic',
  'manthan-institute',
  'ivory-smiles',
  'anaar-awadhi-table',
  'sunehri-atelier',
  'aangan-form',
  'mogra-house',
  'meridian-advisory',
  'repwork-studio',
  'saanjh-stories',
  'sunday-objects',
  'torque-district',
  'clearline-labs'
];

console.log(`Starting video reel and thumbnail generation for ${demoSlugs.length} demos...`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  let count = 0;
  for (const slug of demoSlugs) {
    count++;
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(`public/images/demos/${slug}`, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 540, height: 340 },
      deviceScaleFactor: 1.5,
      recordVideo: {
        dir: tempDir,
        size: { width: 540, height: 340 }
      }
    });

    const page = await context.newPage();
    await page.goto(`${base}/demos/${slug}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({
      content: `
        astro-dev-toolbar, [data-demo-banner], header, nav.fixed { display: none !important; }
        body { overflow: hidden !important; }
        * { animation-duration: 0s !important; }
      `
    });
    await page.waitForTimeout(400);

    // High-res crisp cover snapshot (540x340)
    const screenshot = await page.screenshot();
    const thumbPath = `public/images/demos/${slug}/thumb.webp`;
    await sharp(screenshot)
      .resize(540, 340)
      .webp({ quality: 85 })
      .toFile(thumbPath);

    // Choreograph 3.2s snap-zoom motion
    // 1. Settle on hero
    await page.waitForTimeout(500);

    // 2. Snap-zoom into key hero highlight
    await page.evaluate(() => {
      document.body.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.style.transformOrigin = '50% 25%';
      document.body.style.transform = 'scale(1.22)';
    });
    await page.waitForTimeout(650);

    // 3. Snap down to products / featured showcase
    await page.evaluate(() => {
      document.body.style.transform = 'scale(1.15) translateY(-260px)';
    });
    await page.waitForTimeout(700);

    // 4. Snap zoom into interactive details / features
    await page.evaluate(() => {
      document.body.style.transform = 'scale(1.24) translateY(-460px)';
    });
    await page.waitForTimeout(700);

    // 5. Reset to hero
    await page.evaluate(() => {
      document.body.style.transform = 'none';
    });
    await page.waitForTimeout(400);

    const video = page.video();
    await page.close();
    await context.close();

    if (video) {
      const videoPath = await video.path();
      const dest = `public/videos/demos/${slug}.webm`;
      await fs.copyFile(videoPath, dest);
      const vstat = await fs.stat(dest);
      const tstat = await fs.stat(thumbPath);
      console.log(`[${count}/${demoSlugs.length}] ${slug} -> video: ${Math.round(vstat.size / 1024)} KB, thumb: ${Math.round(tstat.size / 1024)} KB`);
    }

    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
  console.log('All 15 demo video reels and thumbnails generated successfully!');
} finally {
  await browser.close();
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}
