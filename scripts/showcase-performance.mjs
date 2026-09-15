// Comparable local browser measurements; no field INP claim is made from a lab run.
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4321';
const label = process.env.AUDIT_LABEL ?? 'baseline';
const browser = await chromium.launch({channel:'chrome',headless:true});
const results = [];
try {
  for (const route of ['/', '/demos']) {
    for (const profile of ['mobile-cold','mobile-cached','mobile-slow','desktop-cold']) {
      const mobile = !profile.startsWith('desktop');
      const context = await browser.newContext({viewport:mobile ? {width:390,height:844} : {width:1440,height:900},isMobile:mobile,hasTouch:mobile});
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      if (profile.includes('slow')) {
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
        await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      }
      await page.addInitScript(() => {
        window.__vitals = {lcp:0,cls:0,events:[]};
        new PerformanceObserver(list => { for(const e of list.getEntries()) window.__vitals.lcp=e.startTime; }).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(list => { for(const e of list.getEntries()) if(!e.hadRecentInput) window.__vitals.cls+=e.value; }).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(list => { for(const e of list.getEntries()) if(e.interactionId) window.__vitals.events.push({name:e.name,duration:e.duration,inputDelay:e.processingStart-e.startTime,processing:e.processingEnd-e.processingStart,presentation:e.startTime+e.duration-e.processingEnd}); }).observe({type:'event',buffered:true,durationThreshold:16});
      });
      if (profile.includes('cached')) await page.goto(base+route,{waitUntil:'networkidle'});
      await page.goto(base+route,{waitUntil:'networkidle'});
      await page.screenshot();
      await page.waitForFunction(() => window.__vitals.lcp > 0);
      await page.waitForTimeout(1200);
      const vitals = await page.evaluate(() => ({
        ...window.__vitals,
        fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        transferredBytes:performance.getEntriesByType('resource').reduce((sum,e)=>sum+e.transferSize,0),
        images:performance.getEntriesByType('resource').filter(e=>e.initiatorType==='img').length,
        showcase:!!document.querySelector('[data-showcase]'),
      }));
      if (vitals.showcase) {
        await page.locator('[data-next]').scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        if (mobile) await page.locator('[data-next]').tap();
        else await page.locator('[data-next]').click();
        await page.waitForTimeout(1000);
        if (mobile) await page.locator('[data-prev]').tap();
        else await page.locator('[data-prev]').click();
        await page.waitForTimeout(1000);
        vitals.interactions = await page.evaluate(()=>window.__vitals.events);
        vitals.interactionMaxMs = Math.max(0,...vitals.interactions.map(e=>e.duration));
      }
      results.push({route,profile,...vitals});
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  }
  await fs.mkdir('playwright-report/showcase',{recursive:true});
  await fs.writeFile(`playwright-report/showcase/performance-${label}.json`,JSON.stringify({base,results},null,2));
} finally {await browser.close();}
