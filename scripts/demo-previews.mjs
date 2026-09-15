import {chromium} from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
// Keep in sync with config/site.ts's demoRegistry — every demo needs a card.jpg
// or /demos and the homepage IndustryShowcase render a broken <img>.
for(const slug of ['shivalik-homes','kayal-backwaters','sanjeevani-clinic','manthan-institute','ivory-smiles','anaar-awadhi-table','sunehri-atelier','aangan-form','mogra-house',"meridian-advisory"]){
 if(only && !only.includes(slug))continue;
 await page.goto(`http://127.0.0.1:4321/demos/${slug}`,{waitUntil:'networkidle'});
 await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
 const shot=await page.screenshot(); const dir=`public/images/demos/${slug}`; await fs.mkdir(dir,{recursive:true});
 await sharp(shot).resize(640,480,{fit:'cover',position:'top'}).jpeg({quality:80}).toFile(`${dir}/card.jpg`);
 if(slug==='kayal-backwaters')await sharp(shot).resize(960,640,{fit:'cover',position:'top'}).jpeg({quality:78}).toFile(`${dir}/hero-preview.jpg`);
 console.log(slug);
}
await browser.close();
if(process.argv.includes('--skip-og'))process.exit(0);
await sharp('public/favicon.svg').resize(180).png().toFile('public/apple-touch-icon.png');
// Mark: geometric "A" apex (see Logo.astro / favicon.svg) — single ink,
// drawn straight on the dark ink-950 ground at OG-card scale.
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#16110d"/>
<g transform="translate(80,90) scale(1.9)" fill="none" stroke="#eb9d76" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 86 L50 14 L82 86"/>
  <path d="M29.6 60 L70.4 60"/>
</g>
<text x="320" y="200" font-family="Arial" font-weight="bold" font-size="80" letter-spacing="4" fill="#fbf6ee">ATITTLE</text>
<text x="70" y="360" font-family="Georgia" font-size="46" fill="#fbf6ee">Websites that <tspan fill="#eb9d76">move your world</tspan>.</text>
<text x="70" y="420" font-family="Arial" font-size="28" fill="#cdbba7">Fast, mobile-first websites for Indian businesses — priced in plain rupees.</text>
<path d="M70 470H1130" stroke="#3a2e24"/>
<text x="70" y="530" font-family="Arial" font-size="26" fill="#cdbba7">Nine industries. Nine working demos. Explore the work.</text>
</svg>`;
await sharp(Buffer.from(svg)).jpeg({quality:88}).toFile('public/images/og-default.jpg');
