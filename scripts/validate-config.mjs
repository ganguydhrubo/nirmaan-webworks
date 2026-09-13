#!/usr/bin/env node
// Build-time config validator. Fails the build loudly (non-zero exit, named
// error) if a business-critical value in config/site.ts is missing or
// malformed. Runs before `astro build` (see package.json "build" script).
//
// This only checks values that are known at build time (config/site.ts is a
// plain TS module, not a secret). Runtime secrets (RESEND_API_KEY,
// TURNSTILE_SECRET_KEY) cannot be checked here because Cloudflare secrets do
// not exist at build time — those are validated at request time instead
// (see src/lib/config-validate.ts) so a missing secret produces a clear
// user-visible failure rather than a silent broken form.

import { pathToFileURL } from "node:url";
import path from "node:path";

const errors = [];

function fail(message) {
  errors.push(message);
}

async function main() {
  const configUrl = pathToFileURL(path.resolve(process.cwd(), "config/site.ts")).href;

  // Node can't import .ts directly without a loader; do a light-touch static
  // read + regex check instead of a full TS transpile, to keep this script
  // dependency-free and fast. Full type safety is already enforced by
  // `astro check` (part of the same npm build script) against config/site.ts's
  // exported types.
  const fs = await import("node:fs/promises");
  const src = await fs.readFile(path.resolve(process.cwd(), "config/site.ts"), "utf-8");

  const get = (key) => {
    const m = src.match(new RegExp(`${key}:\\s*"([^"]*)"`));
    return m?.[1];
  };

  const businessName = get("businessName");
  const phoneE164 = get("phoneE164");
  const whatsappNumber = get("whatsappNumber");
  const domain = get("domain");
  const primaryEmail = get("primaryEmail");

  if (!businessName || businessName.trim().length === 0) fail("config/site.ts: businessName is empty");
  if (!phoneE164 || !/^\+91[6-9]\d{9}$/.test(phoneE164)) fail(`config/site.ts: phoneE164 "${phoneE164}" is not a valid +91 Indian mobile number`);
  if (!whatsappNumber || !/^91[6-9]\d{9}$/.test(whatsappNumber)) fail(`config/site.ts: whatsappNumber "${whatsappNumber}" must be E.164 without "+" (e.g. 919876543210)`);
  if (!domain || !/^[a-z0-9-]+\.[a-z.]+$/i.test(domain)) fail(`config/site.ts: domain "${domain}" does not look like a valid domain`);
  if (!primaryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail)) fail(`config/site.ts: primaryEmail "${primaryEmail}" is not a valid email address`);

  // Cross-check: phoneE164 digits must match whatsappNumber digits.
  if (phoneE164 && whatsappNumber && phoneE164.replace("+", "") !== whatsappNumber) {
    fail(`config/site.ts: phoneE164 (${phoneE164}) and whatsappNumber (${whatsappNumber}) must be the same number`);
  }

  if (errors.length > 0) {
    console.error("\n✖ Build-time config validation failed:\n");
    for (const e of errors) console.error(`  - ${e}`);
    console.error("\nFix config/site.ts and re-run the build.\n");
    process.exit(1);
  }

  console.log(`✓ config/site.ts validated (business: "${businessName}")`);
  void configUrl;
}

main();
