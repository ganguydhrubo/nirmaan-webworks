import {chromium} from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
for(const slug of ['shivalik-homes','kayal-backwaters','sanjeevani-clinic','manthan-institute','ivory-smiles','anaar-awadhi-table']){
 await page.goto(`http://127.0.0.1:4321/demos/${slug}`,{waitUntil:'networkidle'});
 const shot=await page.screenshot(); const dir=`public/images/demos/${slug}`; await fs.mkdir(dir,{recursive:true});
 await sharp(shot).resize(640,480,{fit:'cover',position:'top'}).jpeg({quality:80}).toFile(`${dir}/card.jpg`);
 if(slug==='kayal-backwaters')await sharp(shot).resize(960,640,{fit:'cover',position:'top'}).jpeg({quality:78}).toFile(`${dir}/hero-preview.jpg`);
 console.log(slug);
}
await browser.close();
await sharp('public/favicon.svg').resize(180).png().toFile('public/apple-touch-icon.png');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<defs>
  <linearGradient id="a" x1="10" y1="6" x2="90" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eef4ff"/><stop offset="0.45" stop-color="#5b8def"/><stop offset="1" stop-color="#1548c9"/></linearGradient>
  <linearGradient id="b" x1="90" y1="6" x2="10" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eef4ff"/><stop offset="0.45" stop-color="#4f7fe8"/><stop offset="1" stop-color="#0f3aa8"/></linearGradient>
</defs>
<rect width="1200" height="630" fill="#0a1330"/>
<g transform="translate(70,95) scale(2.2)">
  <rect x="1" y="1" width="98" height="98" rx="24" fill="#0d1a3f"/>
  <path d="M50 16 20 86" stroke="url(#a)" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M50 16 80 86" stroke="url(#b)" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M33 62 67 62" stroke="url(#a)" stroke-width="11" fill="none" stroke-linecap="round"/>
</g>
<text x="320" y="200" font-family="Arial" font-weight="bold" font-size="80" letter-spacing="4" fill="#ffffff">ATITTLE</text>
<text x="70" y="360" font-family="Georgia" font-size="46" fill="#ffffff">Websites that <tspan fill="#5b8def">move your world</tspan>.</text>
<text x="70" y="420" font-family="Arial" font-size="28" fill="#9db3e8">Fast, mobile-first websites for Indian businesses — priced in plain rupees.</text>
<path d="M70 470H1130" stroke="#22305e"/>
<text x="70" y="530" font-family="Arial" font-size="26" fill="#9db3e8">Six industries. Six working demos. Explore the work.</text>
</svg>`;
await sharp(Buffer.from(svg)).jpeg({quality:88}).toFile('public/images/og-default.jpg');
