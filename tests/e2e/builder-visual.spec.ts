import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteFiles } from "../../src/lib/builder/export";
import { normalizeDoc, type SiteDoc } from "../../src/lib/builder/schema";
import { TEMPLATE_LIST, templateDoc } from "../../src/lib/builder/templates";

/**
 * Rendered-output quality checks for generated websites, run on the REAL
 * exported files (opened from disk, no ATITTLE server involved):
 * every template plus real AI generations captured on 2026-10-17
 * (tests/fixtures/builder). HTML validity alone is not treated as quality —
 * these check what a visitor would actually see.
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/builder");
const fixtures = fs.readdirSync(FIXTURES).map((f) => ({
  id: `ai:${f.replace(/\.json$/, "")}`,
  doc: normalizeDoc(JSON.parse(fs.readFileSync(path.join(FIXTURES, f), "utf8"))).doc,
}));
const sites: { id: string; doc: SiteDoc }[] = [...TEMPLATE_LIST.map((t) => ({ id: `template:${t.id}`, doc: templateDoc(t.id)! })), ...fixtures];

function writeSite(doc: SiteDoc): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atb-vqa-"));
  for (const f of buildSiteFiles(doc)) {
    const target = path.join(dir, f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, f.data);
  }
  return dir;
}

for (const site of sites) {
  for (const vp of [
    { name: "desktop", width: 1366, height: 860 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${site.id} renders cleanly on ${vp.name}`, async ({ browser }) => {
      const dir = writeSite(site.doc);
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const problems: string[] = [];
      page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
      page.on("requestfailed", (r) => !/fonts\.(googleapis|gstatic)/.test(r.url()) && problems.push(`failed: ${r.url()}`));

      for (const p of site.doc.pages) {
        await page.goto("file://" + path.join(dir, `${p.slug}.html`).replace(/\\/g, "/"), { waitUntil: "load" });

        const report = await page.evaluate(() => {
          const out: string[] = [];
          if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`horizontal overflow ${document.documentElement.scrollWidth - window.innerWidth}px`);
          // Content must be visible without scrolling into view (link previews, print, crawlers).
          for (const el of document.querySelectorAll<HTMLElement>("main section, header, footer")) {
            const cs = getComputedStyle(el);
            if (cs.display !== "none" && (el.offsetHeight < 20 || cs.opacity === "0" || cs.visibility === "hidden")) out.push(`invisible section ${el.className}`);
            const kids = [...el.querySelectorAll<HTMLElement>(".wrap > *")];
            if (kids.some((k) => getComputedStyle(k).opacity === "0")) out.push(`hidden content in ${el.className}`);
            if (!el.innerText.trim() && !el.querySelector("img, .ph")) out.push(`blank section ${el.className}`);
          }
          for (const img of document.querySelectorAll("img")) if (!img.complete || img.naturalWidth === 0) out.push(`broken image ${img.getAttribute("src")}`);
          const h1 = document.querySelector("h1");
          if (h1 && !h1.textContent?.trim()) out.push("empty h1");
          for (const a of document.querySelectorAll<HTMLAnchorElement>("a.btn, .btn")) if (!a.textContent?.trim()) out.push("empty button");
          // Text contrast on the page background
          const lum = (rgb: string) => {
            const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"]).slice(0, 3).map((v) => {
              const c = Number(v) / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
          };
          const bodyCs = getComputedStyle(document.body);
          const [a, b] = [lum(bodyCs.color), lum(bodyCs.backgroundColor)].sort((x, y) => y - x);
          const ratio = (a! + 0.05) / (b! + 0.05);
          if (ratio < 4.5) out.push(`body text contrast ${ratio.toFixed(2)}`);
          // Internal links point at files that exist in the export
          const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((l) => l.getAttribute("href")!).filter((h) => /^[a-z0-9-]+\.html(#.*)?$/.test(h));
          return { problems: out, links };
        });
        problems.push(...report.problems.map((x) => `${p.slug}: ${x}`));
        for (const href of report.links) {
          const file = href.split("#")[0]!;
          if (!fs.existsSync(path.join(dir, file))) problems.push(`${p.slug}: link to missing ${file}`);
        }
      }
      expect(problems, problems.join("\n")).toEqual([]);
      await ctx.close();
    });
  }
}
