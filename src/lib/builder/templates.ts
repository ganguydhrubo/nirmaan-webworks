/**
 * Starter templates. Each is a complete, working SiteDoc (run through
 * normalizeDoc on load like any other document), not a picture.
 *
 * Business names are invented, contact details are left for the user to
 * fill in, and testimonials are flagged as samples so nothing here can be
 * mistaken for a real business's claims.
 */
import type { SectionType } from "./catalog";
import { normalizeDoc, type SiteDoc } from "./schema";
import { themeFromPreset } from "./themes";

export interface TemplateInfo {
  id: string;
  label: string;
  description: string;
  preset: string;
  tag?: string;
  category?: string;
}

type RawSection = { type: SectionType; variant?: string; props?: Record<string, unknown>; style?: Record<string, unknown> };
type RawPage = { title: string; slug?: string; sections: RawSection[] };

const sec = (type: SectionType, variant: string | undefined, props: Record<string, unknown> = {}, style?: Record<string, unknown>): RawSection => ({
  type,
  variant,
  props,
  ...(style ? { style } : {}),
});

const nav = (brand: string, ctaLabel = "Contact us", ctaHref = "#contact", variant = "simple") => sec("navbar", variant, { brand, ctaLabel, ctaHref });
const footer = (brand: string, tagline: string, variant = "simple") => sec("footer", variant, { brand, tagline, copyright: brand });
const contact = (heading = "Get in touch", intro = "Tell us what you need and we will reply within one working day.", extra: Record<string, unknown> = {}) =>
  sec("contact", "split", { heading, intro, email: "hello@example.com", phone: "", whatsapp: "", address: "", hours: "", formEndpoint: "", ...extra });
const sampleTestimonials = (heading = "What customers say") =>
  sec("testimonials", "cards", {
    heading,
    isSample: true,
    items: [
      { quote: "Replace this with a short quote from a real customer about the result you delivered.", name: "Customer name", role: "City" },
      { quote: "Replace this with another real customer quote. Specific details build the most trust.", name: "Customer name", role: "City" },
    ],
  });

interface TemplateDef extends TemplateInfo {
  name: string;
  description: string;
  siteDescription: string;
  pages: RawPage[];
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "corporate-advisory",
    label: "Meridian Corporate Advisory",
    description: "Executive strategic counsel, capital advisory and corporate governance profile.",
    preset: "corporate",
    tag: "🏢 Top Corporate Trust",
    category: "Corporate",
    name: "Meridian Advisory Group",
    siteDescription: "Strategic counsel and corporate advisory for mid-market and enterprise leadership.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Meridian Advisory Group", "Schedule Consultation", "#contact", "simple"),
          sec("hero", "split", {
            eyebrow: "Strategic Corporate Counsel",
            headline: "Clarity in decision-making for complex business crossroads",
            subheadline: "We advise boards and founders on capital allocation, cross-border growth, and strategic transformation with senior-only engagement.",
            primaryLabel: "Executive Briefing",
            primaryHref: "#contact",
            secondaryLabel: "Practice Areas",
            secondaryHref: "#services",
          }, { background: "default", align: "left", spacing: "spacious" }),
          sec("features", "grid", {
            heading: "Why leadership teams choose Meridian",
            intro: "Institutional rigor combined with entrepreneurial speed.",
            items: [
              { title: "Senior Principals Only", description: "Direct oversight by partners who have managed P&Ls and navigated multi-stakeholder crises." },
              { title: "Evidence-Led Strategy", description: "Every recommendation is backed by granular market modeling and audited financial data." },
              { title: "Measurable Value", description: "Clear KPIs, governance milestones, and structured 90-day execution roadmaps." },
            ],
          }, { background: "surface", align: "left", spacing: "normal" }),
          sec("services", "cards", {
            heading: "Practice Areas",
            intro: "Tailored engagements structured for decisive outcomes.",
            items: [
              { title: "Mergers and Capital Strategy", description: "Valuation, buy-side advisory, and balance-sheet optimization for expansion.", price: "" },
              { title: "Governance and Risk Advisory", description: "Board advisory, regulatory compliance frameworks, and executive alignment.", price: "" },
              { title: "Operational Turnaround", description: "Cost rationalization, supply chain resilience, and organizational performance.", price: "" },
            ],
          }),
          sec("steps", "timeline", {
            heading: "Our Engagement Framework",
            intro: "A three-phase diagnostic and implementation cycle.",
            items: [
              { title: "01 / Diagnostic", description: "Comprehensive audit of business fundamentals, risk surfaces, and market positioning." },
              { title: "02 / Strategy and Roadmap", description: "Co-creation of targeted intervention points with board and executive leadership." },
              { title: "03 / Governance", description: "Structured bi-weekly reviews and milestone tracking to ensure ROI realization." },
            ],
          }, { background: "surface", align: "left", spacing: "normal" }),
          contact("Initiate Consultation", "Confidential inquiries receive direct principal response within 24 hours.", { hours: "Mon–Fri, 9am – 6pm", email: "advisory@meridian.in" }),
          footer("Meridian Advisory Group", "Independent corporate strategy and governance counsel.", "columns"),
        ],
      },
    ],
  },
  {
    id: "saas-platform",
    label: "Nova AI and Cloud Platform",
    description: "High-conversion tech landing page with feature bento grid and transparent pricing.",
    preset: "saas",
    tag: "⚡ #1 Tech Trend 2026",
    category: "Tech",
    name: "Nova Cloud AI",
    siteDescription: "Intelligent workflow automation for high-growth engineering and operations teams.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Nova Cloud", "Start 14-Day Free Trial", "#pricing", "simple"),
          sec("hero", "centered", {
            eyebrow: "⚡ Next-Gen Workflow Engine",
            headline: "Automate complex workflows in minutes, not months",
            subheadline: "Nova connects your APIs, databases, and customer channels into one ultra-fast, self-healing intelligence platform.",
            primaryLabel: "Get Started Free",
            primaryHref: "#pricing",
            secondaryLabel: "Live Demo",
            secondaryHref: "#features",
          }, { background: "default", align: "center", spacing: "spacious" }),
          sec("features", "grid", {
            heading: "Engineered for speed and security",
            intro: "Zero cold-starts, SOC2 Type II compliance, and global edge execution.",
            items: [
              { title: "Real-time Edge Execution", description: "Execute logic across 300+ global edge locations with sub-10ms response times." },
              { title: "Instant API Integrations", description: "Pre-built connectors for PostgreSQL, Stripe, Razorpay, WhatsApp, and Slack." },
              { title: "Autonomous Observability", description: "Automated telemetry, root-cause diagnostics, and instant rollback triggers." },
            ],
          }, { background: "surface", align: "left", spacing: "normal" }),
          sec("pricing", "cards", {
            heading: "Predictable, transparent pricing",
            intro: "Start free for 14 days. Scale as your workload grows.",
            plans: [
              { name: "Starter", price: "₹1,499", period: "/month", features: ["Up to 50,000 tasks/mo", "5 active workflows", "Standard email support"], ctaLabel: "Start Free Trial", ctaHref: "#contact", highlighted: false },
              { name: "Pro Scale", price: "₹4,999", period: "/month", features: ["500,000 tasks/mo", "Unlimited workflows", "Dedicated Slack channel", "Custom Webhooks"], ctaLabel: "Start Free Trial", ctaHref: "#contact", highlighted: true },
              { name: "Enterprise", price: "₹19,999", period: "/month", features: ["Unlimited throughput", "Self-hosted edge runner", "Custom SLA and 24/7 phone"], ctaLabel: "Contact Sales", ctaHref: "#contact", highlighted: false },
            ],
          }),
          sec("faq", "accordion", {
            heading: "Frequently Asked Questions",
            items: [
              { question: "How does the 14-day trial work?", answer: "You get full access to Pro Scale features with no credit card required. Cancel or downgrade anytime." },
              { question: "Can I connect my existing AWS or GCP infrastructure?", answer: "Yes, Nova integrates seamlessly with VPC peering, private endpoints, and major cloud providers." },
            ],
          }),
          contact("Talk to Engineering", "Have custom compliance or infrastructure requirements? Let us know."),
          footer("Nova Cloud AI", "Intelligent workflow automation engine.", "columns"),
        ],
      },
    ],
  },

  {
    id: "small-business",
    label: "Small business",
    description: "A clear one-page site for any local shop or business.",
    preset: "local",
    name: "Greenleaf Stores",
    siteDescription: "Everyday essentials and friendly service in your neighbourhood.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Greenleaf Stores", "Visit us"),
          sec("hero", "split", {
            eyebrow: "Your neighbourhood store",
            headline: "Everything you need, a short walk from home",
            subheadline: "Fresh groceries, household essentials and friendly service, open seven days a week.",
            primaryLabel: "Find the store",
            primaryHref: "#contact",
            secondaryLabel: "What we stock",
            secondaryHref: "#services",
          }, { background: "default", align: "left", spacing: "spacious" }),
          sec("services", "cards", {
            heading: "What you will find",
            intro: "A carefully chosen range, restocked every morning.",
            items: [
              { title: "Fresh produce", description: "Fruit and vegetables delivered daily from local suppliers.", price: "" },
              { title: "Daily essentials", description: "Staples, snacks and household basics at fair prices.", price: "" },
              { title: "Home delivery", description: "Order by phone or WhatsApp and we will bring it to your door.", price: "" },
            ],
          }),
          sec("about", "image-right", { eyebrow: "About us", heading: "A family store that knows your name", body: "Write a few lines about how your store started, who runs it, and what regular customers love about shopping with you." }),
          sampleTestimonials(),
          contact("Visit or call us", "Drop in, call, or message us on WhatsApp.", { hours: "Mon–Sun, 8am – 9pm" }),
          footer("Greenleaf Stores", "Your friendly neighbourhood store."),
        ],
      },
    ],
  },
  {
    id: "portfolio",
    label: "Professional portfolio",
    description: "Show your best work with a gallery and a short bio.",
    preset: "minimal",
    name: "Studio Mira",
    siteDescription: "Portfolio of selected photography and design work.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Studio Mira", "Hire me", "#contact"),
          sec("hero", "centered", { eyebrow: "Photographer & visual designer", headline: "Quiet, honest images for people and brands", subheadline: "I photograph people, products and places with natural light and very little fuss.", primaryLabel: "See my work", primaryHref: "#gallery", secondaryLabel: "", secondaryHref: "" }),
          sec("gallery", "feature", { heading: "Selected work", intro: "Upload your best projects here. Click any photo to replace it.", images: Array.from({ length: 5 }, () => ({ image: { src: "", alt: "" }, caption: "" })) }),
          sec("about", "image-left", { eyebrow: "About", heading: "Hi, I'm Mira", body: "Introduce yourself in a few sentences: what you do, who you love working with, and how a project with you usually goes." }),
          sec("cta", "band", { heading: "Have a project in mind?", body: "Tell me about it and I will reply with ideas and a quote.", buttonLabel: "Start a conversation", buttonHref: "#contact" }),
          contact("Let's work together", "Share a few details about your project and timeline."),
          footer("Studio Mira", "Photography and visual design."),
        ],
      },
    ],
  },
  {
    id: "consultant",
    label: "Consultant",
    description: "Build trust with services, process and an easy way to book a call.",
    preset: "editorial",
    name: "Clearpath Advisory",
    siteDescription: "Practical business and finance advice for growing small companies.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Clearpath Advisory", "Book a call"),
          sec("hero", "editorial", { eyebrow: "Independent business advisor", headline: "Clear advice for the decisions that shape your business", subheadline: "I help small business owners plan growth, fix cash flow, and make confident decisions — without jargon.", primaryLabel: "Book a free 20-minute call", primaryHref: "#contact", secondaryLabel: "How I help", secondaryHref: "#services" }, { background: "default", align: "left", spacing: "spacious" }),
          sec("services", "numbered", {
            heading: "How I can help",
            intro: "",
            items: [
              { title: "Growth planning", description: "A realistic 12-month plan with clear priorities and numbers you can track.", price: "" },
              { title: "Cash-flow review", description: "Find where money gets stuck and build simple habits to keep it moving.", price: "" },
              { title: "Pricing strategy", description: "Price your services with confidence, based on value and real costs.", price: "" },
            ],
          }),
          sec("steps", "timeline", {
            heading: "How we work together",
            intro: "",
            items: [
              { title: "Free intro call", description: "We talk about where you are and where you want to be." },
              { title: "Clear proposal", description: "You get a fixed scope and price before any work starts." },
              { title: "Practical results", description: "Short sessions, written summaries, and next steps you can act on." },
            ],
          }, { background: "surface", align: "left", spacing: "normal" }),
          sec("faq", "accordion", { heading: "Common questions", items: [{ question: "Do you work with businesses outside my city?", answer: "Yes. Most sessions happen over video call, so location is rarely a problem." }, { question: "How much does it cost?", answer: "It depends on the scope. After a free intro call you get a fixed quote, so there are no surprises." }] }, { background: "default", align: "left", spacing: "normal" }),
          contact("Book a free intro call", "Share a little about your business and I will suggest a time."),
          footer("Clearpath Advisory", "Practical advice for small businesses.", "columns"),
        ],
      },
    ],
  },
  {
    id: "freelancer",
    label: "Freelancer",
    description: "Services, pricing packages and a contact form for solo professionals.",
    preset: "studio",
    name: "Arjun Builds",
    siteDescription: "Freelance web and brand design for small businesses.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Arjun Builds", "Get a quote"),
          sec("hero", "centered", { eyebrow: "Freelance designer", headline: "Websites and branding that help small businesses look the part", subheadline: "Straightforward packages, quick turnaround, and one person you can actually talk to.", primaryLabel: "See packages", primaryHref: "#pricing", secondaryLabel: "Get in touch", secondaryHref: "#contact" }),
          sec("services", "list", { heading: "What I do", intro: "", items: [{ title: "Logo & brand basics", description: "A simple logo, colours and fonts that work everywhere.", price: "" }, { title: "Small business websites", description: "Fast, mobile-friendly sites that are easy to update.", price: "" }, { title: "Social media kits", description: "Templates for posts and stories that match your brand.", price: "" }] }),
          sec("pricing", "cards", {
            heading: "Packages",
            intro: "Example prices — set your own in the editor.",
            plans: [
              { name: "Starter", price: "₹9,999", period: "", features: ["Logo and colour palette", "Business card design", "1 round of changes"], ctaLabel: "Choose Starter", ctaHref: "#contact", highlighted: false },
              { name: "Website", price: "₹24,999", period: "", features: ["Up to 5 pages", "Mobile-friendly design", "Contact form setup", "2 rounds of changes"], ctaLabel: "Choose Website", ctaHref: "#contact", highlighted: true },
              { name: "Complete", price: "₹39,999", period: "", features: ["Everything in Website", "Brand basics", "Social media kit"], ctaLabel: "Choose Complete", ctaHref: "#contact", highlighted: false },
            ],
          }, { background: "surface", align: "center", spacing: "normal" }),
          sampleTestimonials("Kind words"),
          contact("Tell me about your project"),
          footer("Arjun Builds", "Freelance design for small businesses."),
        ],
      },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    description: "A multi-page site for a creative or marketing agency.",
    preset: "dark-tech",
    name: "Northwind Creative",
    siteDescription: "A small creative agency for brands that want to stand out.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Northwind Creative", "Start a project"),
          sec("hero", "banner", { eyebrow: "Creative agency", headline: "We make brands people remember", subheadline: "Strategy, design and content for ambitious small and mid-sized companies.", primaryLabel: "Start a project", primaryHref: "#contact", secondaryLabel: "Our services", secondaryHref: "page:services" }),
          sec("features", "grid", { heading: "Why teams work with us", intro: "", items: [{ title: "Senior people only", description: "You work directly with the people doing the work." }, { title: "Clear timelines", description: "Every project has a fixed plan and weekly updates." }, { title: "Results you can measure", description: "We agree on what success looks like before we start." }] }),
          sec("gallery", "grid", { heading: "Recent work", intro: "Add images of your projects.", images: Array.from({ length: 6 }, () => ({ image: { src: "", alt: "" }, caption: "" })) }),
          sec("cta", "card", { heading: "Have a brief? Let's talk.", body: "Tell us about your goals and we will come back with ideas within two working days.", buttonLabel: "Get in touch", buttonHref: "#contact" }),
          contact("Start a project"),
          footer("Northwind Creative", "Strategy, design and content.", "columns"),
        ],
      },
      {
        title: "Services",
        slug: "services",
        sections: [
          nav("Northwind Creative", "Start a project"),
          sec("hero", "centered", { eyebrow: "Services", headline: "Everything a growing brand needs", subheadline: "Pick one service or combine them into a full launch.", primaryLabel: "Talk to us", primaryHref: "#contact", secondaryLabel: "", secondaryHref: "" }, { background: "surface", align: "center", spacing: "normal" }),
          sec("services", "cards", { heading: "What we do", intro: "", items: [{ title: "Brand identity", description: "Naming, logo, visual identity and brand guidelines.", price: "" }, { title: "Websites", description: "Design and build of fast, accessible marketing websites.", price: "" }, { title: "Content & social", description: "Photography, video and social media content plans.", price: "" }, { title: "Campaigns", description: "Launch campaigns across digital and print.", price: "" }] }),
          sec("faq", "accordion", { heading: "Questions", items: [{ question: "How long does a project take?", answer: "Most brand and website projects take 4–10 weeks depending on scope." }, { question: "Do you work with startups?", answer: "Yes — we have packages designed for early-stage teams." }] }),
          contact("Start a project"),
          footer("Northwind Creative", "Strategy, design and content.", "columns"),
        ],
      },
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant or café",
    description: "Menu highlights, photos, opening hours and directions.",
    preset: "hospitality",
    name: "The Courtyard Café",
    siteDescription: "A relaxed neighbourhood café serving fresh food and great coffee.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("The Courtyard Café", "Reserve a table", "#contact", "centered"),
          sec("hero", "banner", { eyebrow: "Café & kitchen", headline: "Slow mornings, good coffee, food made fresh", subheadline: "All-day breakfast, seasonal plates and house-baked bread in a leafy courtyard.", primaryLabel: "See the menu", primaryHref: "#pricing", secondaryLabel: "Find us", secondaryHref: "#contact" }),
          sec("pricing", "cards", {
            heading: "Menu highlights",
            intro: "A taste of what is on the menu this season.",
            plans: [
              { name: "Breakfast", price: "from ₹220", period: "", features: ["Masala omelette & toast", "Granola bowl with fruit", "Buttermilk pancakes"], ctaLabel: "", ctaHref: "", highlighted: false },
              { name: "Lunch", price: "from ₹320", period: "", features: ["Grilled paneer sandwich", "Seasonal salad bowl", "Soup of the day with bread"], ctaLabel: "", ctaHref: "", highlighted: true },
              { name: "Coffee & bakes", price: "from ₹120", period: "", features: ["Pour-over and espresso", "Banana walnut bread", "Cardamom buns"], ctaLabel: "", ctaHref: "", highlighted: false },
            ],
          }, { background: "surface", align: "center", spacing: "normal" }),
          sec("gallery", "grid", { heading: "Inside the café", intro: "", images: Array.from({ length: 6 }, () => ({ image: { src: "", alt: "" }, caption: "" })) }),
          sec("about", "text", { eyebrow: "Our story", heading: "A courtyard, a coffee machine and a lot of love", body: "Share how your café began, where your ingredients come from, and what makes your place special." }, { background: "default", align: "center", spacing: "normal" }),
          contact("Visit us", "Walk-ins welcome. Call ahead for groups of six or more.", { hours: "Tue–Sun, 8am – 10pm · Closed Mondays", address: "Add your address here" }),
          footer("The Courtyard Café", "Fresh food and good coffee."),
        ],
      },
    ],
  },
  {
    id: "local-service",
    label: "Local service provider",
    description: "For plumbers, electricians, tutors, cleaners and other services.",
    preset: "corporate",
    name: "SparkFix Repairs",
    siteDescription: "Reliable home electrical and appliance repairs.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("SparkFix Repairs", "Call now"),
          sec("hero", "split", { eyebrow: "Home repairs", headline: "Reliable electrical repairs, usually the same day", subheadline: "Trained technicians, upfront prices, and a tidy job — every time.", primaryLabel: "Book a visit", primaryHref: "#contact", secondaryLabel: "Our services", secondaryHref: "#services" }, { background: "default", align: "left", spacing: "spacious" }),
          sec("services", "cards", { heading: "Services", intro: "Not sure what you need? Call us and describe the problem.", items: [{ title: "Wiring & switchboards", description: "Fault finding, rewiring, new points and safety checks.", price: "" }, { title: "Fans, lights & fittings", description: "Installation and repair of fans, lights and fixtures.", price: "" }, { title: "Appliance repair", description: "Washing machines, geysers, mixers and more.", price: "" }] }),
          sec("features", "checklist", { heading: "Why customers call us", intro: "", items: [{ title: "Upfront pricing", description: "You approve the price before any work starts." }, { title: "On time", description: "We give you a time window and stick to it." }, { title: "Clean and safe", description: "We follow safety standards and clean up after the job." }] }, { background: "surface", align: "left", spacing: "normal" }),
          sec("steps", "cards", { heading: "Booking is simple", intro: "", items: [{ title: "Call or WhatsApp", description: "Tell us the problem and your area." }, { title: "We confirm a time", description: "You get a visit window and an upfront estimate." }, { title: "Fixed, tested, tidy", description: "We finish the job, test it, and clean up." }] }, { background: "default", align: "left", spacing: "normal" }),
          sec("faq", "accordion", { heading: "Questions", items: [{ question: "Which areas do you cover?", answer: "List the neighbourhoods or pin codes you serve here." }, { question: "Do you charge for a visit?", answer: "Explain your visit or inspection charge here, if any." }] }),
          contact("Book a repair", "Call or WhatsApp us with the problem and your area."),
          footer("SparkFix Repairs", "Home electrical and appliance repairs."),
        ],
      },
    ],
  },
  {
    id: "personal-brand",
    label: "Personal brand",
    description: "For coaches, speakers, creators and writers.",
    preset: "luxury",
    name: "Neha Kapoor",
    siteDescription: "Career coach helping professionals find work they love.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Neha Kapoor", "Work with me"),
          sec("hero", "split", { eyebrow: "Career coach", headline: "Find work that fits the person you are becoming", subheadline: "One-to-one coaching for professionals who feel stuck and want a clear next step.", primaryLabel: "Book a discovery call", primaryHref: "#contact", secondaryLabel: "About me", secondaryHref: "page:about" }, { background: "default", align: "left", spacing: "spacious" }),
          sec("services", "cards", { heading: "Ways to work with me", intro: "", items: [{ title: "Clarity session", description: "A single 90-minute session to map your options.", price: "" }, { title: "8-week coaching", description: "Weekly sessions to plan and make a career move.", price: "" }, { title: "Workshops", description: "Talks and workshops for teams and communities.", price: "" }] }),
          sampleTestimonials("Client stories"),
          sec("cta", "band", { heading: "Ready for your next chapter?", body: "Book a free 20-minute discovery call.", buttonLabel: "Book a call", buttonHref: "#contact" }),
          contact("Book a discovery call"),
          footer("Neha Kapoor", "Career coaching."),
        ],
      },
      {
        title: "About",
        slug: "about",
        sections: [
          nav("Neha Kapoor", "Work with me"),
          sec("about", "image-left", { eyebrow: "About me", heading: "Hi, I'm Neha", body: "Tell your story here: your background, why you started coaching, and the kind of people you help best.\n\nAdd a second paragraph about your approach and what clients can expect." }),
          sec("features", "checklist", { heading: "What I believe", intro: "", items: [{ title: "Small steps beat big leaps", description: "Steady progress is more reliable than dramatic change." }, { title: "You already know a lot", description: "Coaching helps you hear yourself more clearly." }] }, { background: "surface", align: "left", spacing: "normal" }),
          contact("Get in touch"),
          footer("Neha Kapoor", "Career coaching."),
        ],
      },
    ],
  },
  {
    id: "startup",
    label: "Startup landing page",
    description: "Explain your product, show features and collect sign-ups.",
    preset: "playful",
    name: "Taskly",
    siteDescription: "Taskly is a simple task board for small teams.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Taskly", "Join the waitlist"),
          sec("hero", "centered", { eyebrow: "Now in early access", headline: "The simplest way for small teams to get work done", subheadline: "Taskly keeps your team's tasks, deadlines and updates in one calm place.", primaryLabel: "Join the waitlist", primaryHref: "#contact", secondaryLabel: "See features", secondaryHref: "#features" }, { background: "default", align: "center", spacing: "spacious" }),
          sec("features", "grid", { heading: "Built for focus", intro: "Everything you need, nothing you don't.", items: [{ title: "Boards in seconds", description: "Create a board and invite your team in under a minute." }, { title: "Clear ownership", description: "Every task has one owner and one due date." }, { title: "Weekly digest", description: "A short summary of what moved and what's stuck." }] }, { background: "surface", align: "center", spacing: "normal" }),
          sec("pricing", "cards", { heading: "Pricing", intro: "Example plans — edit to match your product.", plans: [{ name: "Free", price: "₹0", period: "/month", features: ["Up to 3 boards", "5 team members"], ctaLabel: "Get started", ctaHref: "#contact", highlighted: false }, { name: "Team", price: "₹499", period: "/user/month", features: ["Unlimited boards", "Weekly digest", "Priority support"], ctaLabel: "Join the waitlist", ctaHref: "#contact", highlighted: true }] }, { background: "default", align: "center", spacing: "normal" }),
          sec("faq", "accordion", { heading: "FAQ", items: [{ question: "When will Taskly launch?", answer: "Share your launch timeline here." }, { question: "Is my data safe?", answer: "Describe how you store and protect customer data." }] }, { background: "surface", align: "left", spacing: "normal" }),
          contact("Join the waitlist", "Leave your email and we will invite you as soon as a spot opens."),
          footer("Taskly", "Simple task boards for small teams."),
        ],
      },
    ],
  },
  {
    id: "product",
    label: "Product or service",
    description: "Sell one product or service with benefits, pricing and FAQs.",
    preset: "organic",
    name: "Hearth Candles",
    siteDescription: "Hand-poured soy candles made in small batches.",
    pages: [
      {
        title: "Home",
        sections: [
          nav("Hearth Candles", "Order now"),
          sec("hero", "split", { eyebrow: "Hand-poured in small batches", headline: "Natural soy candles for calmer evenings", subheadline: "Clean-burning, gently scented, and made by hand with plant-based wax.", primaryLabel: "See the collection", primaryHref: "#pricing", secondaryLabel: "", secondaryHref: "" }, { background: "default", align: "left", spacing: "spacious" }),
          sec("features", "grid", { heading: "Why Hearth", intro: "", items: [{ title: "Plant-based wax", description: "Made with soy wax and cotton wicks." }, { title: "Long burn time", description: "Each 200g candle burns for roughly 40 hours." }, { title: "Gift-ready", description: "Every candle ships in a recyclable gift box." }] }),
          sec("pricing", "cards", { heading: "The collection", intro: "", plans: [{ name: "Single candle", price: "₹699", period: "", features: ["200g soy candle", "Choice of 4 scents"], ctaLabel: "Order", ctaHref: "#contact", highlighted: false }, { name: "Gift set of 3", price: "₹1,899", period: "", features: ["Three 200g candles", "Gift box and note"], ctaLabel: "Order the set", ctaHref: "#contact", highlighted: true }] }, { background: "surface", align: "center", spacing: "normal" }),
          sec("gallery", "grid", { heading: "Gallery", intro: "", images: Array.from({ length: 3 }, () => ({ image: { src: "", alt: "" }, caption: "" })) }),
          sec("faq", "accordion", { heading: "Questions", items: [{ question: "How do I order?", answer: "Message us on WhatsApp or email us with the candles you would like." }, { question: "Do you deliver across India?", answer: "Describe your delivery areas, times and charges here." }] }),
          contact("Order or ask a question"),
          footer("Hearth Candles", "Hand-poured soy candles."),
        ],
      },
    ],
  },
];

export const TEMPLATE_LIST: TemplateInfo[] = TEMPLATES.map(({ id, label, description, preset, tag, category }) => ({ id, label, description, preset, tag, category }));

export function templateDoc(id: string): SiteDoc | null {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  return normalizeDoc({ name: t.name, description: t.siteDescription, theme: themeFromPreset(t.preset), pages: t.pages }).doc;
}

/** A blank-but-usable starting document. */
export function blankDoc(name = "My Website"): SiteDoc {
  return normalizeDoc({
    name,
    theme: themeFromPreset("clean"),
    pages: [{ title: "Home", sections: [nav(name), sec("hero", "centered", { headline: name, subheadline: "Describe what you do in one or two sentences." }), contact(), footer(name, "")] }],
  }).doc;
}
