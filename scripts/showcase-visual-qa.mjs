import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4322';
const sizes = [[320,800],[360,800],[375,812],[390,844],[414,896],[430,932],[480,900],[768,1024],[820,1180],[1024,768],[1280,800],[1440,900],[1920,1080],[2560,1440],[844,390]];
const out = 'playwright-report/showcase';
await fs.mkdir(out, { recursive:true });
const browser = await chromium.launch({ channel:'chrome', headless:true });
const results = [];
try {
  const context = await browser.newContext({ reducedMotion:'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/', '/demos']) {
    for (const [width,height] of sizes) {
      await page.setViewportSize({ width,height });
      await page.goto(base + route, { waitUntil:'networkidle' });
      await page.locator('[data-showcase]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const info = await page.evaluate(() => {
        const root = document.querySelector('[data-showcase]');
        const stage = root.querySelector('[data-stage]').getBoundingClientRect();
        const img = root.querySelector('.is-active img');
        return {
          overflow:document.documentElement.scrollWidth > innerWidth,
          loaded:img.naturalWidth > 0,
          mobileAsset:img.currentSrc.includes('-mobile.webp'),
          stage:{x:stage.x,y:stage.y,width:stage.width,height:stage.height},
          controls:root.dataset.enhanced,
        };
      });
      const prefix = route === '/' ? 'home' : 'demos';
      await page.screenshot({ path:`${out}/${prefix}-${width}x${height}.png` });
      await page.locator('[data-showcase]').screenshot({ path:`${out}/${prefix}-stage-${width}x${height}.png` });
      results.push({ route,width,height,...info });
      console.log(JSON.stringify(results.at(-1)));
    }
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:1000});
      await page.goto(base + route, {waitUntil:'networkidle'});
      const axe = await new AxeBuilder({ page }).analyze();
      const violations = axe.violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}));
      results.push({route,width,violations});
      console.log('AXE',route,width,JSON.stringify(violations));
    }
  }
  await fs.writeFile(`${out}/visual-report.json`,JSON.stringify({base,results,errors},null,2));
  if (errors.length || results.some(r => r.overflow || r.loaded === false || r.violations?.length)) process.exitCode = 1;
} finally { await browser.close(); }
