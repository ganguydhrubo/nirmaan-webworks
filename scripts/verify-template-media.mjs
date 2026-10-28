import fs from 'node:fs/promises';
const path = new URL('../src/lib/builder/template-media.json', import.meta.url);
const manifest = JSON.parse(await fs.readFile(path, 'utf8'));
const entries = Object.entries(manifest).filter(([, p]) => !process.argv.includes('--retry') || !p.verifiedAt);
let next = 0, valid = Object.keys(manifest).length - entries.length;
const failures = [];
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < entries.length) {
    const [id, photo] = entries[next++];
    try {
      if (photo.height < 800) {
        const title = decodeURIComponent(new URL(photo.sourceUrl).pathname.replace('/wiki/', ''));
        const params = new URLSearchParams({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '1920', format: 'json' });
        const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(15000) });
        const d = await r.json();
        const info = Object.values(d.query.pages)[0].imageinfo[0];
        const thumb = info.thumbheight >= 800;
        photo.url = thumb ? info.thumburl : info.url;
        photo.previewUrl = photo.url;
        photo.width = thumb ? info.thumbwidth : info.width;
        photo.height = thumb ? info.thumbheight : info.height;
      }
      let response;
      for (const src of [photo.url, photo.originalUrl]) {
        if (!src) continue;
        response = await fetch(src, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ATITTLE-Media-Verification/1.0 (https://atittle.com)' } });
        const retryAfter = response.headers.get('retry-after');
        await response.body?.cancel();
        if (response.status === 429) {
          console.log(`Rate limited ${id}; retry-after=${retryAfter || 'unspecified'}`);
          await new Promise(resolve => setTimeout(resolve, Math.min(30000, Math.max(2000, Number(retryAfter) * 1000 || 2000))));
        }
        if (response.ok && response.headers.get('content-type')?.startsWith('image/')) break;
      }
      if (!response?.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`HTTP ${response?.status}`);
      // Keep the actual working URL; never count an unreachable thumbnail as verified.
      if (response.url !== photo.url) { photo.url = response.url; photo.previewUrl = response.url; }
      photo.verifiedAt = new Date().toISOString();
      valid++;
    } catch (e) { failures.push({ id, reason: e.message }); }
    await new Promise(resolve => setTimeout(resolve, 1000));
    if ((valid + failures.length) % 25 === 0) console.log(`Checked ${valid + failures.length}/${entries.length}`);
  }
}));
await fs.writeFile(path, JSON.stringify(manifest, null, 2)+'\n');
await fs.mkdir(new URL('../docs/atittle-revamp/', import.meta.url), { recursive: true });
await fs.writeFile(new URL('../docs/atittle-revamp/media-verification.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), verified: valid, failures }, null, 2));
console.log(`Media HTTP verification: ${valid} valid, ${failures.length} failures`);
if (failures.length) { console.log(JSON.stringify(failures)); process.exitCode = 1; }
