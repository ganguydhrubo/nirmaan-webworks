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
 * Standard Pricing Structure for ATITTLE Website Builder:
 * - download: Flat ₹499 (Website building source code + unlimited usage)
 * - host: ₹750 (Direct ATITTLE Edge Cloudflare hosting + free SSL + 1 yr)
 * - domain: ₹1,000 (Flat ₹499 build + Custom domain .com/.in + hosting + 1 yr)
 */
export const PRICING_PLANS = {
  download: {
    id: "download",
    name: "Download Website Source Code",
    amountInr: 499,
    description: "Complete production HTML/CSS ZIP archive. Yours forever, self-host anywhere.",
  },
  host: {
    id: "host",
    name: "Direct Fast Hosting with ATITTLE",
    amountInr: 750,
    description: "Ultra-fast Cloudflare Edge Worker hosting, automatic SSL, 99.99% uptime for 1 year.",
  },
  domain: {
    id: "domain",
    name: "Custom Domain Included + Fast Hosting",
    amountInr: 1000,
    description: "Flat ₹499 website build + your custom domain (.in / .com) registered & live instantly.",
  },
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: "Invalid JSON request." }, 400);
  }

  const planId = (String(body.plan || "download").trim().toLowerCase()) as keyof typeof PRICING_PLANS;
  const plan = PRICING_PLANS[planId] || PRICING_PLANS.download;
  const domain = body.domain ? String(body.domain).trim() : undefined;
  const siteName = body.siteName ? String(body.siteName).trim() : "My Website";

  const env = await getRuntimeEnv();
  const keyId = String(env.RAZORPAY_KEY_ID || env.PUBLIC_RAZORPAY_KEY_ID || "").trim() || "rzp_test_placeholder";
  const keySecret = String(env.RAZORPAY_KEY_SECRET || "").trim();

  const amountPaise = plan.amountInr * 100;
  let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // If live Razorpay credentials exist, create order via Razorpay API
  if (keyId && keySecret && keyId !== "rzp_test_placeholder") {
    try {
      const auth = btoa(`${keyId}:${keySecret}`);
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `rcpt_${Date.now().toString().slice(-8)}`,
          notes: {
            plan: plan.id,
            domain: domain || "",
            siteName,
          },
        }),
      });

      const rzpData = (await rzpRes.json().catch(() => null)) as { id?: string } | null;
      if (rzpData?.id) {
        orderId = rzpData.id;
      }
    } catch (err) {
      console.warn("[builder/order] Razorpay API warning:", err);
    }
  }

  return json({
    ok: true,
    plan: plan.id,
    planName: plan.name,
    amountInr: plan.amountInr,
    amountPaise,
    currency: "INR",
    orderId,
    keyId,
    isPlaceholder: keyId === "rzp_test_placeholder",
    description: plan.description,
    domain,
    notes: {
      flatBuildCharge: 499,
      domainChargeIncluded: planId === "domain",
    },
  });
};
