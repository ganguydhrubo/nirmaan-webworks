import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'iPhone SE (320x568)', width: 320, height: 568 },
  { name: 'Android Mid (360x800)', width: 360, height: 800 },
  { name: 'iPhone SE 2/3 (375x667)', width: 375, height: 667 },
  { name: 'iPhone 13/14 (390x844)', width: 390, height: 844 },
  { name: 'iPhone 15/16 Pro (393x852)', width: 393, height: 852 },
  { name: 'Pixel / Galaxy (412x915)', width: 412, height: 915 },
  { name: 'iPhone Plus/Max (430x932)', width: 430, height: 932 },
  { name: 'Mobile Landscape (667x375)', width: 667, height: 375 },
  { name: 'iPad Portrait (768x1024)', width: 768, height: 1024 },
  { name: 'iPad Landscape (1024x768)', width: 1024, height: 768 },
  { name: 'Small Laptop (1280x800)', width: 1280, height: 800 },
  { name: 'MacBook Air (1440x900)', width: 1440, height: 900 },
  { name: 'Full HD Desktop (1920x1080)', width: 1920, height: 1080 },
  { name: 'Ultra-wide 2K (2560x1440)', width: 2560, height: 1440 },
];

const routes = [
  '/',
  '/services',
  '/industries',
  '/work-process',
  '/pricing',
  '/about',
  '/contact',
  '/demos/kayal-backwaters',
  '/demos/sanjeevani-clinic',
  '/demos/shivalik-homes',
];

test.describe('Multi-Viewport Responsive Overflow Suite', () => {
  for (const vp of viewports) {
    test.describe(`Viewport: ${vp.name}`, () => {
      for (const route of routes) {
        test(`Route ${route} has zero horizontal overflow`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);

          // Evaluate exact overflow status
          const overflowInfo = await page.evaluate(() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            const diff = docWidth - winWidth;

            // Find elements overflowing the document bounds
            const offenders: string[] = [];
            document.querySelectorAll('*').forEach((el) => {
              if (el === document.body || el === document.documentElement) return;
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                // Check if element extends right or left beyond bounds
                if (r.right > winWidth + 1.5) {
                  const style = window.getComputedStyle(el);
                  if (style.position !== 'fixed' && style.overflow !== 'hidden' && style.display !== 'none') {
                    offenders.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 40)} (right: ${Math.round(r.right)}px)`);
                  }
                }
              }
            });

            return {
              diff,
              docWidth,
              winWidth,
              hasOverflow: diff > 1.5,
              offenderCount: offenders.length,
              sampleOffenders: offenders.slice(0, 5),
            };
          });

          expect(
            overflowInfo.hasOverflow,
            `Expected ${route} at ${vp.width}x${vp.height} to have no overflow, but scrollWidth (${overflowInfo.docWidth}px) > innerWidth (${overflowInfo.winWidth}px) by ${overflowInfo.diff}px! Offenders: ${overflowInfo.sampleOffenders.join(', ')}`
          ).toBe(false);
        });
      }
    });
  }
});
