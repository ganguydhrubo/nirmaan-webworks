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
 */
const KEY = "be61a9df67e95b1f027caa4216bb65b1"; // matches public/<key>.txt
const host = process.argv[2] ?? "https://webjobs.site";

const paths = [
  "/", "/about", "/pricing", "/work-process", "/faq", "/contact",
  "/industries", "/industries/real-estate", "/industries/hotels-resorts",
  "/industries/healthcare-clinics", "/industries/education-coaching",
  "/industries/dental-clinics", "/industries/restaurants-cafes",
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
