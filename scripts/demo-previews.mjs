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
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fbf6ee"/><rect x="70" y="80" width="90" height="9" fill="#a13f22"/><text x="70" y="205" font-family="Georgia" font-size="66" fill="#211a15">Nirmaan Webworks</text><text x="70" y="300" font-family="Arial" font-size="36" fill="#665748">Websites for Indian businesses.</text><text x="70" y="390" font-family="Arial" font-size="30" fill="#a13f22">Six industries. Six working demos.</text><path d="M70 470H1130" stroke="#cdbba7"/><text x="70" y="540" font-family="Arial" font-size="25" fill="#665748">Explore the work. Plan your website.</text></svg>';
await sharp(Buffer.from(svg)).jpeg({quality:85}).toFile('public/images/og-default.jpg');
