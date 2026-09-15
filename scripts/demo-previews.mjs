import {chromium} from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
// Keep in sync with config/site.ts's demoRegistry — every demo needs a card.jpg
// or /demos and the homepage IndustryShowcase render a broken <img>.
for(const slug of ['shivalik-homes','kayal-backwaters','sanjeevani-clinic','manthan-institute','ivory-smiles','anaar-awadhi-table','sunehri-atelier','aangan-form','mogra-house',"meridian-advisory","repwork-studio","saanjh-stories","sunday-objects","torque-district","clearline-labs"]){
 if(only && !only.includes(slug))continue;
 await page.goto(`http://127.0.0.1:4321/demos/${slug}`,{waitUntil:'networkidle'});
 // Hide the demo-disclosure banner for the card crop: it's the same generic
 // "Demo site / Want one for your business?" chrome on all 15 pages, and
 // burning it into the top of every thumbnail ate the exact space a visitor
 // scanning /demos needs to place the business in under 2 seconds. The full
 // banner still renders for anyone who actually opens the demo.
 await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}[data-demo-banner]{display:none!important}'});
 // Let the (now-reflowed) hero photo actually finish loading/decoding before
 // capturing — a couple of these were shipping with a blank hero on capture.
 // Scoped to images actually visible in the viewport right now (excludes
 // e.g. a closed native <dialog>'s gallery images, whose decode() can hang)
 // and hard-capped so one stuck image can never stall the whole batch.
 await Promise.race([
   page.evaluate(async () => {
     const vh = window.innerHeight;
     const imgs = [...document.querySelectorAll('img')].filter(img => {
       const r = img.getBoundingClientRect();
       return r.top < vh && r.bottom > 0 && img.offsetParent !== null;
     });
     await Promise.all(imgs.map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
   }),
   new Promise(resolve => setTimeout(resolve, 2000)),
 ]);
 await page.waitForTimeout(250);
 const shot=await page.screenshot(); const dir=`public/images/demos/${slug}`; await fs.mkdir(dir,{recursive:true});
 await sharp(shot).resize(640,480,{fit:'cover',position:'top'}).jpeg({quality:80}).toFile(`${dir}/card.jpg`);
 if(slug==='kayal-backwaters')await sharp(shot).resize(960,640,{fit:'cover',position:'top'}).jpeg({quality:78}).toFile(`${dir}/hero-preview.jpg`);
 console.log(slug);
}
await browser.close();
if(process.argv.includes('--skip-og'))process.exit(0);
await sharp('public/favicon.svg').resize(180).png().toFile('public/apple-touch-icon.png');
// Same favicon mark at a larger, standalone size for the Organization
// JSON-LD `logo` field (src/lib/seo.ts) — schema.org expects a self-
// contained image, not something that depends on a page's background.
await sharp('public/favicon.svg').resize(512).png().toFile('public/images/logo.png');
// Official ATITTLE icon + wordmark (public/brand/atittle-icon.svg,
// atittle-wordmark.svg), embedded verbatim at OG-card scale — same mark
// as Logo.astro/favicon.svg, not a redrawn approximation.
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#16110d"/>
<g transform="translate(80,130) scale(1.15)">
  <rect x="0" y="0" width="63" height="31" rx="1.5" fill="#FFFFFF"/>
  <rect x="0" y="30" width="35" height="89" rx="1.5" fill="#FFFFFF"/>
  <rect x="70" y="49" width="35" height="70" rx="1.5" fill="#FFFFFF"/>
  <circle cx="88" cy="16" r="15.5" fill="#D4AF37"/>
</g>
<g transform="translate(320,168) scale(0.868)">
  <path d="M9 0H341L449 325H1006L1110 0H1451L928 1490H532ZM532 571 583 725C631 877 677 1029 731 1214C784 1029 830 877 876 725L926 571Z" transform="translate(0.000,64) scale(0.031250,-0.031250)" fill="#FFFFFF"/>
  <path d="M45 1226H497V0H805V1226H1256V1490H45Z" transform="translate(53.656,64) scale(0.031250,-0.031250)" fill="#FFFFFF"/>
  <path d="M419 1490H111V0H419Z" transform="translate(102.312,64) scale(0.031250,-0.031250)" fill="#FFFFFF"/>
  <path d="M45 1226H497V0H805V1226H1256V1490H45Z" transform="translate(126.875,64) scale(0.031250,-0.031250)" fill="#FFFFFF"/>
  <path d="M45 1226H497V0H805V1226H1256V1490H45Z" transform="translate(175.531,64) scale(0.031250,-0.031250)" fill="#FFFFFF"/>
  <path d="M111 0H1096V264H419V1490H111Z" transform="translate(224.188,64) scale(0.031250,-0.031250)" fill="#FFFFFF"/>
  <path d="M111 0H1180V264H419V624H1123V881H419V1226H1180V1490H111Z" transform="translate(267.812,64) scale(0.031250,-0.031250)" fill="#FFFFFF"/>
</g>
<text x="70" y="360" font-family="Georgia" font-size="46" fill="#fbf6ee">Websites that <tspan fill="#eb9d76">move your world</tspan>.</text>
<text x="70" y="420" font-family="Arial" font-size="28" fill="#cdbba7">Fast, mobile-first websites for Indian businesses — priced in plain rupees.</text>
<path d="M70 470H1130" stroke="#3a2e24"/>
<text x="70" y="530" font-family="Arial" font-size="26" fill="#cdbba7">Fifteen industries. Fifteen working demos. Explore the work.</text>
</svg>`;
await sharp(Buffer.from(svg)).jpeg({quality:88}).toFile('public/images/og-default.jpg');
