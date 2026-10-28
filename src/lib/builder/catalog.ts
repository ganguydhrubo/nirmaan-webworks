/**
 * Section catalog for the AI Website Builder.
 *
 * Each section type declares its fields once, and that single declaration
 * drives three things so they can never drift apart:
 *   1. normalizeProps()  — validation/coercion of AI output, imports, saves
 *   2. the editor's properties panel (field kind → input control)
 *   3. the field list described to the AI in the generation prompt
 *
 * The JSON-first "block type + variant + props" model is adapted from
 * OpenPage (MIT, see CREDITS.md). Section types that invite fabricated
 * claims (team members, statistics, client-logo clouds) are deliberately
 * not offered.
 */
import { cleanLine, cleanText, safeHref, safeImageSrc } from "./sanitize";
import { videoSource } from "./video";

export interface ImageValue {
  src: string;
  alt: string;
}

export type FieldSpec =
  | { kind: "text"; key: string; label: string; max: number; default: string; help?: string; inline?: boolean }
  | { kind: "textarea"; key: string; label: string; max: number; default: string; help?: string; inline?: boolean }
  | { kind: "link"; key: string; label: string; default: string; help?: string }
  | { kind: "image"; key: string; label: string; help?: string }
  | { kind: "bool"; key: string; label: string; default: boolean; help?: string }
  | { kind: "lines"; key: string; label: string; maxItems: number; maxEach: number; default: string[]; help?: string }
  | {
      kind: "list";
      key: string;
      label: string;
      itemLabel: string;
      minItems: number;
      maxItems: number;
      fields: FieldSpec[];
      default: Record<string, unknown>[];
      help?: string;
    };

export type SectionType =
  | "navbar"
  | "hero"
  | "video"
  | "logos"
  | "about"
  | "services"
  | "features"
  | "gallery"
  | "testimonials"
  | "pricing"
  | "faq"
  | "steps"
  | "contact"
  | "cta"
  | "text"
  | "footer";

export interface SectionDef {
  type: SectionType;
  label: string;
  description: string;
  variants: { id: string; label: string }[];
  fields: FieldSpec[];
  /** Only one per page, and pinned to the top/bottom of the page. */
  pinned?: "top" | "bottom";
}

const t = (key: string, label: string, max: number, def: string, extra: Partial<{ help: string; inline: boolean }> = {}): FieldSpec => ({
  kind: "text",
  key,
  label,
  max,
  default: def,
  inline: true,
  ...extra,
});
const ta = (key: string, label: string, max: number, def: string, extra: Partial<{ help: string }> = {}): FieldSpec => ({
  kind: "textarea",
  key,
  label,
  max,
  default: def,
  inline: true,
  ...extra,
});
const link = (key: string, label: string, def: string): FieldSpec => ({ kind: "link", key, label, default: def });
const img = (key: string, label: string): FieldSpec => ({ kind: "image", key, label });

export const SECTION_DEFS: SectionDef[] = [
  {
    type: "navbar",
    label: "Navigation bar",
    description: "Your name or logo text, links to every page, and a button.",
    pinned: "top",
    variants: [
      { id: "simple", label: "Logo left" },
      { id: "centered", label: "Centered" },
    ],
    fields: [t("brand", "Brand name", 60, "Your Business"), img("logo", "Brand logo"), t("ctaLabel", "Button label", 30, "Contact us"), link("ctaHref", "Button link", "#contact")],
  },
  {
    type: "hero",
    label: "Hero",
    description: "The big headline at the top of the page.",
    variants: [
      { id: "centered", label: "Centered" },
      { id: "split", label: "Text + image" },
      { id: "editorial", label: "Editorial (big type)" },
      { id: "banner", label: "Image background" },
      { id: "video", label: "Video background" },
    ],
    fields: [
      t("eyebrow", "Small label above headline", 60, ""),
      t("headline", "Headline", 120, "A clear promise to your customers"),
      ta("subheadline", "Supporting text", 320, "One or two sentences explaining what you offer, who it is for, and why they should choose you."),
      t("primaryLabel", "Main button label", 30, "Get in touch"),
      link("primaryHref", "Main button link", "#contact"),
      t("secondaryLabel", "Second button label", 30, ""),
      link("secondaryHref", "Second button link", ""),
      img("image", "Image"),
      t("videoUrl", "Background MP4 URL", 2048, "", { help: "Direct HTTPS MP4. Add a poster image for reduced motion and loading." }),
    ],
  },
  {
    type: "video",
    label: "Video",
    description: "YouTube, Vimeo or your own MP4, inline or in a popover.",
    variants: [{ id: "inline", label: "Inline player" }, { id: "modal", label: "Thumbnail + player" }],
    fields: [t("heading", "Heading", 100, "See it in action"), ta("intro", "Description", 320, ""), t("videoUrl", "YouTube, Vimeo or HTTPS MP4 URL", 2048, ""), img("poster", "Video thumbnail"), ta("transcript", "Transcript", 8000, "")],
  },
  {
    type: "logos",
    label: "Client logos",
    description: "Add only logos you have permission to display. Sample labels stay visible until you replace them.",
    variants: [{ id: "cloud", label: "Logo cloud" }],
    fields: [t("heading", "Heading", 100, "Selected collaborators"), { kind: "bool", key: "isSample", label: "Show sample label", default: true }, { kind: "list", key: "items", label: "Logos", itemLabel: "Logo", minItems: 1, maxItems: 12, fields: [t("name", "Name", 60, "Your client"), img("image", "Logo"), link("href", "Link", "")], default: [{ name: "Your client", image: { src: "", alt: "" }, href: "" }] }],
  },
  {
    type: "about",
    label: "About",
    description: "Your story, approach, or what makes you different.",
    variants: [
      { id: "text", label: "Text only" },
      { id: "image-left", label: "Image left" },
      { id: "image-right", label: "Image right" },
    ],
    fields: [
      t("eyebrow", "Small label", 40, "About us"),
      t("heading", "Heading", 100, "Who we are"),
      ta("body", "Text", 1600, "Tell visitors who you are, how you started, and what you care about."),
      img("image", "Image"),
    ],
  },
  {
    type: "services",
    label: "Services",
    description: "What you offer, as cards.",
    variants: [
      { id: "cards", label: "Cards" },
      { id: "numbered", label: "Numbered" },
      { id: "list", label: "List" },
    ],
    fields: [
      t("heading", "Heading", 100, "What we offer"),
      ta("intro", "Intro text", 320, ""),
      {
        kind: "list",
        key: "items",
        label: "Services",
        itemLabel: "Service",
        minItems: 1,
        maxItems: 9,
        fields: [t("title", "Name", 60, "Service name"), ta("description", "Description", 280, "A short description of this service."), t("price", "Price (optional)", 30, "")],
        default: [
          { title: "First service", description: "A short description of this service.", price: "" },
          { title: "Second service", description: "A short description of this service.", price: "" },
          { title: "Third service", description: "A short description of this service.", price: "" },
        ],
      },
    ],
  },
  {
    type: "features",
    label: "Features / benefits",
    description: "Reasons to choose you, with short explanations.",
    variants: [
      { id: "grid", label: "Grid" },
      { id: "checklist", label: "Checklist" },
    ],
    fields: [
      t("heading", "Heading", 100, "Why choose us"),
      ta("intro", "Intro text", 320, ""),
      {
        kind: "list",
        key: "items",
        label: "Benefits",
        itemLabel: "Benefit",
        minItems: 1,
        maxItems: 9,
        fields: [t("title", "Title", 60, "A clear benefit"), ta("description", "Description", 240, "Explain why this matters to your customer.")],
        default: [
          { title: "A clear benefit", description: "Explain why this matters to your customer." },
          { title: "Another benefit", description: "Explain why this matters to your customer." },
          { title: "A third benefit", description: "Explain why this matters to your customer." },
        ],
      },
    ],
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "A grid of photos of your work, products, or space.",
    variants: [
      { id: "grid", label: "Even grid" },
      { id: "feature", label: "One large + small" },
    ],
    fields: [
      t("heading", "Heading", 100, "Gallery"),
      ta("intro", "Intro text", 240, ""),
      {
        kind: "list",
        key: "images",
        label: "Photos",
        itemLabel: "Photo",
        minItems: 1,
        maxItems: 12,
        fields: [img("image", "Photo"), t("caption", "Caption", 80, "")],
        default: [
          { image: { src: "", alt: "" }, caption: "" },
          { image: { src: "", alt: "" }, caption: "" },
          { image: { src: "", alt: "" }, caption: "" },
        ],
      },
    ],
  },
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Quotes from real customers.",
    variants: [
      { id: "cards", label: "Cards" },
      { id: "single", label: "Single large quote" },
    ],
    fields: [
      t("heading", "Heading", 100, "What customers say"),
      {
        kind: "bool",
        key: "isSample",
        label: "These are sample testimonials",
        default: true,
        help: "Sample quotes are labelled \"Sample\" on your website. Untick only after replacing them with real feedback from real customers.",
      },
      {
        kind: "list",
        key: "items",
        label: "Testimonials",
        itemLabel: "Testimonial",
        minItems: 1,
        maxItems: 6,
        fields: [ta("quote", "Quote", 400, "Replace this with a real quote from a customer."), t("name", "Name", 60, "Customer name"), t("role", "Detail (e.g. city)", 60, "")],
        default: [
          { quote: "Replace this with a real quote from a customer.", name: "Customer name", role: "" },
          { quote: "Replace this with a real quote from a customer.", name: "Customer name", role: "" },
        ],
      },
    ],
  },
  {
    type: "pricing",
    label: "Pricing",
    description: "Packages or plans with prices.",
    variants: [{ id: "cards", label: "Cards" }, { id: "toggle", label: "Monthly / yearly" }],
    fields: [
      t("heading", "Heading", 100, "Simple pricing"),
      ta("intro", "Intro text", 280, ""),
      {
        kind: "list",
        key: "plans",
        label: "Plans",
        itemLabel: "Plan",
        minItems: 1,
        maxItems: 4,
        fields: [
          t("name", "Plan name", 40, "Plan"),
          t("price", "Price", 30, "₹0"),
          t("annualPrice", "Yearly price", 30, ""),
          t("period", "Period (e.g. /month)", 30, ""),
          { kind: "lines", key: "features", label: "What's included (one per line)", maxItems: 10, maxEach: 90, default: ["Included item"] },
          t("ctaLabel", "Button label", 30, "Choose plan"),
          link("ctaHref", "Button link", "#contact"),
          { kind: "bool", key: "highlighted", label: "Highlight this plan", default: false },
        ],
        default: [
          { name: "Basic", price: "₹999", period: "", features: ["Included item", "Included item"], ctaLabel: "Choose Basic", ctaHref: "#contact", highlighted: false },
          { name: "Standard", price: "₹1,999", period: "", features: ["Everything in Basic", "Included item"], ctaLabel: "Choose Standard", ctaHref: "#contact", highlighted: true },
          { name: "Premium", price: "₹3,999", period: "", features: ["Everything in Standard", "Included item"], ctaLabel: "Choose Premium", ctaHref: "#contact", highlighted: false },
        ],
      },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Common questions with expandable answers.",
    variants: [{ id: "accordion", label: "Accordion" }],
    fields: [
      t("heading", "Heading", 100, "Frequently asked questions"),
      {
        kind: "list",
        key: "items",
        label: "Questions",
        itemLabel: "Question",
        minItems: 1,
        maxItems: 12,
        fields: [t("question", "Question", 160, "A question customers ask"), ta("answer", "Answer", 700, "A clear, helpful answer.")],
        default: [
          { question: "A question customers ask", answer: "A clear, helpful answer." },
          { question: "Another common question", answer: "A clear, helpful answer." },
        ],
      },
    ],
  },
  {
    type: "steps",
    label: "Steps / How it works",
    description: "Your process in 3–5 simple steps.",
    variants: [
      { id: "timeline", label: "Timeline" },
      { id: "cards", label: "Cards" },
    ],
    fields: [
      t("heading", "Heading", 100, "How it works"),
      ta("intro", "Intro text", 280, ""),
      {
        kind: "list",
        key: "items",
        label: "Steps",
        itemLabel: "Step",
        minItems: 2,
        maxItems: 6,
        fields: [t("title", "Step title", 60, "Step"), ta("description", "Description", 240, "What happens in this step.")],
        default: [
          { title: "Tell us what you need", description: "A quick call or message about your goals." },
          { title: "Get a clear plan", description: "A simple plan and price, before any work starts." },
          { title: "Enjoy the result", description: "We deliver, check in, and make sure you're happy." },
        ],
      },
    ],
  },
  {
    type: "contact",
    label: "Contact",
    description: "How to reach you: email, phone, WhatsApp, address, and an optional form.",
    variants: [
      { id: "split", label: "Details + form" },
      { id: "simple", label: "Details only" },
    ],
    fields: [
      t("heading", "Heading", 100, "Get in touch"),
      ta("intro", "Intro text", 320, "We usually reply within one working day."),
      t("email", "Email", 120, ""),
      t("phone", "Phone", 30, ""),
      t("whatsapp", "WhatsApp number (with country code)", 30, ""),
      ta("address", "Address", 240, ""),
      t("hours", "Opening hours", 120, ""),
      {
        kind: "link",
        key: "formEndpoint",
        label: "Form service URL (optional)",
        default: "",
        help: "Exported websites are plain files with no server, so a form needs a form service (e.g. Formspree, Getform, Web3Forms). Paste its https:// form URL here. Leave empty to show an email button instead.",
      },
    ],
  },
  {
    type: "cta",
    label: "Call to action",
    description: "A short band asking visitors to take the next step.",
    variants: [
      { id: "band", label: "Full-width band" },
      { id: "card", label: "Card" },
    ],
    fields: [t("heading", "Heading", 100, "Ready to get started?"), ta("body", "Text", 280, "Tell visitors exactly what happens next."), t("buttonLabel", "Button label", 30, "Contact us"), link("buttonHref", "Button link", "#contact")],
  },
  {
    type: "text",
    label: "Text block",
    description: "A heading and free text, e.g. a policy or a longer explanation.",
    variants: [
      { id: "narrow", label: "Readable column" },
      { id: "wide", label: "Wide" },
    ],
    fields: [t("heading", "Heading", 120, "Heading"), ta("body", "Text", 5000, "Write your text here.")],
  },
  {
    type: "footer",
    label: "Footer",
    description: "Page links, short tagline and copyright.",
    pinned: "bottom",
    variants: [
      { id: "simple", label: "Simple" },
      { id: "columns", label: "Columns" },
    ],
    fields: [
      t("brand", "Brand name", 60, "Your Business"), ta("tagline", "Tagline", 200, ""), t("copyright", "Copyright name", 80, ""),
      { kind: "list", key: "links", label: "Sitemap and legal links", itemLabel: "Link", minItems: 0, maxItems: 12, fields: [t("label", "Label", 50, ""), link("href", "Destination", "")], default: [] },
      { kind: "list", key: "socials", label: "Social links", itemLabel: "Social", minItems: 0, maxItems: 6, fields: [t("label", "Network", 40, ""), link("href", "Profile URL", "")], default: [] },
      link("newsletterEndpoint", "Newsletter form endpoint (HTTPS)", ""),
    ],
  },
];

export const SECTION_TYPES = SECTION_DEFS.map((d) => d.type);

export function getSectionDef(type: string): SectionDef | undefined {
  return SECTION_DEFS.find((d) => d.type === type);
}

function defaultFor(field: FieldSpec): unknown {
  switch (field.kind) {
    case "image":
      return { src: "", alt: "" };
    case "list":
      return field.default.map((item) => normalizeFields(field.fields, item));
    case "lines":
      return [...field.default];
    default:
      return field.default;
  }
}

export function defaultProps(type: SectionType): Record<string, unknown> {
  const def = getSectionDef(type);
  if (!def) return {};
  return Object.fromEntries(def.fields.map((f) => [f.key, defaultFor(f)]));
}

export interface NormalizeContext {
  assetIds?: ReadonlySet<string>;
}

function normalizeField(field: FieldSpec, raw: unknown, ctx: NormalizeContext): unknown {
  switch (field.kind) {
    case "text":
      return raw === undefined ? field.default : cleanLine(raw, field.max);
    case "textarea":
      return raw === undefined ? field.default : cleanText(raw, field.max);
    case "link":
      return raw === undefined ? field.default : safeHref(raw);
    case "bool":
      return typeof raw === "boolean" ? raw : field.default;
    case "image": {
      const v = (raw && typeof raw === "object" ? raw : { src: raw }) as Partial<ImageValue>;
      return { src: safeImageSrc(v.src, ctx.assetIds), alt: cleanLine(v.alt, 160) };
    }
    case "lines": {
      const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split("\n") : field.default;
      return arr
        .map((s) => cleanLine(s, field.maxEach))
        .filter(Boolean)
        .slice(0, field.maxItems);
    }
    case "list": {
      if (!Array.isArray(raw)) return defaultFor(field);
      const items = raw
        .filter((item) => item && typeof item === "object")
        .slice(0, field.maxItems)
        .map((item) => normalizeFields(field.fields, item as Record<string, unknown>, ctx));
      return items.length >= field.minItems ? items : defaultFor(field);
    }
  }
}

export function normalizeFields(fields: FieldSpec[], raw: Record<string, unknown> | undefined, ctx: NormalizeContext = {}): Record<string, unknown> {
  const input = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(fields.map((f) => [f.key, normalizeField(f, input[f.key], ctx)]));
}

export function normalizeProps(type: SectionType, raw: unknown, ctx: NormalizeContext = {}): Record<string, unknown> {
  const def = getSectionDef(type);
  if (!def) return {};
  const props = normalizeFields(def.fields, raw as Record<string, unknown>, ctx);
  if ("videoUrl" in props) {
    const source = videoSource(props.videoUrl);
    props.videoUrl = source && (type !== "hero" || source.kind === "mp4") ? source.src : "";
  }
  return props;
}

/** Look up the spec for a dotted props path such as "items.2.title". */
export function fieldAtPath(type: SectionType, path: string): FieldSpec | undefined {
  const def = getSectionDef(type);
  if (!def) return undefined;
  const parts = path.split(".");
  let fields: FieldSpec[] = def.fields;
  let found: FieldSpec | undefined;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (/^\d+$/.test(part)) continue;
    found = fields.find((f) => f.key === part);
    if (!found) return undefined;
    if (found.kind === "list") fields = found.fields;
  }
  return found;
}
