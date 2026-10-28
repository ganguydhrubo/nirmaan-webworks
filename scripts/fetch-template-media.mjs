/** Freeze CC0/public-domain metadata from Wikimedia. Never manufacture photo URLs. */
import fs from 'node:fs/promises';
import { CATEGORIES } from './template-categories.mjs';
const output = new URL('../src/lib/builder/template-media.json', import.meta.url);
const queries = {
  saas: 'laptop', 'ai-tech': 'robotics', corporate: 'office', 'creative-agency': 'workspace',
  'portfolio-freelance': 'desk', 'small-business': 'coffee shop', 'restaurants-dining': 'food',
  ecommerce: 'shopping', 'fashion-luxury': 'fashion', 'healthcare-wellness': 'medical',
  'real-estate': 'modern house', 'construction-architecture': 'interior', 'education-coaching': 'classroom', 'finance-legal': 'business',
  'fitness-sports': 'fitness', 'travel-hospitality': 'travel', 'events-entertainment': 'wedding', 'photography-film': 'photography',
  'nonprofit-community': 'community', 'consulting-advisory': 'business', 'landing-pages': 'technology', 'blogs-editorial': 'books',
};
const manifest = process.argv.includes('--refresh') ? {} : JSON.parse(await fs.readFile(output, 'utf8').catch(() => '{}'));
const used = new Set(Object.values(manifest).map(x => x.url));
const request = async (q) => {
  const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap -MET -engraving -painting -museum -historic -drawing -antique`, gsrnamespace: '6', gsrlimit: '50', prop: 'imageinfo', iiprop: 'url|size|extmetadata|sha1', iiurlwidth: '1920', format: 'json', origin: '*' });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'AtittleTemplateCatalog/1.0 (https://atittle.com)' } });
  if (!response.ok) throw new Error(`Wikimedia ${response.status}`);
  const json = await response.json();
  return Object.values(json.query?.pages || {}).sort((a,b) => a.index - b.index).flatMap(p => {
    const i = p.imageinfo?.[0], meta = i?.extmetadata || {};
    const license = meta.LicenseShortName?.value || '';
    if (!i || !/^(CC0|Public domain)/i.test(license) || i.width < 1200 || i.height < 800 || !/\.(jpe?g|png|webp)(\?|$)/i.test(i.url) || used.has(i.url)) return [];
    i.url = i.url.split('?')[0];
    const plain = s => (s || '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
    return [{ id: `commons-${p.pageid}`, title: plain(p.title.replace(/^File:/, '').replace(/\.[^.]+$/, '')), url: i.thumburl || i.url, originalUrl: i.url, previewUrl: i.thumburl || i.url, width: i.thumbwidth || i.width, height: i.thumbheight || i.height, sha1: i.sha1, photographer: plain(meta.Artist?.value) || 'Wikimedia contributor', sourceUrl: i.descriptionurl, license, licenseUrl: (meta.LicenseUrl?.value || 'https://creativecommons.org/publicdomain/zero/1.0/').replace(/^http:/, 'https:') }];
  });
};
const starters = [
  ['corporate-advisory','office'], ['saas-platform','laptop'], ['small-business','coffee'], ['portfolio','photography'],
  ['consultant','meeting'], ['freelancer','desk'], ['agency','workspace'], ['restaurant','food'],
  ['local-service','tools'], ['personal-brand','portrait'], ['startup','technology'], ['product','product design'],
].map(([id, topic]) => ({ slug: id, cat: 'Starter designs', topic, items: [{ id }] }));
for (const c of [...CATEGORIES, ...starters]) {
  const missing = c.items.filter(it => !manifest[it.id]);
  if (!missing.length) continue;
  const keyword = c.topic || queries[c.slug] || c.cat.split(/[,&]/)[0];
  let pool = [];
  for (const q of [`${keyword} unsplash`, `${keyword} pixabay`, `${keyword} pexels`, `${keyword} incategory:CC-Zero`, `${keyword} incategory:PD-user`, `${keyword}`]) {
    try { pool.push(...await request(q)); } catch (err) { console.log(c.slug, err.message); }
    if (pool.length >= missing.length) break;
  }
  for (const it of missing) {
    const photo = pool.find(x => !used.has(x.url) && !Object.values(manifest).some(y => y.sha1 && y.sha1 === x.sha1));
    if (!photo) break;
    manifest[it.id] = { ...photo, category: c.cat, query: keyword };
    used.add(photo.url);
  }
  await fs.writeFile(output, JSON.stringify(manifest, null, 2)+'\n');
  console.log(`${c.slug}: ${c.items.filter(it=>manifest[it.id]).length}/${c.items.length}`);
}
console.log(`Frozen ${Object.keys(manifest).length} unique media records`);
