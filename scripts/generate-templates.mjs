import fs from "node:fs";
import { CATEGORIES } from "./template-categories.mjs";

const base = fs.readFileSync(new URL("./template-base.source", import.meta.url), "utf8");
const media = JSON.parse(fs.readFileSync(new URL("../src/lib/builder/template-media.json", import.meta.url), "utf8"));
const section = (type, variant, props, style) => ({ type, variant, props, ...(style ? { style } : {}) });
const generated = [];
const structures = [
  ["logos", "features", "about", "services", "steps", "pricing", "faq"],
  ["about", "services", "gallery", "steps", "faq", "cta"],
  ["features", "steps", "video", "pricing", "logos", "faq"],
  ["gallery", "about", "services", "logos", "faq", "cta"],
  ["logos", "services", "steps", "about", "pricing", "faq"],
  ["features", "video", "about", "steps", "faq", "cta"],
  ["about", "gallery", "features", "pricing", "faq", "logos"],
  ["steps", "features", "services", "video", "faq", "cta"],
  ["gallery", "logos", "about", "services", "pricing", "faq"],
  ["features", "about", "steps", "video", "pricing", "faq", "cta"],
];
for (const c of CATEGORIES) {
  for (const [i, it] of c.items.entries()) {
    const photo = media[it.id];
    if (!photo) throw new Error(`Missing licensed image for ${it.id}`);
    const image = { src: photo.url, alt: photo.title };
    const subject = it.name.replace(/&/g, "and");
    const focus = it.sub.split(/[,.]/)[0];
    const cards = [
      { title: "Explore the possibilities", description: it.sub, price: "" },
      { title: "A plan around your priorities", description: `Discuss your goals with ${subject} and choose the scope that fits.`, price: "" },
      { title: "Know what happens next", description: "Agree on the details, timing and next steps before making a commitment.", price: "" },
    ];
    const sections = {
      logos: section("logos", "cloud", { heading: "Your partners belong here", isSample: true, items: ["Partner One", "Partner Two", "Partner Three", "Partner Four"].map(name => ({ name, image: { src: "", alt: "" }, href: "" })) }),
      features: section("features", i % 2 ? "checklist" : "grid", { heading: `${focus.slice(0, 75)}`, intro: `Explore the approach behind ${subject}.`, items: cards.map(({ title, description }) => ({ title, description })) }),
      services: section("services", ["cards", "numbered", "list"][i % 3], { heading: ["Find your starting point", "Built around your needs", "Explore our offering"][i % 3], intro: it.sub, items: cards }),
      about: section("about", i % 2 ? "image-right" : "image-left", { eyebrow: "Our approach", heading: `Meet ${subject}`.slice(0, 100), body: `${it.sub}\n\nUse this space to tell your story, introduce your approach and explain what customers can expect. Replace this sample copy with your own experience.`, image }),
      gallery: section("gallery", i % 2 ? "feature" : "grid", { heading: "A closer look", intro: "Replace these sample visuals with your work.", images: [{ image, caption: focus.slice(0, 80) }] }),
      steps: section("steps", i % 2 ? "cards" : "timeline", { heading: ["From first hello to next steps", "How it works", "A clear path forward"][i % 3], intro: "Adapt these steps to your process.", items: [{ title: "Share your priorities", description: `Tell ${subject} what you have in mind.` }, { title: "Explore the details", description: "Review options and agree on a scope, schedule and budget." }, { title: "Take the next step", description: "Confirm your plan and stay in touch as it progresses." }] }),
      pricing: section("pricing", i % 2 ? "toggle" : "cards", { heading: "Choose your level of support", intro: "Sample packages — replace with your actual prices and terms.", plans: ["Essentials", "Signature", "Complete"].map((name, index) => ({ name, price: "Request a quote", annualPrice: "Request a yearly quote", period: "", features: [focus.slice(0, 85), index ? "Scope tailored to your priorities" : "A focused starting point", "Clear next steps"], ctaLabel: "Discuss this option", ctaHref: "#contact", highlighted: index === 1 })) }),
      video: section("video", i % 2 ? "modal" : "inline", { heading: "Your story, in motion", intro: "Add your own product film, walkthrough or introduction in the editor.", videoUrl: "", poster: image, transcript: "" }),
      faq: section("faq", "accordion", { heading: `Questions about ${subject}`.slice(0, 100), items: [{ question: `What does ${subject} offer?`.slice(0, 140), answer: it.sub }, { question: "How do I discuss my requirements?", answer: "Use the contact details below to describe what you need. Add your actual response times and booking process here." }, { question: "Can the offering be tailored to my needs?", answer: "Replace this answer with the options, availability and terms you can actually provide." }] }),
      cta: section("cta", i % 2 ? "card" : "band", { heading: `Let's talk about your next step`, body: it.sub, buttonLabel: "Start a conversation", buttonHref: "#contact" }),
    };
    const heroVariant = ["split", "banner", "editorial", "centered", "split", "editorial", "banner", "split", "centered", "editorial"][i];
    generated.push({ id: it.id, label: it.name, description: it.sub, preset: c.preset, category: c.cat, name: it.name, siteDescription: it.sub, pages: [{ title: "Home", sections: [
      section("navbar", i % 3 === 0 ? "centered" : "simple", { brand: it.name, ctaLabel: "Get in touch", ctaHref: "#contact" }),
      section("hero", heroVariant, { eyebrow: c.cat, headline: it.name, subheadline: it.sub, primaryLabel: ["Explore our offering", "Start a conversation", "Find out more"][i % 3], primaryHref: i % 3 === 1 ? "#contact" : "#about", secondaryLabel: "Get in touch", secondaryHref: "#contact", image }, { background: i % 4 === 0 ? "gradient" : "default", align: heroVariant === "centered" ? "center" : "left", spacing: i % 3 === 0 ? "spacious" : "normal" }),
      ...structures[i].map((key, n) => ({ ...sections[key], style: { background: n % 3 === 0 ? "surface" : "default", align: i % 3 === 0 ? "center" : "left", spacing: i % 4 === 0 ? "spacious" : "normal" } })),
      section("contact", "split", { heading: `Contact ${it.name}`.slice(0, 100), intro: "Add your email, phone number or form endpoint to receive enquiries.", email: "", phone: "", whatsapp: "", address: "", hours: "", formEndpoint: "" }),
      section("footer", "columns", { brand: it.name, tagline: it.sub.slice(0, 200), copyright: it.name, links: [{ label: "About", href: "#about" }, { label: "Contact", href: "#contact" }], socials: [], newsletterEndpoint: "" }),
    ] }] });
  }
}
const marker = "const TEMPLATES: TemplateDef[] = [";
fs.writeFileSync(new URL("../src/lib/builder/generated-templates.json", import.meta.url), JSON.stringify(generated));
let output = base.replace(marker, `const GENERATED_TEMPLATES = generatedTemplates as TemplateDef[];\n\n${marker}\n...GENERATED_TEMPLATES,`);
output = output.replace('import type { SectionType } from "./catalog";', 'import type { SectionType } from "./catalog";\nimport generatedTemplates from "./generated-templates.json";');
output = output.replace('import type { SectionType } from "./catalog";', 'import type { SectionType } from "./catalog";\nimport templateMedia from "./template-media.json";');
output = output.replace('export const TEMPLATE_LIST:', `/** Raw input remains available so validation can detect coercion and dropped fields. */
export function templateInput(id: string) {
  const t = TEMPLATES.find(x => x.id === id);
  if (!t) return null;
  const photo = (templateMedia as Record<string, { url: string; title: string }>)[id];
  const replaceImages = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(replaceImages);
    if (!value || typeof value !== "object") return value;
    const obj = value as Record<string, unknown>;
    if (typeof obj.src === "string" && obj.src && photo) return { src: photo.url, alt: photo.title };
    return Object.fromEntries(Object.entries(obj).map(([key, v]) => [key, replaceImages(v)]));
  };
  const pages = replaceImages(t.pages) as RawPage[];
  for (const page of pages) for (const s of page.sections) {
    if (s.type === "hero" && photo) s.props = { ...s.props, image: { src: photo.url, alt: photo.title } };
  }
  return { name: t.name, description: t.siteDescription, theme: themeFromPreset(t.preset), pages };
}

export const TEMPLATE_LIST:`);
output = output.replace('return normalizeDoc({ name: t.name, description: t.siteDescription, theme: themeFromPreset(t.preset), pages: t.pages }).doc;', 'return normalizeDoc(templateInput(id)).doc;');
fs.writeFileSync(new URL("../src/lib/builder/templates.ts", import.meta.url), output);
console.log(`Generated ${generated.length} industry designs + 12 original starters, with licensed media.`);
