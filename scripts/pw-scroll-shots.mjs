// Local visual-QA helper: screenshots a URL in viewport-height slices while
// scrolling, so long pages can be reviewed section by section.
// Usage: node scripts/pw-scroll-shots.mjs <url> <width> <height> <outDir>
//
// Requires a Chromium binary — see scripts/pw-smoke.mjs for setup notes.
import { chromium } from "playwright-core";

const CHROME_PATH = process.env.CHROME_EXECUTABLE_PATH ?? chromium.executablePath();
const url = process.argv[2] ?? "http://localhost:4321/";
const width = Number(process.argv[3] ?? 390);
const height = Number(process.argv[4] ?? 844);
const outDir = process.argv[5] ?? "C:\\Users\\Dhrubo\\AppData\\Local\\Temp\\shots";

const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: "load", timeout: 30000 });

const pageHeight = await page.evaluate(() => document.body.scrollHeight);
const steps = Math.ceil(pageHeight / height);
for (let i = 0; i < steps; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * height);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}\\${String(i).padStart(2, "0")}.png` });
}
console.log("pageHeight", pageHeight, "steps", steps);
await browser.close();
