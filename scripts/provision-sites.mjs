#!/usr/bin/env node
/**
 * One-time (idempotent) setup of ATITTLE's site-hosting Worker on Cloudflare:
 *   1. verify the API token
 *   2. check the account has a workers.dev subdomain
 *   3. create (or reuse) the KV namespace "atittle-sites"
 *   4. upload worker/sites/index.js as the Worker "atittle-sites" with the KV binding
 *   5. enable its workers.dev URL and health-check it
 * Then it prints the non-secret values to configure (SITES_KV_NAMESPACE_ID,
 * SITES_BASE_URL) and, with --write, appends them to .dev.vars.
 *
 * Credentials are read from the environment or the gitignored .dev.vars —
 * never from arguments — and are never printed.
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (needs: Workers Scripts:Edit,
 *   Workers KV Storage:Edit, Account Settings:Read)
 *
 * Usage: node scripts/provision-sites.mjs [--write] [--abuse-email=you@example.com]
 */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKER = "atittle-sites";
const NAMESPACE_TITLE = "atittle-sites";
const args = process.argv.slice(2);
const write = args.includes("--write");
const abuseEmail = (args.find((a) => a.startsWith("--abuse-email=")) ?? "").split("=")[1] ?? "";

function loadEnv() {
  const env = { ...process.env };
  const file = path.join(root, ".dev.vars");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i > 0 && !line.startsWith("#") && env[line.slice(0, i)] === undefined) env[line.slice(0, i)] = line.slice(i + 1);
    }
  }
  return env;
}

const env = loadEnv();
const ACCOUNT = env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT || !TOKEN) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN (environment or .dev.vars).");
  process.exit(1);
}

async function cf(method, p, body, headers = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${p}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && json.success !== false, result: json.result, errors: (json.errors ?? []).map((e) => `${e.code}: ${e.message}`) };
}

function fail(step, r) {
  console.error(`✗ ${step} failed (${r.status}): ${r.errors.join("; ") || "unknown error"}`);
  process.exit(1);
}

// 1. token
const v = await cf("GET", `/accounts/${ACCOUNT}/tokens/verify`);
if (!v.ok || v.result?.status !== "active") fail("Token check", v);
console.log("✓ API token is active");

// 2. workers.dev subdomain
const sub = await cf("GET", `/accounts/${ACCOUNT}/workers/subdomain`);
if (!sub.ok || !sub.result?.subdomain) {
  console.error("✗ This Cloudflare account has no workers.dev subdomain yet.");
  console.error("  Open https://dash.cloudflare.com → Workers & Pages once (it creates one automatically), then run this again.");
  process.exit(2);
}
const subdomain = sub.result.subdomain;
console.log(`✓ workers.dev subdomain: ${subdomain}.workers.dev`);

// 3. KV namespace
const list = await cf("GET", `/accounts/${ACCOUNT}/storage/kv/namespaces?per_page=100`);
if (!list.ok) fail("Listing KV namespaces", list);
let ns = list.result.find((n) => n.title === NAMESPACE_TITLE);
if (!ns) {
  const created = await cf("POST", `/accounts/${ACCOUNT}/storage/kv/namespaces`, { title: NAMESPACE_TITLE });
  if (!created.ok) fail("Creating KV namespace", created);
  ns = created.result;
  console.log(`✓ Created KV namespace ${NAMESPACE_TITLE}`);
} else console.log(`✓ Reusing KV namespace ${NAMESPACE_TITLE}`);

// 4. Worker script (ES module) with the KV binding
const source = readFileSync(path.join(root, "worker/sites/index.js"), "utf8");
const metadata = {
  main_module: "index.js",
  compatibility_date: "2026-09-01",
  bindings: [
    { type: "kv_namespace", name: "SITES", namespace_id: ns.id },
    { type: "plain_text", name: "NOINDEX", text: env.SITES_NOINDEX === "0" ? "0" : "1" },
    ...(abuseEmail ? [{ type: "plain_text", name: "ABUSE_EMAIL", text: abuseEmail }] : []),
  ],
};
const form = new FormData();
form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.set("index.js", new Blob([source], { type: "application/javascript+module" }), "index.js");
const up = await cf("PUT", `/accounts/${ACCOUNT}/workers/scripts/${WORKER}`, form);
if (!up.ok) fail("Uploading Worker", up);
console.log(`✓ Uploaded Worker ${WORKER}`);

// 5. workers.dev route
const route = await cf("POST", `/accounts/${ACCOUNT}/workers/scripts/${WORKER}/subdomain`, { enabled: true, previews_enabled: false });
if (!route.ok) fail("Enabling workers.dev URL", route);
const baseUrl = `https://${WORKER}.${subdomain}.workers.dev`;
let healthy = false;
for (let i = 0; i < 20 && !healthy; i++) {
  try {
    const r = await fetch(`${baseUrl}/_health`, { cache: "no-store" });
    healthy = r.ok && (await r.text()) === "ok";
  } catch {}
  if (!healthy) await new Promise((r) => setTimeout(r, 3000));
}
console.log(healthy ? `✓ Worker is live at ${baseUrl}` : `! Worker uploaded but ${baseUrl}/_health isn't answering yet (new workers.dev URLs can take a minute).`);

console.log("\nConfigure these (not secret):");
console.log(`  SITES_KV_NAMESPACE_ID=${ns.id}`);
console.log(`  SITES_BASE_URL=${baseUrl}`);
if (write) {
  const file = path.join(root, ".dev.vars");
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = [];
  if (!/^SITES_KV_NAMESPACE_ID=/m.test(current)) lines.push(`SITES_KV_NAMESPACE_ID=${ns.id}`);
  if (!/^SITES_BASE_URL=/m.test(current)) lines.push(`SITES_BASE_URL=${baseUrl}`);
  if (lines.length) appendFileSync(file, (current.endsWith("\n") || !current ? "" : "\n") + lines.join("\n") + "\n");
  console.log(lines.length ? "✓ Added them to .dev.vars" : "✓ .dev.vars already has them");
}
