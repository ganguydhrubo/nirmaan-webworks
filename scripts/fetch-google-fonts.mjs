#!/usr/bin/env node
/**
 * Fetches self-hostable, subset woff2 files for a Google Font family and
 * writes a local @font-face CSS file — used at authoring time only, never
 * at runtime (see CREDITS.md). Subsets to "latin" + "latin-ext" (not just
 * "latin"), because the ₹ rupee sign (U+20B9) lives in latin-ext's
 * U+20AD-20C0 range and is absent from the default latin subset.
 *
 * Usage:
 *   node scripts/fetch-google-fonts.mjs <family> <weights,comma,separated> <outDir> <cssFile> [italicWeights]
 *
 * Example:
 *   node scripts/fetch-google-fonts.mjs "Spectral" "500,600" public/fonts/demos/shivalik-homes src/styles/demos/shivalik-homes-fonts.css
 */
import fs from "node:fs/promises";
import path from "node:path";

const LEGACY_UA =
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36";

const [, , family, weightsArg, outDir, cssFile, italicWeightsArg] = process.argv;

if (!family || !weightsArg || !outDir || !cssFile) {
  console.error("Usage: node scripts/fetch-google-fonts.mjs <family> <weights> <outDir> <cssFile> [italicWeights]");
  process.exit(1);
}

const weights = weightsArg.split(",").map((w) => w.trim());
const italicWeights = italicWeightsArg ? italicWeightsArg.split(",").map((w) => w.trim()) : [];

function buildFamilyQuery() {
  const parts = [];
  if (weights.length) parts.push(`wght@${weights.join(";")}`);
  const familyParam = encodeURIComponent(family) + (parts.length ? `:${parts.join(";")}` : "");
  const params = [`family=${familyParam}`];
  if (italicWeights.length) {
    const italicParam = encodeURIComponent(family) + `:ital,wght@${italicWeights.map((w) => `1,${w}`).join(";")}`;
    params.push(`family=${italicParam}`);
  }
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}

async function main() {
  const cssUrl = buildFamilyQuery();
  const res = await fetch(cssUrl, { headers: { "User-Agent": LEGACY_UA } });
  if (!res.ok) throw new Error(`Failed to fetch font CSS: ${res.status} ${cssUrl}`);
  const css = await res.text();

  const blocks = css.split("/*").slice(1).map((b) => "/*" + b);
  const wanted = blocks.filter((b) => /^\/\* (latin|latin-ext) \*\//.test(b));

  const re =
    /font-family: .([^']+).;\s*font-style: (\w+);\s*font-weight: (\d+);\s*font-display: swap;\s*src: url\((https:[^)]+)\) format\('woff2'\);\s*unicode-range: ([^;]+);/g;

  const entries = [];
  for (const block of wanted) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(block))) {
      const [, fam, style, weight, url, range] = m;
      const subset = range.includes("20AD-20C0") || range.includes("1E00-1EFF") ? "ext" : "latin";
      entries.push({ family: fam, style, weight, url, range: range.trim(), subset });
    }
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(path.dirname(cssFile), { recursive: true });

  const cssLines = [];
  const creditRows = [];
  const slug = family.toLowerCase().replace(/\s+/g, "-");

  for (const entry of entries) {
    const fname = `${slug}-${entry.weight}-${entry.style}-${entry.subset}.woff2`;
    const fileRes = await fetch(entry.url);
    const buf = Buffer.from(await fileRes.arrayBuffer());
    await fs.writeFile(path.join(outDir, fname), buf);

    const publicPath = "/" + path.relative("public", path.join(outDir, fname)).split(path.sep).join("/");
    cssLines.push(
      `@font-face {\n  font-family: "${entry.family}";\n  font-style: ${entry.style};\n  font-weight: ${entry.weight};\n  font-display: swap;\n  src: url("${publicPath}") format("woff2");\n  unicode-range: ${entry.range};\n}`,
    );
  }

  await fs.writeFile(cssFile, cssLines.join("\n\n") + "\n");
  creditRows.push(
    `| ${family} (static) | ${[...new Set(entries.map((e) => e.weight))].join(", ")} | — | https://fonts.google.com/specimen/${encodeURIComponent(family.replace(/\s+/g, "+"))} | SIL Open Font License 1.1 | ${new Date().toISOString().slice(0, 10)} |`,
  );

  console.log(`✓ ${family}: ${entries.length} files written to ${outDir}`);
  console.log(`✓ CSS written to ${cssFile}`);
  console.log("CREDITS.md row:");
  console.log(creditRows.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
