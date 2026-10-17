/**
 * Option lists for the builder's AI brief form. Kept free of zod so the
 * browser editor can import them without bundling the validator (the server
 * validates with briefSchema in ai.ts).
 */
export const WEBSITE_TYPES = [
  { id: "small-business", label: "Small business / shop" },
  { id: "local-service", label: "Local service (plumber, tutor, salon…)" },
  { id: "restaurant", label: "Restaurant or café" },
  { id: "consultant", label: "Consultant / advisor" },
  { id: "freelancer", label: "Freelancer" },
  { id: "portfolio", label: "Portfolio" },
  { id: "agency", label: "Agency" },
  { id: "personal-brand", label: "Personal brand / coach / creator" },
  { id: "startup", label: "Startup / app landing page" },
  { id: "product", label: "Single product or service" },
  { id: "other", label: "Something else" },
] as const;

export const WEBSITE_GOALS = [
  { id: "enquiries", label: "Get calls and enquiries" },
  { id: "bookings", label: "Get bookings or appointments" },
  { id: "showcase", label: "Show my work" },
  { id: "sell", label: "Sell a product or service" },
  { id: "signups", label: "Collect sign-ups" },
  { id: "inform", label: "Share information" },
] as const;

export const PAGE_OPTIONS = ["About", "Services", "Pricing", "Gallery", "FAQ", "Contact"] as const;

export interface BriefShape {
  businessName: string;
  websiteType: string;
  description: string;
  audience: string;
  style: string;
  goal: string;
  pages: (typeof PAGE_OPTIONS)[number][];
  brandColor: string;
  contact: { email: string; phone: string; whatsapp: string; address: string };
}
