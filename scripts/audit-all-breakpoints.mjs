#!/usr/bin/env node
/**
 * Sweeps every route (including SSR-only pages the static-file-derived
 * audit-pages.mjs can't discover, like /tools/website-evaluator) across all
 * 9 standard breakpoints for horizontal overflow — not just home + demo
 * homepages, which is all the existing audit-pages.mjs covers by default.
 *
 * Usage: AUDIT_URL=https://webjobs-site.vercel.app node scripts/audit-all-breakpoints.mjs
 */
import { chromium } from "playwright-core";

const base = process.env.AUDIT_URL ?? "http://127.0.0.1:4321";
const widths = [320, 360, 390, 412, 768, 1024, 1280, 1440, 1920];

const routes = [
  "/", "/about", "/contact", "/pricing", "/work-process", "/faq",
  "/industries", "/industries/real-estate", "/industries/hotels-resorts",
  "/industries/healthcare-clinics", "/industries/education-coaching",
  "/industries/dental-clinics", "/industries/restaurants-cafes",
  "/demos", "/tools/website-evaluator",
  "/demos/shivalik-homes", "/demos/shivalik-homes/projects", "/demos/shivalik-homes/projects/shivalik-meadows",
  "/demos/kayal-backwaters",
  "/demos/sanjeevani-clinic",
  "/demos/manthan-institute", "/demos/manthan-institute/courses", "/demos/manthan-institute/faculty", "/demos/manthan-institute/admissions",
  "/demos/ivory-smiles", "/demos/ivory-smiles/treatments", "/demos/ivory-smiles/dentist", "/demos/ivory-smiles/contact",
  "/demos/anaar-awadhi-table", "/demos/anaar-awadhi-table/menu", "/demos/anaar-awadhi-table/our-story", "/demos/anaar-awadhi-table/reservations",
  "/privacy", "/terms", "/refund-policy", "/404",
];

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage();

const failures = [];
let checked = 0;

for (const route of routes) {
  for (const width of widths) {
    checked++;
    try {
      await page.setViewportSize({ width, height: width <= 360 ? 640 : 900 });
      const res = await page.goto(base + route, { waitUntil: "load", timeout: 20000 });
      const status = res ? res.status() : 0;
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (status >= 400 || overflow) {
        failures.push({ route, width, status, overflow });
      }
    } catch (err) {
      failures.push({ route, width, error: String(err).slice(0, 150) });
    }
  }
  process.stdout.write(`✓ ${route}\n`);
}

await browser.close();

console.log(`\nChecked ${checked} route×width combinations across ${routes.length} routes.`);
if (failures.length) {
  console.log(`${failures.length} FAILURES:`);
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("Zero overflow, zero non-200s, across all 9 breakpoints on every route checked.");
}
