import fs from 'node:fs/promises';
import sharp from 'sharp';

const images = [
  ['kayal', 'https://unsplash.com/photos/tropical-resort-buildings-on-a-calm-waterway-gMcF8QoXCkk', 'Lens Fables', 'Unsplash'],
  ['anaar', 'https://unsplash.com/photos/a-white-bowl-filled-with-rice-and-meat-ysmeQt1dzcw', 'Mario Raj', 'Unsplash'],
  ['ivory', 'https://www.pexels.com/photo/a-dental-equipment-in-the-clinic-6812453/', 'Pavel Danilyuk', 'Pexels', '6812453'],
  ['sanjeevani', 'https://www.pexels.com/photo/doctor-office-table-desk-and-black-chair-with-stethoscope-and-white-paper-15195276/', 'Ercan Şenkaya', 'Pexels', '15195276'],
  ['shivalik', 'https://www.pexels.com/photo/modern-residential-building-next-to-the-street-in-city-16072809/', 'Eyecon Design', 'Pexels', '16072809'],
  ['manthan', 'https://www.pexels.com/photo/shelves-full-of-books-12124094/', 'Lisa from Pexels', 'Pexels', '12124094'],
];
await fs.mkdir('src/assets/demos', { recursive: true });
const manifest = [];
for (const [name, source, author, license, id] of images) {
  let url;
  if (id) url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;
  else {
    const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${name}: source ${response.status}`);
    const html = await response.text();
    url = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    if (!url) throw new Error(`${name}: no source image found`);
    const u = new URL(url); u.searchParams.set('w', '1400'); u.searchParams.set('q', '85'); url = u.href;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: image ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await sharp(bytes).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(`src/assets/demos/${name}.jpg`);
  manifest.push({ name, source, author, license, downloaded: new Date().toISOString().slice(0,10), url });
  console.log(`Saved ${name}`);
}
await fs.writeFile('src/assets/demos/credits.json', JSON.stringify(manifest, null, 2));
