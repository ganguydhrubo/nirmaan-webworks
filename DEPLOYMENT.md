# DEPLOYMENT.md

This repo is **deployment-ready, not deployed**. No live Cloudflare account, GitHub remote, or Resend account was available during this build. The business identity is real and confirmed (`webjobs.site` — see `config/site.ts` for the full record: name, domain, address, phone, and the `hhimanish@gmail.com` contact/enquiry address), so no brand-identity find-and-replace is needed before deploying — only real infrastructure accounts and secrets. Everything below is written so a competent developer with those accounts can go from this repo to a live site in well under 30 minutes.

## 0. Prerequisites

- A Cloudflare account (free tier is sufficient — see INFRASTRUCTURE.md for exactly what that covers).
- Ownership/DNS control of `webjobs.site` (or update `config/site.ts`, `wrangler.jsonc`, `wrangler.retry.jsonc`, and `astro.config.mjs`'s `site` field first if a different domain is actually being used for this launch).
- Node.js 20+, npm.
- A Resend account (free tier — see INFRASTRUCTURE.md).
- `npm install -g wrangler` or use the project's `npx wrangler`.

## 1. Install and authenticate

```
npm install
npx wrangler login
```

## 2. Create the D1 database

```
npx wrangler d1 create webjobs_site_leads
```

Copy the returned `database_id` into **both** `wrangler.jsonc` and `wrangler.retry.jsonc` (`d1_databases[0].database_id`), replacing `REPLACE_WITH_REAL_D1_DATABASE_ID` in each.

```
npm run db:migrate:remote
```

This applies `migrations/0001_init.sql` to the real database. Migrations are idempotent (every statement is `IF NOT EXISTS`) — safe to re-run.

## 3. Create Turnstile keys

Cloudflare dashboard → Turnstile → Add site. Use your real domain(s) as allowed hostnames. Copy the **Site Key** and **Secret Key**.

## 4. Set secrets (never in wrangler.jsonc, never committed)

```
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put IP_HASH_SALT      # any random 32+ byte hex string, e.g. `openssl rand -hex 32`
```

Also set the public Turnstile site key as a plain build-time env var (it's not secret — it's sent to the browser): add `PUBLIC_TURNSTILE_SITE_KEY` to your CI/build environment, or to `wrangler.jsonc`'s `vars` block if you prefer it versioned (it's safe to version — it's public by design).

For the retry worker, also set (it reads the same secrets, so repeat against its own Worker):

```
npx wrangler secret put RESEND_API_KEY --config wrangler.retry.jsonc
```

## 5. DNS — Resend domain verification (SPF/DKIM)

In the Resend dashboard, add and verify your sending domain. Resend will give you exact DNS records to add — typically:

| Type | Name | Value |
|---|---|---|
| TXT | `send.yourdomain.com` (or similar, per Resend's instructions) | SPF record Resend provides |
| CNAME/TXT ×2-3 | Resend's DKIM selectors | Resend provides these exactly — copy verbatim |

Do not guess these — copy them exactly from your Resend dashboard, since the selector/host values are account-specific. Wait for Resend to show "Verified" before sending real mail; unverified-domain sends will fail or land in spam.

## 6. Point your domain at Cloudflare / attach the custom domain

If your domain's nameservers aren't already on Cloudflare, add the zone and update nameservers at your registrar. Then, once the Worker is deployed (step 7), attach the custom domain via the Cloudflare dashboard → Workers & Pages → your worker → Settings → Domains & Routes → Add → your domain (and the `www` subdomain). Cloudflare issues and manages the TLS certificate automatically.

Set up the canonical redirect (pick one of www / non-www as canonical and redirect the other) via a Cloudflare Bulk Redirect or Page Rule — this is an edge-level concern outside the Worker itself.

## 7. Build and deploy the main site

```
npm run build
npx wrangler deploy
```

`npm run build` runs, in order: the config validator (fails loudly on a malformed `config/site.ts`), `astro check`, the client-script typecheck, then `astro build`. `wrangler deploy` reads `wrangler.jsonc` (or override with `--config`) and the just-built `dist/` output.

## 8. Deploy the retry worker (separate deploy, separate schedule)

```
npx wrangler deploy --config wrangler.retry.jsonc
```

Verify its Cron Trigger is active: Cloudflare dashboard → Workers & Pages → `webjobs-site-retry` → Triggers. It should show `*/30 * * * *`.

## 9. Analytics

Cloudflare Web Analytics: dashboard → Analytics & Logs → Web Analytics → Add site, paste the provided beacon script into `BaseLayout.astro` (or add it as a Cloudflare "Automatic setup" if your domain is on Cloudflare DNS — no code change needed in that case). This project also writes first-party conversion events (`whatsapp_click`, `enquiry_submit`, etc.) to D1 via `/api/analytics` regardless of whether Web Analytics is attached.

## 10. Smoke-test checklist (do this before telling anyone the site is live)

- [ ] `https://yourdomain.com/` loads, HTTPS, no console errors.
- [ ] `https://yourdomain.com/api/health` returns `{"ok":true,...}` — this confirms D1 and the email/Turnstile secrets are actually wired up in production, not just locally.
- [ ] Submit a real test enquiry through the live `/contact` form. Confirm: (a) the email arrives in the real inbox (check spam folder — if it lands there, recheck SPF/DKIM in the Resend dashboard), (b) the lead row exists in D1: `npx wrangler d1 execute webjobs_site_leads --remote --command "SELECT * FROM leads ORDER BY created_at DESC LIMIT 1"`.
- [ ] Submit with JavaScript disabled (browser dev tools → disable JS) — confirm the no-JS path still redirects to `/enquiry-received` on success.
- [ ] Open a wa.me link on a real Android phone, a real iPhone, and desktop — confirm the pre-filled text is correct and the number is right.
- [ ] Run Lighthouse (mobile, throttled) against the live homepage and one demo page; record the numbers in TESTING.md and `src/data/performance.ts` (see that file's comment — this is what makes the homepage's "Proof" section show real numbers instead of the honest placeholder).
- [ ] Validate structured data with Google's Rich Results Test against the live homepage and one `/industries/[slug]` page.
- [ ] Confirm `robots.txt` and `sitemap-index.xml` are reachable at the live domain.

## 11. Rollback

Cloudflare keeps prior Worker versions. To roll back: dashboard → Workers & Pages → your worker → Deployments → select a previous deployment → "Rollback to this version." For D1, there is no automatic rollback — migrations are additive/idempotent by design specifically so a bad deploy doesn't require a destructive database rollback; if a migration genuinely needs reversing, write a new `000X_*.sql` migration that undoes it rather than editing history.

## 12. Ongoing: keeping fonts/types in sync

- If you change any D1 binding, KV binding, or `vars` in `wrangler.jsonc`, re-run `npm run cf:typegen` (`wrangler types`) to regenerate `worker-configuration.d.ts` before the next `astro check`.
- To add a font for a future 7th demo (or change an existing one), use `scripts/fetch-google-fonts.mjs` — see its header comment for usage. Always subset to Latin **and** Latin Extended-A, not just Latin, or the ₹ sign will silently fall back to a different font.
