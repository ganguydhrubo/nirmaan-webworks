import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { siteConfig } from '../../config/site';

const root = '[data-showcase]';
const active = `${root} .is-active`;

test('all 15 compositions, metadata, links and the wrap remain synchronized', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/demos');
  await expect(page.locator(root)).toHaveAttribute('data-enhanced','true');
  await page.locator('[data-play]').click();
  const initial = await page.locator('[data-stage]').boundingBox();
  for (let index = 0; index <= 15; index++) {
    const demo = siteConfig.demoRegistry[index % 15]!;
    const industry = siteConfig.industryRegistry.find(item => item.slug === demo.industrySlug)!;
    await expect(page.locator(active)).toHaveAttribute('data-name',demo.businessName);
    await expect(page.locator(root)).toHaveAttribute('data-state','paused');
    await expect(page.locator(`${active} h2`)).toHaveText(demo.businessName);
    await expect(page.locator(`${active} .showcase-category`)).toHaveText(industry.shortName);
    await expect(page.locator(`${active} .showcase-location`)).toHaveText(demo.city);
    await expect(page.locator(`${active} .showcase-description`)).toHaveText(demo.tagline);
    await expect(page.locator(`${active} a`)).toHaveAttribute('href',`/demos/${demo.slug}`);
    await expect(page.locator(`${active} img`)).toHaveJSProperty('naturalWidth',1152);
    await expect(page.locator('[data-position]')).toHaveText(String(index % 15 + 1).padStart(2,'0'));
    const next = siteConfig.demoRegistry[(index + 1) % 15]!;
    await expect(page.locator('[data-next-name]')).toHaveText(next.businessName);
    expect((await page.locator('[data-stage]').boundingBox())?.height).toBeCloseTo(initial?.height ?? 0, 1);
    await expect(page.locator(`${root} [data-scene]:not([inert])`)).toHaveCount(1);
    if (index < 15) await page.locator('[data-next]').click();
  }
  await page.locator('[data-prev]').click();
  await expect(page.locator(root)).toHaveAttribute('data-active','14');
  await page.locator('[data-next-card]').click();
  await expect(page.locator(root)).toHaveAttribute('data-active','0');
});

test('autoplay, hover, explicit pause, keyboard focus, and offscreen resume', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/demos');
  await expect(page.locator(root)).toHaveAttribute('data-running','true');
  await expect(page.locator(root)).toHaveAttribute('data-active','1',{timeout:7000});
  await page.locator('[data-stage]').hover();
  const pausedIndex = await page.locator(root).getAttribute('data-active');
  await page.waitForTimeout(5100);
  await expect(page.locator(root)).toHaveAttribute('data-active',pausedIndex!);
  await page.mouse.move(0,0);
  await expect(page.locator(root)).toHaveAttribute('data-running','true');
  await page.locator('[data-play]').click();
  await page.mouse.move(0,0);
  await expect(page.locator('[data-play]')).toHaveAccessibleName('Play automatic demos');
  await page.waitForTimeout(5100);
  await expect(page.locator(root)).toHaveAttribute('data-active',pausedIndex!);
  await page.locator('[data-next]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(root)).toHaveAttribute('data-active',String((Number(pausedIndex)+1)%15));
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator(root)).toHaveAttribute('data-active',pausedIndex!);
  await page.locator('[data-play]').click();
  await page.mouse.move(0,0);
  await page.locator('main h1').click();
  await expect(page.locator(root)).toHaveAttribute('data-running','true');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.locator(root)).toHaveAttribute('data-running','false');
  await page.waitForTimeout(5100);
  await page.locator('[data-stage]').scrollIntoViewIfNeeded();
  await expect(page.locator(root)).toHaveAttribute('data-running','true');
});

test('rapid input stays coherent, reduced motion stays paused, and keyboard focus survives', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/demos');
  await expect(page.locator('[data-play]')).toHaveAccessibleName('Play automatic demos');
  await page.locator('[data-picker]').selectOption('14');
  await expect(page.locator(root)).toHaveAttribute('data-active','14');
  await page.locator(`${active} a`).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(root)).toHaveAttribute('data-active','0');
  await expect(page.locator('[data-next]')).toBeFocused();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-next]').click({clickCount:9,delay:15});
  await expect(page.locator(root)).not.toHaveAttribute('data-state','transitioning',{timeout:5000});
  await expect(page.locator(`${root} .is-active`)).toHaveCount(1);
  await expect(page.locator(`${root} [data-scene]:not([inert])`)).toHaveCount(1);
  const name = await page.locator(active).getAttribute('data-name');
  await expect(page.locator(`${active} h2`)).toHaveText(name!);
});

test('first paint and all links work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator(`${active} img`)).toBeVisible();
  await page.locator('.demo-directory summary').click();
  for (const demo of siteConfig.demoRegistry) await expect(page.locator(`.demo-directory a[href="/demos/${demo.slug}"]`)).toBeVisible();
  await context.close();
});

test('slow and failed images preserve the current scene and usable navigation', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/kayal-backwaters-desktop.webp', async route => {
    await new Promise(resolve => setTimeout(resolve,1500));
    await route.continue();
  });
  await page.route('**/sanjeevani-clinic-desktop.webp', route => route.abort());
  await page.goto('/demos',{waitUntil:'domcontentloaded'});
  await expect(page.locator(root)).toHaveAttribute('data-enhanced','true');
  await page.locator('[data-next]').click();
  await expect(page.locator(`${active} img`)).toBeVisible();
  await expect(page.locator(root)).toHaveAttribute('data-active','1');
  await page.locator('[data-next]').click();
  await expect(page.locator('[data-announcement]')).toContainText('could not load');
  await expect(page.locator(root)).toHaveAttribute('data-active','1');
  await page.locator('[data-picker]').selectOption('3');
  await expect(page.locator(root)).toHaveAttribute('data-active','3');
});

test('phone swipes respect vertical scroll; rotation and all mobile previews work', async ({ browser }) => {
  test.setTimeout(60000);
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page = await context.newPage();
  await page.goto('/demos');
  await page.locator('[data-stage]').scrollIntoViewIfNeeded();
  const cdp = await context.newCDPSession(page);
  async function swipe(dx:number,dy:number) {
    const box = await page.locator(`${active} .showcase-window`).boundingBox();
    const x = box!.x + box!.width/2, y = Math.max(box!.y+80,100);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for (let i=1;i<=6;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await swipe(110,5);
  await expect(page.locator(root)).toHaveAttribute('data-active','1');
  await swipe(-110,5);
  await expect(page.locator(root)).toHaveAttribute('data-active','0');
  await swipe(10,-100);
  await expect(page.locator(root)).toHaveAttribute('data-active','0');
  for (let index=0;index<15;index++) {
    await page.locator('[data-picker]').selectOption(String(index));
    await expect(page.locator(root)).toHaveAttribute('data-active',String(index));
    await expect(page.locator(`${active} img`)).toHaveJSProperty('naturalWidth',585);
    expect(await page.locator(`${active} img`).evaluate((img:HTMLImageElement) => img.currentSrc)).toContain(`${siteConfig.demoRegistry[index]!.slug}-mobile.webp`);
  }
  await page.setViewportSize({width:844,height:390});
  await expect(page.locator(`${active} img`)).toHaveJSProperty('naturalWidth',1152);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('only adjacent previews load; the showcase has no accessibility violations', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const previews = new Set<string>();
  page.on('request', request => { if (/\/card\.jpg|\/showcase\//.test(request.url())) previews.add(request.url()); });
  await page.goto('/demos',{waitUntil:'networkidle'});
  expect(previews.size).toBeLessThanOrEqual(2);
  const results = await new AxeBuilder({page}).include(root).analyze();
  expect(results.violations).toEqual([]);
});
