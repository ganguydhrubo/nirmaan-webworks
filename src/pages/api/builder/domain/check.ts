import type { APIRoute } from "astro";

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/** Supported TLD price schedule (INR / year) */
const TLD_PRICES: Record<string, number> = {
  in: 499,
  com: 1099,
  store: 299,
  co: 999,
  org: 1199,
  io: 3499,
  net: 1199,
};

/** Authoritative real-time ICANN RDAP + DNS check */
async function isDomainTaken(domain: string): Promise<boolean> {
  // 1. Try ICANN RDAP standard protocol
  try {
    const rdapRes = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { "User-Agent": "ATITTLE-Domain-Engine/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (rdapRes.status === 200) return true; // Domain is registered
    if (rdapRes.status === 404) return false; // Domain is available
  } catch {
    // network timeout, fall through to DNS
  }

  // 2. DNS-over-HTTPS fallback (Google DNS)
  try {
    const dohRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(3000),
    });
    if (dohRes.ok) {
      const doh = (await dohRes.json()) as { Status?: number; Answer?: unknown[] };
      if (doh.Status === 0 && doh.Answer && doh.Answer.length > 0) {
        return true;
      }
    }
  } catch {
    // fallback
  }

  return false;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("query") || url.searchParams.get("domain") || "").trim().toLowerCase();

  if (!rawQuery) {
    return json({ ok: false, message: "Please provide a domain to search." }, 400);
  }

  // Clean domain input (strip protocol, www, trailing slashes)
  const clean = rawQuery.replace(/^(?:https?:\/\/)?(?:www\.)?/, "").replace(/\/.*$/, "");
  const parts = clean.split(".");
  const sld = parts[0] || "mybusiness";
  const tld = parts.length > 1 ? parts.slice(1).join(".") : "in";

  const primaryDomain = `${sld}.${tld}`;
  const primaryPrice = TLD_PRICES[tld] ?? 899;

  // Real-time authoritative check
  const taken = await isDomainTaken(primaryDomain);
  const isAvailable = !taken;

  // Check top alternative TLDs in parallel
  const targetTlds = ["in", "com", "store", "co"].filter((ext) => ext !== tld);
  const alternatives = await Promise.all(
    targetTlds.map(async (ext) => {
      const altDomain = `${sld}.${ext}`;
      const altTaken = await isDomainTaken(altDomain);
      return {
        domain: altDomain,
        tld: ext,
        available: !altTaken,
        priceInr: TLD_PRICES[ext] ?? 899,
      };
    })
  );

  return json({
    ok: true,
    query: clean,
    primary: {
      domain: primaryDomain,
      tld,
      available: isAvailable,
      priceInr: primaryPrice,
      period: "1 year",
    },
    alternatives,
  });
};
