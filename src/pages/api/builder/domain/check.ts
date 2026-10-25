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

  // Real-time DNS lookup check (Google DNS over HTTPS)
  let isAvailable = true;
  try {
    const dohRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(primaryDomain)}&type=A`, {
      headers: { Accept: "application/dns-json" },
    });
    if (dohRes.ok) {
      const doh = (await dohRes.json()) as { Status?: number; Answer?: unknown[] };
      // Status 0 with Answer means domain is registered and has A records
      if (doh.Status === 0 && doh.Answer && doh.Answer.length > 0) {
        isAvailable = false;
      }
    }
  } catch {
    // network fallback
    isAvailable = true;
  }

  // Suggested alternative TLDs
  const alternatives = ["in", "com", "store", "co"]
    .filter((ext) => ext !== tld)
    .map((ext) => {
      const altDomain = `${sld}.${ext}`;
      return {
        domain: altDomain,
        tld: ext,
        available: true,
        priceInr: TLD_PRICES[ext] ?? 899,
      };
    });

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
