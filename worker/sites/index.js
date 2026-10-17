/**
 * ATITTLE Sites — serves websites published from the ATITTLE AI Website Builder.
 *
 *   https://<worker>.<account>.workers.dev/<slug>/            → index.html
 *   https://<worker>.<account>.workers.dev/<slug>/about.html  → about.html
 *
 * Storage: Workers KV binding `SITES`. Key `site:<slug>` holds the exact
 * STORE-method ZIP that the builder's export produces (the same files a
 * visitor gets from "Download Website"); its KV metadata carries the content
 * version. One KV write per publish keeps the free plan's 1,000 writes/day
 * meaningful. The Worker is read-only: publishing happens from the ATITTLE
 * backend through the Cloudflare API, so this script has no write surface.
 *
 * Safety: published pages are static HTML/CSS rendered server-side by ATITTLE
 * (no user scripts). Every response still carries a CSP that forbids scripts,
 * framing and plugins, nosniff, and — by default — noindex. See
 * docs/AI-WEBSITE-BUILDER.md § Publishing.
 */

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

const TYPES = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export const CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "form-action https:",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

function baseHeaders(env) {
  const h = new Headers({
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
  });
  if (env.NOINDEX !== "0") h.set("X-Robots-Tag", "noindex");
  return h;
}

function page(env, status, title, body) {
  const h = baseHeaders(env);
  h.set("Content-Type", TYPES.html);
  h.set("Cache-Control", "no-store");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px/1.55 system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:0 20px;color:#16110d;background:#fbf6ee}a{color:#9a3b1f}h1{font-size:1.6rem}</style></head>
<body><h1>${title}</h1>${body}<p><a href="https://atittle.com/free-website-builder">Build your own free website with ATITTLE →</a></p></body></html>`;
  return new Response(html, { status, headers: h });
}

/**
 * Find one file in a STORE-only ZIP via its central directory (no
 * decompression, no copying of other files). Returns null if absent.
 */
export function findInZip(bytes, wanted) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory: last 22 bytes (the builder writes no ZIP comment).
  const eocd = bytes.length - 22;
  if (eocd < 0 || dv.getUint32(eocd, true) !== 0x06054b50) return null;
  const count = dv.getUint16(eocd + 10, true);
  let pos = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let i = 0; i < count && pos + 46 <= bytes.length; i++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) return null;
    const method = dv.getUint16(pos + 10, true);
    const size = dv.getUint32(pos + 20, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const local = dv.getUint32(pos + 42, true);
    const name = dec.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    if (name === wanted) {
      if (method !== 0 || local + 30 > bytes.length || dv.getUint32(local, true) !== 0x04034b50) return null;
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      if (start + size > bytes.length) return null;
      return bytes.subarray(start, start + size);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function isSafePath(path) {
  return path.length <= 200 && path.split("/").every((s) => SEGMENT_RE.test(s) && s !== "." && s !== "..");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    if (url.pathname === "/_health") return new Response("ok", { headers: { "Cache-Control": "no-store" } });
    if (url.pathname === "/robots.txt") {
      const h = baseHeaders(env);
      h.set("Content-Type", TYPES.txt);
      return new Response(env.NOINDEX !== "0" ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n", { headers: h });
    }
    if (url.pathname === "/" || url.pathname === "") {
      const abuse = env.ABUSE_EMAIL ? `<p>To report a site that breaks the rules, email <a href="mailto:${env.ABUSE_EMAIL}">${env.ABUSE_EMAIL}</a> with its link.</p>` : "";
      return page(env, 200, "Websites made with ATITTLE", `<p>This address hosts free websites that small businesses built with the ATITTLE AI Website Builder.</p>${abuse}`);
    }

    const [, slug = "", ...rest] = url.pathname.split("/");
    if (!SLUG_RE.test(slug)) return page(env, 404, "Website not found", "<p>There is no website at this address.</p>");
    if (rest.length === 0) return Response.redirect(`${url.origin}/${slug}/${url.search}`, 301);

    let file = rest.join("/");
    if (file === "" || file.endsWith("/")) file += "index.html";
    if (!isSafePath(file)) return page(env, 404, "Page not found", "<p>This page doesn't exist on this website.</p>");
    if (!file.includes(".")) file += ".html"; // /slug/about → about.html

    const { value, metadata } = await env.SITES.getWithMetadata(`site:${slug}`, { type: "arrayBuffer" });
    if (!value) return page(env, 404, "Website not found", "<p>There is no website at this address. It may have been taken offline by its owner.</p>");
    const data = findInZip(new Uint8Array(value), file);
    if (!data) return page(env, 404, "Page not found", `<p>This page doesn't exist on this website. <a href="/${slug}/">Go to its home page</a>.</p>`);

    const version = (metadata && typeof metadata.v === "string" && metadata.v) || "0";
    const etag = `"${version}"`;
    const h = baseHeaders(env);
    const ext = file.slice(file.lastIndexOf(".") + 1).toLowerCase();
    h.set("Content-Type", TYPES[ext] || "application/octet-stream");
    h.set("Cache-Control", ext === "html" ? "public, max-age=0, must-revalidate" : "public, max-age=300");
    h.set("ETag", etag);
    h.set("X-Atittle-Version", version);
    if (ext === "html") h.set("X-Atittle-Site", slug);
    if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers: h });
    return new Response(request.method === "HEAD" ? null : data.slice(), { status: 200, headers: h });
  },
};
