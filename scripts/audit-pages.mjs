import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4321';
const root = path.resolve('dist/client');

async function walk(dir) {
  const out = [];
  try {
    for (const f of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) out.push(...(await walk(p)));
      else if (f.name.endsWith('.html')) out.push(p);
    }
  } catch (err) {
    console.error(`Failed to read directory ${dir}:`, err);
  }
  return out;
}

const routes = (await walk(root))
  .map((p) => '/' + path.relative(root, p).replaceAll('\\', '/').replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, ''))
  .sort();

await fs.mkdir('test-results', { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

const results = [];
const links = new Set();
const broken = [];
const responsive = [];

try {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  for (const route of routes) {
    const errors = [];
    const errorHandler = (e) => errors.push(String(e));
    page.on('pageerror', errorHandler);

    try {
      const response = await page.goto(base + route, { waitUntil: 'load', timeout: 20000 });
      const status = response ? response.status() : 0;

      await page.evaluate(async () => {
        for (const img of document.images) {
          if (img.loading === 'lazy') img.loading = 'eager';
        }
        await Promise.all([...document.images].map((img) => {
          if (img.complete) return;
          return new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 2000);
          });
        }));
      });

      const info = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name=description]')?.getAttribute('content'),
        h1: document.querySelectorAll('h1').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        missingImages: [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src')),
        links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      }));

      for (const link of info.links) {
        if (link && link.startsWith('/')) links.add(link);
      }

      let violations = [];
      try {
        const axe = await new AxeBuilder({ page }).analyze();
        violations = axe.violations
          .filter((v) => ['critical', 'serious'].includes(v.impact))
          .map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          }));
      } catch (axeErr) {
        console.warn(`Axe failed for ${route}:`, axeErr.message);
        errors.push(`axe_error: ${axeErr.message}`);
      }

      const row = { route, status, ...info, links: undefined, violations, errors };
      results.push(row);
      console.log(JSON.stringify({ route, status: row.status, overflow: row.overflow, missing: row.missingImages.length, axe: violations.map((v) => v.id) }));

      if (route === '/' || /^\/demos\/[^/]+$/.test(route)) {
        await page.screenshot({
          path: `test-results/${route === '/' ? 'home' : route.split('/').pop()}-mobile.png`,
          fullPage: true,
        });
      }
    } catch (pageErr) {
      console.error(`Error auditing route ${route}:`, pageErr);
      results.push({
        route,
        status: 0,
        title: '',
        description: '',
        h1: 0,
        overflow: false,
        missingImages: [],
        violations: [],
        errors: [...errors, `navigation_error: ${pageErr.message}`],
      });
    } finally {
      page.off('pageerror', errorHandler);
    }
  }

  // Broken link check
  for (const link of links) {
    try {
      const u = new URL(link, base);
      const res = await page.request.get(u.href);
      if (res.status() >= 400) {
        broken.push({ link, status: res.status() });
      } else if (u.hash) {
        const html = await res.text();
        const anchor = decodeURIComponent(u.hash.slice(1));
        if (!html.includes(`id="${anchor}"`)) {
          broken.push({ link, reason: 'missing anchor' });
        }
      }
    } catch (linkErr) {
      broken.push({ link, error: linkErr.message });
    }
  }

  // Responsive widths check
  const widths = [320, 360, 390, 412, 768, 1024, 1280, 1440, 1920];
  for (const route of routes.filter((r) => r === '/' || /^\/demos\/[^/]+$/.test(r))) {
    for (const width of widths) {
      try {
        await page.setViewportSize({ width, height: width === 320 ? 568 : 800 });
        await page.goto(base + route, { waitUntil: 'load', timeout: 20000 });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
          responsive.push({ route, width });
        }
      } catch (respErr) {
        console.warn(`Responsive check failed for ${route} at ${width}px:`, respErr.message);
      }
    }
    try {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: `test-results/${route === '/' ? 'home' : route.split('/').pop()}-desktop.png`,
        fullPage: true,
      });
    } catch (shotErr) {
      console.warn(`Desktop screenshot failed for ${route}:`, shotErr.message);
    }
  }
} finally {
  await fs.writeFile(
    'test-results/page-audit.json',
    JSON.stringify({ date: new Date().toISOString(), results, broken, responsive }, null, 2),
  );
  await browser.close();
}

console.log(JSON.stringify({ pages: results.length, broken, responsive }));
if (broken.length || responsive.length || results.some((r) => r.violations.length || r.errors.length || r.missingImages.length || r.overflow)) {
  process.exitCode = 1;
}
