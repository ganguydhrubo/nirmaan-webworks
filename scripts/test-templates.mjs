import fs from "node:fs";
import { TEMPLATE_LIST, templateDoc, templateInput } from "../src/lib/builder/templates.ts";
import { normalizeDoc } from "../src/lib/builder/schema.ts";
import { getSectionDef } from "../src/lib/builder/catalog.ts";
import { safeImageSrc } from "../src/lib/builder/sanitize.ts";
import { exportRenderOptions, renderPageDocument } from "../src/lib/builder/render.ts";

const media = JSON.parse(fs.readFileSync(new URL("../src/lib/builder/template-media.json", import.meta.url), "utf8"));
const errors = [], warnings = [], ids = new Set(), owners = new Map(), hashes = new Map(), layouts = new Set();
const check = (condition, message) => { if (!condition) errors.push(message); };
const canonical = src => { const url = new URL(src); return `${url.origin}${url.pathname}`; };
const inspectFields = (fields, props, label) => {
  for (const key of Object.keys(props || {})) check(fields.some(f => f.key === key), `${label}: unsupported property ${key}`);
  for (const f of fields) {
    const value = props?.[f.key];
    if (f.kind === "list" && Array.isArray(value)) value.forEach((item, i) => inspectFields(f.fields, item, `${label}.${f.key}.${i}`));
  }
};
const images = value => {
  if (Array.isArray(value)) return value.flatMap(images);
  if (!value || typeof value !== "object") return [];
  if (typeof value.src === "string") return value.src ? [value.src] : [];
  return Object.values(value).flatMap(images);
};
console.log("Total templates in TEMPLATE_LIST:", TEMPLATE_LIST.length);
check(TEMPLATE_LIST.length >= 200, "Expected at least 200 templates");
for (const t of TEMPLATE_LIST) {
  check(!ids.has(t.id), `Duplicate template ID ${t.id}`); ids.add(t.id);
  const input = templateInput(t.id), doc = templateDoc(t.id);
  check(!!input && !!doc, `Missing document ${t.id}`);
  if (!input || !doc) continue;
  const norm = normalizeDoc(input);
  warnings.push(...norm.warnings.map(w => `${t.id}: ${w}`));
  for (const page of input.pages) for (const s of page.sections) {
    const def = getSectionDef(s.type);
    check(!!def, `${t.id}: unknown section ${s.type}`);
    if (!def) continue;
    check(def.variants.some(v => v.id === s.variant), `${t.id}: invalid ${s.type} variant ${s.variant}`);
    inspectFields(def.fields, s.props, `${t.id}/${s.type}`);
  }
  const photo = media[t.id];
  check(!!photo, `${t.id}: missing media provenance`);
  if (!photo) continue;
  check(/^https:\/\//.test(photo.url) && !!safeImageSrc(photo.url), `${t.id}: unsafe image URL`);
  check(photo.width >= 1200 && photo.height >= 800, `${t.id}: photo is below minimum dimensions (${photo.width}×${photo.height})`);
  check(/^(CC0|Public domain)/i.test(photo.license) && /^https:\/\//.test(photo.sourceUrl), `${t.id}: missing reusable license/source`);
  const key = canonical(photo.originalUrl || photo.url);
  check(!owners.has(key), `${t.id}: image already belongs to ${owners.get(key)}`); owners.set(key, t.id);
  if (photo.sha1) { check(!hashes.has(photo.sha1), `${t.id}: duplicate image hash from ${hashes.get(photo.sha1)}`); hashes.set(photo.sha1, t.id); }
  const sources = images(doc.pages);
  check(sources.length > 0, `${t.id}: missing template imagery`);
  for (const src of sources) check(src === photo.url, `${t.id}: photo outside its assigned media set`);
  layouts.add(doc.pages[0].sections.map(s => `${s.type}:${s.variant}`).join("/"));
  for (const page of doc.pages) {
    const html = renderPageDocument(doc, page, exportRenderOptions());
    check(html.includes("<main"), `${t.id}: export missing main content`);
    check(!/<script[\s>]/i.test(html), `${t.id}: unexpected script in static export`);
  }
}
check(layouts.size >= 10, "Expected at least ten distinct section architectures");
for (const message of errors) console.error(`ERROR: ${message}`);
for (const message of warnings) console.warn(`WARNING: ${message}`);
console.log(`Unique media: ${owners.size}; unique section architectures: ${layouts.size}`);
console.log(`Validation complete! ${errors.length} errors, ${warnings.length} warnings`);
if (errors.length || warnings.length) process.exitCode = 1;
