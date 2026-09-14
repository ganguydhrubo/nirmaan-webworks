import fs from 'node:fs/promises';
for (const [slug,name] of [['shivalik-homes','shivalik'],['ivory-smiles','ivory'],['manthan-institute','manthan'],['anaar-awadhi-table','anaar']]) {
 const p = `src/pages/demos/${slug}/index.astro`;
 let s = await fs.readFile(p,'utf8');
 if (!s.includes('import DemoPhoto')) s = s.replace('import DemoLayout','import DemoPhoto from "@/components/ui/DemoPhoto.astro";\nimport DemoLayout').replace('</section>',`</section>\n    <DemoPhoto name="${name}" />`);
 await fs.writeFile(p,s.replaceAll('🪔 ',''));
}
const header = 'src/pages/demos/anaar-awadhi-table/_components/Header.astro';
let s = await fs.readFile(header,'utf8');
s = s.replace('import { siteConfig } from "@config/site";','').replace('import { waLink } from "@/lib/contact-links";','').replace('const reserveMessage = "Hi Anaar, I\'d like to enquire about a table reservation.";','').replace('href={waLink(reserveMessage)}','href="/demos/anaar-awadhi-table/reservations"').replace('data-analytics-event="whatsapp_click"','data-analytics-event="cta_click"');
await fs.writeFile(header,s);
await fs.writeFile('src/scripts/demos/anaar-awadhi-table-reservation.ts',`const form = document.querySelector<HTMLFormElement>('[data-reservation-form]');
form?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const result = form.querySelector('[data-reservation-result]');
  if (result) result.textContent = data.get('guests') + ' guests on ' + data.get('date') + ' at ' + data.get('time') + ' IST. A real restaurant would confirm availability next. Demo only: no table reserved and no information sent.';
});
export {};
`);
const retry = 'workers/retry-worker.ts';
await fs.writeFile(retry,(await fs.readFile(retry,'utf8')).replace("created_at < datetime('now', '-5 minutes')", "datetime(created_at) < datetime('now', '-5 minutes')"));
s = await fs.readFile('config/site.ts','utf8');
if (!s.includes('const whatsappNumber')) s = s.replace('export const siteConfig = {','const whatsappNumber = "919876543210";\n\nexport const siteConfig = {').replace('phoneDisplay: "+91 98765 43210",','phoneDisplay: `+${whatsappNumber.slice(0,2)} ${whatsappNumber.slice(2,7)} ${whatsappNumber.slice(7)}`,').replace('phoneE164: "+919876543210",','phoneE164: `+${whatsappNumber}`,').replace('whatsappNumber: "919876543210",','whatsappNumber,');
await fs.writeFile('config/site.ts',s.replace('"Unlimited standard pages"','"Page count agreed in the written scope"').replace('a add-on','an add-on'));
