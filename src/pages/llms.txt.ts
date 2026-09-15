import type { APIRoute } from "astro";
import { siteConfig } from "@config/site";

export const prerender = true;

// Generated from config/site.ts, not hand-maintained — this drifted stale
// three times as a static file (industry count went 6 -> 9 -> 15, starting
// price changed) before being made to read from the same single source of
// truth as the rest of the site. See RESEARCH.md / RESEARCH-DEMO-EXPANSION.md
// for how the industry list was chosen.
function formatInr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

const industryLines = siteConfig.industryRegistry.map((i) => `- [${i.name}](${siteConfig.siteUrl}/industries/${i.slug})`).join("\n");
const starter = siteConfig.priceRanges.find((p) => p.id === "starter")!;
const demoCount = siteConfig.demoRegistry.length;
const demoCountWord = demoCount === 15 ? "Fifteen" : String(demoCount);

const body = `# ${siteConfig.businessName}

> ${siteConfig.domain} is a web design and development studio based in ${siteConfig.address.city}, India, building fast, mobile-first websites for Indian small and medium businesses — ${siteConfig.industryRegistry.map((i) => i.shortName.toLowerCase()).join(", ")} — with transparent INR pricing and a WhatsApp-first response commitment.

${siteConfig.domain} does not build login systems, user accounts, or payment checkouts, and does not guarantee specific search-engine rankings. Pricing starts around ${formatInr(starter.priceMinInr)} for a brochure site and scales with scope; exact quotes are given after a short scoping conversation.

## Company

- [About](${siteConfig.siteUrl}/about): who runs ${siteConfig.domain} and how projects are scoped and delivered
- [Pricing](${siteConfig.siteUrl}/pricing): starting price bands in INR, what's included and excluded per tier
- [Our process](${siteConfig.siteUrl}/work-process): the week-by-week sequence from enquiry to launch
- [FAQ](${siteConfig.siteUrl}/faq): direct answers on cost, timeline, ownership, hosting, and support
- [Contact](${siteConfig.siteUrl}/contact): enquiry form, phone, WhatsApp and email

## Industries served

${industryLines}

## Demos

${demoCountWord} full working demo websites, one per industry above, built for fictional example businesses to demonstrate design and engineering quality (index: [/demos](${siteConfig.siteUrl}/demos)). These are not real, currently-operating companies.

## Tools

- [AI Website Evaluator](${siteConfig.siteUrl}/tools/website-evaluator): a free tool that scores whether a business's existing website copy reflects its genuine trade craft, across value proposition, industry authenticity, trust signals, pricing transparency, and mobile actionability.

## Policies

- [Privacy policy](${siteConfig.siteUrl}/privacy)
- [Terms of service](${siteConfig.siteUrl}/terms)
- [Refund policy](${siteConfig.siteUrl}/refund-policy)
`;

export const GET: APIRoute = () => {
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
