import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/runtime-env";

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

/**
 * Domain Connect Discovery URL builder:
 * If the domain's DNS has TXT `_domainconnect.<domain>`, returns the 1-click authorize URL.
 */
async function checkDomainConnect(domain: string): Promise<string | null> {
  try {
    const doh = await fetch(`https://dns.google/resolve?name=_domainconnect.${encodeURIComponent(domain)}&type=TXT`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!doh.ok) return null;
    const data = (await doh.json()) as { Answer?: { data?: string }[] };
    const txt = data?.Answer?.[0]?.data?.replace(/^"(.*)"$/, "$1")?.trim();
    if (txt) {
      // Common Domain Connect service providers: GoDaddy, IONOS, Namecheap
      const url = txt.startsWith("http") ? txt : `https://${txt}`;
      return `${url}/v2/domainTemplates/providers/atittle.com/services/web-builder/apply?domain=${encodeURIComponent(domain)}`;
    }
  } catch {
    // fallback
  }
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: "Invalid JSON request." }, 400);
  }

  const rawDomain = String(body.domain || "").trim().toLowerCase();
  const slug = String(body.slug || "").trim();

  if (!rawDomain) {
    return json({ ok: false, message: "Please provide a valid domain name." }, 400);
  }

  const cleanDomain = rawDomain.replace(/^(?:https?:\/\/)?(?:www\.)?/, "").replace(/\/.*$/, "");
  if (!cleanDomain.includes(".") || cleanDomain.length < 4) {
    return json({ ok: false, message: "Please enter a valid domain (e.g. yourbusiness.com or yourbusiness.in)." }, 400);
  }

  const env = await getRuntimeEnv();
  const zoneId = String(env.CLOUDFLARE_ZONE_ID || "").trim();
  const apiToken = String(env.CLOUDFLARE_API_TOKEN || "").trim();

  let cfHostnameId: string | null = null;
  let cfStatus = "pending_dns";
  let cfSslStatus = "pending_validation";

  // Check Domain Connect 1-click support
  const domainConnectUrl = await checkDomainConnect(cleanDomain);

  // If Cloudflare zone is configured, register custom hostname with Cloudflare for SaaS API
  if (zoneId && apiToken) {
    try {
      const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostname: cleanDomain,
          ssl: {
            method: "http",
            type: "dv",
            settings: { min_tls_version: "1.2", http2: "on" },
          },
          custom_metadata: { slug },
        }),
      });

      const cfData = (await cfRes.json().catch(() => null)) as {
        success?: boolean;
        result?: { id?: string; status?: string; ssl?: { status?: string } };
      } | null;

      if (cfData?.success && cfData.result) {
        cfHostnameId = cfData.result.id || null;
        cfStatus = cfData.result.status || "active";
        cfSslStatus = cfData.result.ssl?.status || "active";
      }
    } catch (err) {
      console.warn("[builder/domain/connect] Cloudflare for SaaS provisioning notice:", err);
    }
  }

  const dnsRecords = [
    {
      type: "CNAME",
      name: cleanDomain.startsWith("www.") ? "www" : "@",
      value: "proxy.atittle.com",
      status: "required",
      description: "Points traffic to ATITTLE high-speed edge proxy",
    },
    {
      type: "A",
      name: "@",
      value: "172.67.180.12",
      status: "optional_apex",
      description: "Root apex record for registrars without CNAME flattening",
    },
  ];

  return json({
    ok: true,
    domain: cleanDomain,
    slug,
    status: domainConnectUrl ? "domain_connect_available" : "dns_setup_required",
    domainConnectUrl,
    customHostnameId: cfHostnameId,
    sslStatus: cfSslStatus,
    edgeStatus: cfStatus,
    dnsRecords,
    instructions: {
      step1: domainConnectUrl
        ? "Click '1-Click Connect' to authorize via GoDaddy / your registrar automatically."
        : "Log into your domain provider (GoDaddy, Namecheap, Hostinger, etc.).",
      step2: "Go to DNS Management and add the CNAME record above.",
      step3: "Once saved, verification and SSL certificate activate automatically within a few minutes.",
    },
  });
};
