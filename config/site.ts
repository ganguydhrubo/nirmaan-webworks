/**
 * config/site.ts — the ONLY place non-secret business facts live.
 *
 * This is the real, live business identity for atittle.com. Every
 * component/page/email template imports from here — changing the business
 * name, phone, WhatsApp number, email or address is a one-line edit in this
 * file, not a find-and-replace across the codebase.
 *
 * Secrets (API keys, tokens) do NOT belong in this file — see .env.example.
 */

export type BuyerIntent = "new-website" | "redesign" | "ecommerce" | "landing-page" | "not-sure";

export interface WhatsAppTemplates {
  header: string;
  heroSecondary: string;
  mobileStickyBar: string;
  enquiryForm: string;
  footer: string;
  demoGeneric: (demoName: string) => string;
  industryPage: (industryName: string) => string;
  postEnquiryConfirmation: (name: string, category: string) => string;
}

export interface PriceBand {
  id: string;
  name: string;
  priceMinInr: number;
  priceMaxInr: number;
  bestFor: string;
  includes: string[];
  excludes: string[];
  indicativeTimelineWeeks: [number, number];
}

export interface IndustryRegistryEntry {
  slug: string;
  name: string;
  shortName: string;
  demoSlug: string;
  metaTitle: string;
  metaDescription: string;
  heroQuestion: string;
}

export interface DemoRegistryEntry {
  slug: string;
  businessName: string;
  industrySlug: string;
  tagline: string;
  city: string;
  noindex: true;
}

const whatsappNumber = "919330393298";

export const siteConfig = {
  businessName: "ATITTLE",
  legalEntityName: "ATITTLE",
  isPlaceholderIdentity: false,
  tagline: "Websites that move your world.",
  shortDescription:
    "We design and build fast, mobile-first websites for Indian shops, clinics, restaurants, jewellers, builders and studios, priced and explained in plain rupees.",
  domain: "atittle.com",
  siteUrl: "https://atittle.com",

  primaryEmail: "hhimanish@gmail.com",
  leadNotificationEmail: "hhimanish@gmail.com",
  supportEmail: "hhimanish@gmail.com",

  phoneDisplay: `+${whatsappNumber.slice(0,2)} ${whatsappNumber.slice(2,7)} ${whatsappNumber.slice(7)}`,
  phoneE164: `+${whatsappNumber}`,
  whatsappNumber,

  address: {
    line1: "Astra Towers, Newtown",
    city: "Kolkata",
    state: "West Bengal",
    pin: "700161",
    country: "India",
    countryCode: "IN",
  },

  serviceAreas: ["Kolkata", "Newtown", "West Bengal", "Pan-India (remote delivery)"],

  businessHours: {
    display: "Mon–Sat, 10:00 AM – 7:00 PM IST",
    timezone: "Asia/Kolkata",
  },

  responseCommitment: "We reply to every enquiry within one business day.",

  gstNote:
    "GST is charged extra as applicable, shown separately on every quote. Registration and GSTIN details are shared on request during the enquiry process.",

  socialLinks: [] as { platform: string; url: string }[],

  priceRanges: [
    {
      id: "starter",
      name: "Starter Brochure Site",
      priceMinInr: 25000,
      priceMaxInr: 45000,
      bestFor: "A single business that needs one clean, mobile-first site with clear contact and WhatsApp",
      includes: [
        "Up to 5 pages (home, about, services, gallery, contact)",
        "Mobile-first responsive design",
        "WhatsApp, call and map integration",
        "Basic on-page SEO and Google Business Profile guidance",
        "1 round of design revisions",
      ],
      excludes: ["Custom illustration or animation", "E-commerce/online ordering", "Multi-language content"],
      indicativeTimelineWeeks: [2, 3] as [number, number],
    },
    {
      id: "business",
      name: "Business Website",
      priceMinInr: 45000,
      priceMaxInr: 90000,
      bestFor: "A growing business that needs a catalogue, booking or enquiry flow, and stronger SEO",
      includes: [
        "Up to 12 pages, including category/service pages",
        "Booking or enquiry forms with WhatsApp handoff",
        "Image gallery and testimonials layout",
        "Structured data (schema.org) for search",
        "2 rounds of design revisions",
      ],
      excludes: ["Payment gateway/checkout", "Custom backend/admin dashboard"],
      indicativeTimelineWeeks: [3, 5] as [number, number],
    },
    {
      id: "custom",
      name: "Custom / E-commerce Build",
      priceMinInr: 90000,
      priceMaxInr: 200000,
      bestFor: "A business that needs online ordering, a large catalogue, or custom functionality",
      includes: [
        "Page count agreed in the written scope",
        "Online catalogue or ordering flow",
        "Custom calculators/tools where useful (e.g. EMI, quote estimator)",
        "Performance and accessibility audit before launch",
        "3 rounds of design revisions",
      ],
      excludes: ["Ongoing content writing after launch (available as an add-on)"],
      indicativeTimelineWeeks: [5, 9] as [number, number],
    },
  ] satisfies PriceBand[],

  maintenanceMonthlyInr: { min: 4000, max: 8000 },

  whatsappMessageTemplates: {
    header: "Hi, I'd like to talk about a website for my business.",
    heroSecondary: "Hi, I found your site and I'd like to know more about getting a website built.",
    mobileStickyBar: "Hi, I'm looking at your website on my phone and I'd like to ask about pricing.",
    enquiryForm: "Hi, I just filled your enquiry form and wanted to follow up directly.",
    footer: "Hi, I have a question about your services.",
    demoGeneric: (demoName: string) =>
      `Hi, I looked at the ${demoName} demo on your site and I'd like something similar for my business.`,
    industryPage: (industryName: string) =>
      `Hi, I run a ${industryName.toLowerCase()} business and I'd like a website built for it.`,
    postEnquiryConfirmation: (name: string, category: string) =>
      `Hi, this is ${name}. I just submitted an enquiry about a ${category} website on your site — following up here.`,
  } satisfies WhatsAppTemplates,

  analyticsProvider: "cloudflare" as "cloudflare" | "umami" | "none",
  emailProvider: "resend" as "resend" | "smtp" | "none",
  aiEnabled: false,

  featureFlags: {
    aiEnabled: false,
    enquiryAcknowledgementEmail: false,
    prefetchDemoRoutes: true,
  },

  // Top six categories per RESEARCH.md's scoring matrix (real estate, hotels,
  // healthcare clinics, education/coaching, dental clinics, restaurants), plus
  // jewellery, interior design and salon/spa added later from the same
  // researched candidate pool — see RESEARCH.md Part 3 for the full weighted
  // rubric and rejected runners-up.
  industryRegistry: [
    {
      slug: "real-estate",
      name: "Real Estate & Builders",
      shortName: "Real Estate",
      demoSlug: "shivalik-homes",
      metaTitle: "Website Design for Real Estate & Builders in India | atittle.com",
      metaDescription:
        "Property listing websites with floor plans, EMI calculators and site-visit booking for Indian builders and real estate developers. See a live demo.",
      heroQuestion: "Are buyers finding your projects on Google, or only on property portals you don't control?",
    },
    {
      slug: "hotels-resorts",
      name: "Hotels, Resorts & Homestays",
      shortName: "Hotels & Resorts",
      demoSlug: "kayal-backwaters",
      metaTitle: "Website Design for Hotels, Resorts & Homestays in India | atittle.com",
      metaDescription:
        "Direct-booking websites for Indian hotels, resorts and homestays that reduce OTA commission and showcase rooms, experiences and packages properly.",
      heroQuestion: "How much of every booking are you giving away in OTA commission that a direct-booking website could keep?",
    },
    {
      slug: "healthcare-clinics",
      name: "Healthcare Clinics",
      shortName: "Clinics",
      demoSlug: "sanjeevani-clinic",
      metaTitle: "Website Design for Clinics & Multi-Specialty Hospitals in India | atittle.com",
      metaDescription:
        "Appointment-ready clinic websites with doctor profiles, specialisations and mobile-first booking for Indian healthcare practices.",
      heroQuestion: "When someone searches for a doctor near them at 11pm, does your clinic show up — and can they book?",
    },
    {
      slug: "education-coaching",
      name: "Education & Coaching Institutes",
      shortName: "Coaching Institutes",
      demoSlug: "manthan-institute",
      metaTitle: "Website Design for Coaching Institutes & Schools in India | atittle.com",
      metaDescription:
        "Websites for Indian coaching institutes and schools with batch schedules, faculty profiles and admission enquiry forms parents actually trust.",
      heroQuestion: "Do parents comparing coaching institutes online find a real website, or just a Facebook page?",
    },
    {
      slug: "dental-clinics",
      name: "Dental Clinics",
      shortName: "Dental Clinics",
      demoSlug: "ivory-smiles",
      metaTitle: "Website Design for Dental Clinics in India | atittle.com",
      metaDescription:
        "Treatment-catalogue websites for Indian dental clinics with pricing clarity, appointment booking and a real clinic tour gallery.",
      heroQuestion: "Can a nervous new patient see your treatments, prices and dentist's qualifications before they even call?",
    },
    {
      slug: "restaurants-cafes",
      name: "Restaurants & Cafés",
      shortName: "Restaurants",
      demoSlug: "anaar-awadhi-table",
      metaTitle: "Website Design for Restaurants & Cafés in India | atittle.com",
      metaDescription:
        "Menu-first restaurant websites with reservations, location and gallery — built so hungry customers find you on Google, not just food apps.",
      heroQuestion: "If someone Googles your restaurant right now, do they land on your menu — or on someone else's aggregator listing?",
    },
    {
      slug: "jewellery",
      name: "Jewellery & Luxury Retail",
      shortName: "Jewellery",
      demoSlug: "sunehri-atelier",
      metaTitle: "Website Design for Jewellery Stores in India | atittle.com",
      metaDescription: "Considered jewellery catalogue websites with collection filters, material details, clear pricing and personal enquiry flows. Explore a fictional Jaipur atelier.",
      heroQuestion: "Can a customer explore your collections and shortlist a piece before visiting your showroom?",
    },
    {
      slug: "interior-design",
      name: "Interior Design & Architecture Studios",
      shortName: "Interior Design",
      demoSlug: "aangan-form",
      metaTitle: "Website Design for Interior Designers & Architects in India | atittle.com",
      metaDescription: "Portfolio websites for interior design and architecture studios with project stories, scope clarity and budget-planning tools. Explore an Ahmedabad studio concept.",
      heroQuestion: "Does your portfolio explain the thinking behind a space, or only show a gallery of rooms?",
    },
    {
      slug: "salon-spa",
      name: "Salons, Spas & Beauty Studios",
      shortName: "Salon & Spa",
      demoSlug: "mogra-house",
      metaTitle: "Website Design for Salons & Spas in India | atittle.com",
      metaDescription: "Expressive salon and spa websites with service menus, rupee pricing, appointment planners and clear enquiry handoffs. Explore a fictional beauty house in Pune.",
      heroQuestion: "Can a new guest find the right service, understand the price and plan their visit without a long message exchange?",
    },
    {"slug":"professional-services","name":"Professional Services & Consulting","shortName":"Professional Services","demoSlug":"meridian-advisory","metaTitle":"Website Design for Professional Services in India | ATITTLE","metaDescription":"Explore a working professional services website demo with clear content, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Can a prospective client understand your expertise and scope before the first conversation?"},
    {"slug":"fitness-studios","name":"Fitness Studios & Gyms","shortName":"Fitness Studios","demoSlug":"repwork-studio","metaTitle":"Website Design for Fitness Studios in India | ATITTLE","metaDescription":"Explore a working fitness studios website demo with clear content, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Can someone find a class that fits their day and understand the first visit before joining?"},
  ] satisfies IndustryRegistryEntry[],

  demoRegistry: [
    { slug: "shivalik-homes", businessName: "Shivalik Homes & Developers", industrySlug: "real-estate", tagline: "Foothill homes, built to last.", city: "Dehradun, Uttarakhand", noindex: true },
    { slug: "kayal-backwaters", businessName: "Kayal Backwaters Resort", industrySlug: "hotels-resorts", tagline: "Wake up on the water.", city: "Alleppey, Kerala", noindex: true },
    { slug: "sanjeevani-clinic", businessName: "Sanjeevani Multispecialty Clinic", industrySlug: "healthcare-clinics", tagline: "Care for every stage of life.", city: "Nagpur, Maharashtra", noindex: true },
    { slug: "manthan-institute", businessName: "Manthan Institute of Competitive Studies", industrySlug: "education-coaching", tagline: "Discipline, then results.", city: "Kota, Rajasthan", noindex: true },
    { slug: "ivory-smiles", businessName: "Ivory Smiles Dental Clinic", industrySlug: "dental-clinics", tagline: "Dentistry without the dread.", city: "Indore, Madhya Pradesh", noindex: true },
    { slug: "anaar-awadhi-table", businessName: "Anaar — The Awadhi Table", industrySlug: "restaurants-cafes", tagline: "Lucknow's kitchen, plated properly.", city: "Lucknow, Uttar Pradesh", noindex: true },
    { slug: "sunehri-atelier", businessName: "Sunehri Atelier", industrySlug: "jewellery", tagline: "Objects of tomorrow’s memories.", city: "Jaipur, Rajasthan", noindex: true },
    { slug: "aangan-form", businessName: "Aangan / Form", industrySlug: "interior-design", tagline: "Space to live, room to become.", city: "Ahmedabad, Gujarat", noindex: true },
    { slug: "mogra-house", businessName: "Mogra House", industrySlug: "salon-spa", tagline: "A little time, entirely yours.", city: "Pune, Maharashtra", noindex: true },
    {"slug":"meridian-advisory","businessName":"Meridian Advisory","industrySlug":"professional-services","tagline":"A clearer way forward.","city":"Ahmedabad, Gujarat","noindex":true},
    {"slug":"repwork-studio","businessName":"Repwork Studio","industrySlug":"fitness-studios","tagline":"Show up. Find your strong.","city":"Bengaluru, Karnataka","noindex":true},
  ] satisfies DemoRegistryEntry[],
} as const;

export type SiteConfig = typeof siteConfig;
