import { siteConfig as config } from '../config/site.ts';
import fs from 'node:fs/promises';
try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const preview = process.argv.includes('--preview');
const errors = [];
if (!config.businessName.trim()) errors.push('businessName is required');
if (!/^91[6-9]\d{9}$/.test(config.whatsappNumber)) errors.push('whatsappNumber must use Indian E.164 format without +');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.primaryEmail)) errors.push('primaryEmail is invalid');
if (!preview) {
  if (config.isPlaceholderIdentity) errors.push('isPlaceholderIdentity is true: supply verified business name, address, phone, email and domain in config/site.ts');
  if (process.env.EMAIL_PROVIDER !== 'resend') errors.push('EMAIL_PROVIDER must be resend for this production implementation');
  for (const key of ['RESEND_API_KEY','TURNSTILE_SECRET_KEY','PUBLIC_TURNSTILE_SITE_KEY','IP_HASH_SALT']) {
    const value = process.env[key];
    if (!value || /xxxxx|change-me|^1x0000/.test(value)) errors.push(`${key} must be a real production value`);
  }
  if ((process.env.IP_HASH_SALT?.length ?? 0) < 32) errors.push('IP_HASH_SALT must contain at least 32 random characters');
  const wrangler = await fs.readFile('wrangler.jsonc','utf8');
  if (wrangler.includes('REPLACE_WITH_REAL')) errors.push('wrangler.jsonc: real D1 database_id is required');
}
if (errors.length) { console.error(errors.map(e => `CONFIG ERROR: ${e}`).join('\n')); process.exit(1); }
console.log(preview ? 'Local preview config checked; production identity and secrets NOT verified.' : 'Production config checks passed. Verify DNS and inbox delivery before release.');
