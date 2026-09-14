import { siteConfig as config } from '../config/site.ts';
import fs from 'node:fs/promises';
try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const preview = process.argv.includes('--preview');
// Vercel sets this in its own build environment automatically. This repo
// deploys to two different targets (see ARCHITECTURE.md / astro.config.mjs)
// with genuinely different infrastructure available — a D1 database_id can
// never exist on Vercel, so demanding one there isn't a safety check, it's a
// permanently-failing build. Warnings still print so a missing Resend/
// Turnstile key isn't silently forgotten; they just don't block the build,
// because the enquiry pipeline is deliberately built to degrade gracefully
// without them rather than needing a hard gate here (see api/enquiry.ts).
const isVercel = !!process.env.VERCEL;
const errors = [];
const warnings = [];
if (!config.businessName.trim()) errors.push('businessName is required');
if (!/^91[6-9]\d{9}$/.test(config.whatsappNumber)) errors.push('whatsappNumber must use Indian E.164 format without +');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.primaryEmail)) errors.push('primaryEmail is invalid');
if (!preview) {
  if (config.isPlaceholderIdentity) errors.push('isPlaceholderIdentity is true: supply verified business name, address, phone, email and domain in config/site.ts');

  const secretChecks = () => {
    if (process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER !== 'resend') errors.push('EMAIL_PROVIDER must be resend for this production implementation');
    for (const key of ['RESEND_API_KEY', 'TURNSTILE_SECRET_KEY', 'PUBLIC_TURNSTILE_SITE_KEY', 'IP_HASH_SALT']) {
      const value = process.env[key];
      const missing = !value || /xxxxx|change-me|^1x0000/.test(value);
      if (missing) (isVercel ? warnings : errors).push(`${key} must be a real production value`);
    }
    if ((process.env.IP_HASH_SALT?.length ?? 0) > 0 && (process.env.IP_HASH_SALT?.length ?? 0) < 32) {
      errors.push('IP_HASH_SALT must contain at least 32 random characters');
    }
  };
  secretChecks();

  if (!isVercel) {
    const wrangler = await fs.readFile('wrangler.jsonc', 'utf8');
    if (wrangler.includes('REPLACE_WITH_REAL')) errors.push('wrangler.jsonc: real D1 database_id is required');
  } else {
    warnings.push('Deploying to Vercel: no D1 database on this platform — leads will be email-only (not persisted) until this project also has a Cloudflare D1 database, or a different persistence layer is wired up for Vercel specifically. See ARCHITECTURE.md.');
  }
}
if (warnings.length) console.warn(warnings.map((w) => `CONFIG WARNING: ${w}`).join('\n'));
if (errors.length) { console.error(errors.map(e => `CONFIG ERROR: ${e}`).join('\n')); process.exit(1); }
console.log(preview ? 'Local preview config checked; production identity and secrets NOT verified.' : 'Production config checks passed. Verify DNS and inbox delivery before release.');
