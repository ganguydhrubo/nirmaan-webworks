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
  serviceSpecific?: (serviceName: string) => string;
}

export interface OtherServiceEntry {
  id: string;
  name: string;
  shortName: string;
  headline: string;
  analogy: string;
  takeaway: string;
  icon: string;
  badge: string;
  whatsappMessage: string;
  crossLink?: { label: string; href: string };
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

  primaryEmail: "hello@atittle.com",
  leadNotificationEmail: "hello@atittle.com",
  supportEmail: "hello@atittle.com",

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
    // schema.org LocalBusiness.openingHours format (day-range + 24h time).
    // Kept next to `display` so both are edited together — see src/lib/seo.ts.
    schemaOrg: "Mo-Sa 10:00-19:00",
  },

  responseCommitment: "We reply to every enquiry within one business day.",

  gstNote:
    "GST is charged extra as applicable, shown separately on every quote. Registration and GSTIN details are shared on request during the enquiry process.",

  socialLinks: [
    { platform: "facebook", name: "Facebook", url: "https://www.facebook.com/atittleweb" },
    { platform: "instagram", name: "Instagram", url: "https://www.instagram.com/atittleweb/" },
  ],

  priceRanges: [
    {
      id: "micro-starter",
      name: "Starter Local Storefront",
      priceMinInr: 4999,
      priceMaxInr: 9999,
      bestFor: "A local retail shop, kirana, boutique, or salon that needs a fast mobile storefront and WhatsApp ordering",
      includes: [
        "1-page high-converting mobile catalog & storefront",
        "Direct WhatsApp cart & 1-tap call integration",
        "Google Business Profile & Google Maps pin setup",
        "Countertop UPI payment QR standee design",
        "Rapid 48-hour delivery",
      ],
      excludes: ["Multi-page navigation", "Custom backend software"],
      indicativeTimelineWeeks: [0.5, 1] as [number, number],
    },
    {
      id: "starter",
      name: "Starter Brochure Site",
      priceMinInr: 18000,
      priceMaxInr: 32000,
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
      priceMinInr: 35000,
      priceMaxInr: 70000,
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
      priceMinInr: 70000,
      priceMaxInr: 150000,
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
    serviceSpecific: (serviceName: string) =>
      `Hi, I saw your ${serviceName} service on your website and I'd like to discuss how you can help my business with this.`,
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
      metaTitle: "Website Design for Real Estate & Builders in India | ATITTLE",
      metaDescription:
        "Property listing websites with floor plans, EMI calculators and site-visit booking for Indian builders and real estate developers. See a live demo.",
      heroQuestion: "Are buyers finding your projects on Google, or only on property portals you don't control?",
    },
    {
      slug: "hotels-resorts",
      name: "Hotels, Resorts & Homestays",
      shortName: "Hotels & Resorts",
      demoSlug: "kayal-backwaters",
      metaTitle: "Website Design for Hotels, Resorts & Homestays in India | ATITTLE",
      metaDescription:
        "Direct-booking websites for Indian hotels, resorts and homestays that reduce OTA commission and showcase rooms, experiences and packages properly.",
      heroQuestion: "How much of every booking are you giving away in OTA commission that a direct-booking website could keep?",
    },
    {
      slug: "healthcare-clinics",
      name: "Healthcare Clinics",
      shortName: "Clinics",
      demoSlug: "sanjeevani-clinic",
      metaTitle: "Website Design for Clinics & Multi-Specialty Hospitals in India | ATITTLE",
      metaDescription:
        "Appointment-ready clinic websites with doctor profiles, specialisations and mobile-first booking for Indian healthcare practices.",
      heroQuestion: "When someone searches for a doctor near them at 11pm, does your clinic show up — and can they book?",
    },
    {
      slug: "education-coaching",
      name: "Education & Coaching Institutes",
      shortName: "Coaching Institutes",
      demoSlug: "manthan-institute",
      metaTitle: "Website Design for Coaching Institutes & Schools in India | ATITTLE",
      metaDescription:
        "Websites for Indian coaching institutes and schools with batch schedules, faculty profiles and admission enquiry forms parents actually trust.",
      heroQuestion: "Do parents comparing coaching institutes online find a real website, or just a Facebook page?",
    },
    {
      slug: "dental-clinics",
      name: "Dental Clinics",
      shortName: "Dental Clinics",
      demoSlug: "ivory-smiles",
      metaTitle: "Website Design for Dental Clinics in India | ATITTLE",
      metaDescription:
        "Treatment-catalogue websites for Indian dental clinics with pricing clarity, appointment booking and a real clinic tour gallery.",
      heroQuestion: "Can a nervous new patient see your treatments, prices and dentist's qualifications before they even call?",
    },
    {
      slug: "restaurants-cafes",
      name: "Restaurants & Cafés",
      shortName: "Restaurants",
      demoSlug: "anaar-awadhi-table",
      metaTitle: "Website Design for Restaurants & Cafés in India | ATITTLE",
      metaDescription:
        "Menu-first restaurant websites with reservations, location and gallery — built so hungry customers find you on Google, not just food apps.",
      heroQuestion: "If someone Googles your restaurant right now, do they land on your menu — or on someone else's aggregator listing?",
    },
    {
      slug: "jewellery",
      name: "Jewellery & Luxury Retail",
      shortName: "Jewellery",
      demoSlug: "sunehri-atelier",
      metaTitle: "Website Design for Jewellery Stores in India | ATITTLE",
      metaDescription: "Considered jewellery catalogue websites with collection filters, material details, clear pricing and personal enquiry flows. Explore a fictional Jaipur atelier.",
      heroQuestion: "Can a customer explore your collections and shortlist a piece before visiting your showroom?",
    },
    {
      slug: "interior-design",
      name: "Interior Design & Architecture Studios",
      shortName: "Interior Design",
      demoSlug: "aangan-form",
      metaTitle: "Website Design for Interior Designers & Architects in India | ATITTLE",
      metaDescription: "Portfolio websites for interior design and architecture studios with project stories, scope clarity and budget-planning tools. Explore an Ahmedabad studio concept.",
      heroQuestion: "Does your portfolio explain the thinking behind a space, or only show a gallery of rooms?",
    },
    {
      slug: "salon-spa",
      name: "Salons, Spas & Beauty Studios",
      shortName: "Salon & Spa",
      demoSlug: "mogra-house",
      metaTitle: "Website Design for Salons & Spas in India | ATITTLE",
      metaDescription: "Expressive salon and spa websites with service menus, rupee pricing, appointment planners and clear enquiry handoffs. Explore a fictional beauty house in Pune.",
      heroQuestion: "Can a new guest find the right service, understand the price and plan their visit without a long message exchange?",
    },
    {"slug":"professional-services","name":"Professional Services & Consulting","shortName":"Professional Services","demoSlug":"meridian-advisory","metaTitle":"Website Design for Professional Services in India | ATITTLE","metaDescription":"Explore a working professional services website demo with clear content, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Can a prospective client understand your expertise and scope before the first conversation?"},
    {"slug":"fitness-studios","name":"Fitness Studios & Gyms","shortName":"Fitness Studios","demoSlug":"repwork-studio","metaTitle":"Website Design for Fitness Studios in India | ATITTLE","metaDescription":"Explore a working fitness studios website demo with clear content, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Can someone find a class that fits their day and understand the first visit before joining?"},
    {"slug":"events-photography","name":"Event Planners & Photographers","shortName":"Events & Photography","demoSlug":"saanjh-stories","metaTitle":"Website Design for Events & Photography in India | ATITTLE","metaDescription":"Explore a working events & photography website demo with clear content, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Does your gallery tell a complete story and give couples a clear way to discuss their celebration?"},
    {"slug":"retail-d2c","name":"Retail & Local Boutiques","shortName":"Retail & Boutiques","demoSlug":"sunday-objects","metaTitle":"Website Design for Retail & Boutiques in India | ATITTLE","metaDescription":"Explore a working retail & boutiques website demo with clear content, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Can customers compare product details and ask about a named piece before visiting?"},
    {"slug":"automotive","name":"Automotive Dealers & Workshops","shortName":"Automotive","demoSlug":"torque-district","metaTitle":"Website Design for Automotive Dealers & Workshops in India | ATITTLE","metaDescription":"Explore a working automotive dealers & workshops website demo with clear content, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Can a serious buyer see real condition details and trust your listing before they ever visit?"},
    {"slug":"diagnostics-labs","name":"Diagnostics Labs","shortName":"Diagnostics Labs","demoSlug":"clearline-labs","metaTitle":"Website Design for Diagnostics Labs in India | ATITTLE","metaDescription":"Explore a working diagnostics lab website demo with a searchable test directory, useful interactions and mobile-first design for Indian businesses.","heroQuestion":"Can a patient understand what a test involves and how to read the report before they even book?"},
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
    {"slug":"saanjh-stories","businessName":"Saanjh Stories","industrySlug":"events-photography","tagline":"Some days stay with you.","city":"Jaipur, Rajasthan","noindex":true},
    {"slug":"sunday-objects","businessName":"Sunday Objects","industrySlug":"retail-d2c","tagline":"Everyday things. A little less ordinary.","city":"Kochi, Kerala","noindex":true},
    {"slug":"torque-district","businessName":"Torque District","industrySlug":"automotive","tagline":"Good machines. No guesswork.","city":"Pune, Maharashtra","noindex":true},
    {"slug":"clearline-labs","businessName":"Clearline Diagnostics","industrySlug":"diagnostics-labs","tagline":"Clarity, at every step.","city":"Chandigarh","noindex":true},
  ] satisfies DemoRegistryEntry[],

  otherServices: [
    {
      id: "meta-google-ads",
      name: "Meta & Google Ads",
      shortName: "Paid Ads",
      headline: "Put your business in front of people already searching for it.",
      analogy: "You know how when you search \"dentist near me\", a few clinics show up right at the top marked 'Ad'? Or how a jewellery ad shows up while you're scrolling Instagram? That's not luck — someone paid a small, controlled amount to be shown to exactly the right people. We set that up for you: pick the right customers, write the ad, set a daily budget you're comfortable with, and make sure the money is actually turning into phone calls and WhatsApp messages — not just 'likes'.",
      takeaway: "You tell us your monthly budget — even ₹5,000/month is enough to start — we handle everything else and show you, in plain numbers, what it brought back.",
      icon: "target",
      badge: "High-Intent Traffic",
      whatsappMessage: "Hi, I'm interested in Meta and Google Ads for my business. I'd like to discuss setting up targeted campaigns to bring phone and WhatsApp enquiries.",
    },
    {
      id: "seo-aeo",
      name: "SEO & AEO (Search + Answer Engine Optimization)",
      shortName: "SEO & AEO",
      headline: "Get found on Google — and now, on AI answers too.",
      analogy: "SEO (Search Engine Optimization) means making sure that when someone searches for what you do, your business shows up on Google without paying for an ad — like being on the main road instead of a back alley. AEO (Answer Engine Optimization) is the newer version of this: people are starting to ask ChatGPT or Google's AI \"best dentist in Nagpur\" instead of typing it into a search box — AEO makes sure your business is the one those AI tools actually mention by name.",
      takeaway: "Think of it as making sure your shop's signboard is readable both by people walking by (Google) and by the new AI 'shop assistants' people are starting to ask instead (ChatGPT, Gemini).",
      icon: "search",
      badge: "Google & AI Discovery",
      whatsappMessage: "Hi, I'd like to ask about SEO and AEO to get my business recommended by Google and AI answer engines like ChatGPT and Gemini.",
    },
    {
      id: "saas",
      name: "End-to-end SaaS (Software as a Service)",
      shortName: "SaaS Products",
      headline: "Got a software idea? We build the whole business, not just a demo.",
      analogy: "SaaS (Software as a Service) just means software people pay a monthly subscription for — like Netflix, but for a business tool. If you've got an idea (say, a booking system to sell to other clinics, or an inventory tool for shop owners like you), we build the entire thing: people can sign up, pay automatically every month, use the product, and you get paid — without you needing to write a single line of code.",
      takeaway: "If you can explain your idea in two minutes over a phone call, we can tell you honestly whether it's buildable and what it would take.",
      icon: "cloud",
      badge: "Subscription Software",
      whatsappMessage: "Hi, I have a software/SaaS idea and I'd like to discuss building an end-to-end subscription tool with ATITTLE.",
    },
    {
      id: "fixing-broken-systems",
      name: "Fixing Broken Systems or Apps",
      shortName: "System Repairs",
      headline: "Inherited a mess from a previous developer? We clean it up.",
      analogy: "Sometimes a business already has a website or app — but it's slow, keeps crashing, the person who built it has disappeared, or nobody remembers the login anymore. We go in, figure out exactly what's wrong without judging how it got that way, and fix it — patch it, speed it up, or rebuild only the broken part — instead of throwing everything away and starting over unless that's genuinely the cheaper option.",
      takeaway: "Send us the login details and tell us what's going wrong — we'll tell you honestly whether it needs a small fix or a full rebuild, before you spend a rupee.",
      icon: "wrench",
      badge: "Code Rescue & Fixes",
      whatsappMessage: "Hi, I have an existing website or app that is slow, broken, or abandoned by a previous developer. I'd like an honest review of how to fix it.",
    },
    {
      id: "iot",
      name: "End-to-end IoT (Internet of Things)",
      shortName: "IoT & Hardware Dashboards",
      headline: "Connect real machines to an app you can check from anywhere.",
      analogy: "IoT (Internet of Things) means physical devices — a water tank sensor, a factory machine, an electricity meter, a delivery vehicle — that can 'talk' to the internet. We connect that hardware to a simple app or dashboard, so instead of physically walking over to check something, you can see it, get alerted, or even control it from your phone, from anywhere.",
      takeaway: "If you've ever thought \"I wish I could just check this from my phone instead of driving there,\" that's exactly what this is for.",
      icon: "cpu",
      badge: "Connected Hardware",
      whatsappMessage: "Hi, I'm interested in connecting machines or sensors to a phone app/dashboard (IoT). Let's discuss what's possible for my business.",
    },
    {
      id: "ai-transformation",
      name: "AI Transformation",
      shortName: "AI Workflow Automation",
      headline: "We find the boring, repetitive parts of your business AI can take off your plate.",
      analogy: "This isn't about 'adding AI' for the sake of it. We sit with you, look at the parts of your day that are repetitive — replying to the same customer questions, manually entering data, chasing follow-ups — and figure out exactly where a bit of AI can save real hours, with real, measurable savings, not buzzwords.",
      takeaway: "We'll tell you honestly if AI isn't worth it for a particular task — we're not here to sell you AI you don't need.",
      icon: "sparkles",
      badge: "Practical Automation",
      crossLink: { label: "Test our live AI Website Evaluator right now →", href: "/tools/website-evaluator" },
      whatsappMessage: "Hi, I want to explore practical AI automation for repetitive tasks in my business. Can we discuss where it makes financial sense?",
    },
    {
      id: "ai-agent",
      name: "AI Agent",
      shortName: "Digital Staff Agents",
      headline: "A tireless digital staff member trained just for your business.",
      analogy: "An AI agent is like hiring a very fast, very patient staff member who never sleeps — one that can answer customer questions on WhatsApp, take bookings, follow up with leads, or handle one specific repetitive job, trained specifically on your business's information (your prices, your services, your policies) so it never gives a wrong or generic answer.",
      takeaway: "Think of it as the first reply to every customer being handled instantly, any time of day — with a real person stepping in only when it actually needs a human.",
      icon: "bot",
      badge: "24/7 Digital Assistant",
      crossLink: { label: "Try our live AI-powered tool on your site right now →", href: "/tools/website-evaluator" },
      whatsappMessage: "Hi, I'm interested in building a custom AI agent trained on my business services, pricing, and FAQs to handle customer inquiries.",
    },
  ] satisfies OtherServiceEntry[],
} as const;

export type SiteConfig = typeof siteConfig;
