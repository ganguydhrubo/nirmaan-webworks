#!/usr/bin/env node
/**
 * Submits every indexable page to IndexNow (the shared real-time-indexing
 * protocol Bing, Yandex, Seznam.cz and Naver all consume from one ping —
 * there is no equivalent single API for Google, which discovers pages via
 * sitemap.xml/crawling instead; see GOOGLE-BUSINESS.md and SEO.md for the
 * Google-specific steps, which require manual Search Console verification
 * this build has no account access to perform).
 *
 * Usage: node scripts/indexnow-submit.mjs [https://your-deployed-domain]
 * Re-run this any time a meaningful set of pages changes.
 *
 * Requires Node 22.6+ (native TypeScript type-stripping, to import
 * config/site.ts directly rather than hand-duplicating its industry list —
 * this repo's stated engines minimum is Node 20, but that's for the app
 * build/deploy pipeline; this is a standalone manual utility, never run
 * as part of it).
 */
import { siteConfig } from "../config/site.ts";

const KEY = "be61a9df67e95b1f027caa4216bb65b1"; // matches public/<key>.txt
const host = process.argv[2] ?? "https://atittle.com";

// Derived from config/site.ts, not a hand-maintained list — this previously
// hardcoded 6 of the 9 original industries and none of the 6 added later,
// so submissions silently stopped covering real pages as the site grew.
const paths = [
  "/", "/about", "/pricing", "/work-process", "/faq", "/contact",
  "/industries",
  ...siteConfig.industryRegistry.map((i) => `/industries/${i.slug}`),
  "/demos", "/tools/website-evaluator",
  "/privacy", "/terms", "/refund-policy",
];

const body = {
  host: new URL(host).host,
  key: KEY,
  keyLocation: `${host}/${KEY}.txt`,
  urlList: paths.map((p) => `${host}${p}`),
};

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

console.log(`IndexNow submit: ${res.status} ${res.statusText}`);
if (!res.ok) console.log(await res.text());
