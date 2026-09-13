// Local visual-QA helper: screenshots a URL and reports console/page errors.
// Usage: node scripts/pw-smoke.mjs <url> <outPrefix> <width> <height>
//
// Requires a Chromium binary. Run `npx playwright install chromium` first;
// if that download is blocked by your network, point CHROME_EXECUTABLE_PATH
// at any existing Chrome/Chromium install instead.
import { chromium } from "playwright-core";

const CHROME_PATH = process.env.CHROME_EXECUTABLE_PATH ?? chromium.executablePath();

const url = process.argv[2] ?? "http://localhost:4321/";
const outPrefix = process.argv[3] ?? "C:\\Users\\Dhrubo\\AppData\\Local\\Temp\\screenshot";
const width = Number(process.argv[4] ?? 390);
const height = Number(process.argv[5] ?? 844);

const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
const page = await browser.newPage({ viewport: { width, height } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));
page.on("requestfailed", (req) => errors.push(`REQUEST FAILED: ${req.url()} — ${req.failure()?.errorText}`));

await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(300);

// Scroll through the whole page slowly so every IntersectionObserver-based
// reveal fires before we screenshot, matching real user scroll behaviour.
const pageHeight = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < pageHeight; y += height / 2) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(120);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);

await page.screenshot({ path: `${outPrefix}-full.png`, fullPage: true });

const revealStats = await page.evaluate(() => {
  const els = document.querySelectorAll(".reveal");
  let visible = 0;
  els.forEach((el) => {
    if (el.classList.contains("is-visible") || getComputedStyle(el).opacity !== "0") visible++;
  });
  return { total: els.length, visible };
});

console.log("URL:", url);
console.log("Page height:", pageHeight);
console.log("Reveal stats:", JSON.stringify(revealStats));
console.log("Console/page errors:", JSON.stringify(errors, null, 2));
await browser.close();
