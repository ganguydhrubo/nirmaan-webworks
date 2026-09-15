// A real headed Chrome window is needed: headless Chrome keeps every tab visible.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({channel:'chrome',headless:false,args:['--window-position=-2400,-2400']});
await fs.mkdir('playwright-report/showcase',{recursive:true});
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  await page.goto(`${base}/demos`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-showcase]').dataset.running==='true');
  const index = await page.locator('[data-showcase]').getAttribute('data-active');
  const other = await context.newPage();
  await other.goto('about:blank');
  await other.bringToFront();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(5500);
  assert.equal(await page.locator('[data-showcase]').getAttribute('data-active'),index);
  assert.equal(await page.locator('[data-showcase]').getAttribute('data-running'),'false');
  await page.bringToFront();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(()=>document.querySelector('[data-showcase]').dataset.running==='true');
  console.log('Real background tab pauses; foreground resumes.');
  await page.locator('[data-play]').click();
  await page.locator('[data-picker]').selectOption('14');
  await page.waitForFunction(()=>document.querySelector('[data-showcase]').dataset.active==='14' && document.querySelector('[data-showcase]').dataset.state==='paused');
  await page.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'playwright-report/showcase/loop-before.png'});
  await page.locator('[data-next]').click();
  await page.waitForTimeout(240);
  await page.screenshot({path:'playwright-report/showcase/loop-during.png'});
  await page.waitForTimeout(600);
  await page.screenshot({path:'playwright-report/showcase/loop-after.png'});
  assert.equal(await page.locator('[data-showcase]').getAttribute('data-active'),'0');
  await page.locator('[data-picker]').selectOption('6');
  await page.waitForFunction(()=>document.querySelector('[data-showcase]').dataset.active==='6' && document.querySelector('[data-showcase]').dataset.state==='paused');
  await page.locator('.is-active .showcase-open').click();
  assert.match(page.url(),/\/demos\/sunehri-atelier\/?$/);
  await page.goBack();
  await page.waitForSelector('[data-showcase]');
  const returned = await page.locator('[data-showcase]').getAttribute('data-active');
  console.log(`Live demo opens; Back returns to the gallery at position ${Number(returned)+1}.`);
  assert.equal(returned,'6','Back should retain the selected demo.');
  await fs.writeFile('playwright-report/showcase/lifecycle-report.json',JSON.stringify({backgroundPause:true,foregroundResume:true,seamlessWrap:true,backRestoresSelection:true},null,2));
} finally {await browser.close();}
