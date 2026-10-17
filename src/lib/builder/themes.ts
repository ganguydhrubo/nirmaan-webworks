/**
 * Design tokens for generated websites: 12 design directions, a font
 * registry, layout/component tokens, and contrast repair.
 *
 * A theme is real tokens (colours, fonts, shape, density, motion) that the
 * renderer turns into CSS — not a label. Every token is editable in the
 * editor's Design tab, and AI-chosen palettes are repaired for contrast
 * before they reach the page. The preset idea follows OpenPage's
 * theme-presets.ts (MIT, see CREDITS.md).
 */
import { isHexColor } from "./sanitize";

export interface ThemeColors {
  /** Page background */
  bg: string;
  /** Alternate section / card background */
  surface: string;
  /** Primary text */
  text: string;
  /** Secondary text */
  muted: string;
  /** Primary brand colour: buttons, links, highlights */
  accent: string;
  /** Text on top of accent */
  accentText: string;
  /** Secondary brand colour: decorative details, gradients, badges */
  secondary: string;
  /** Dark section background (footer, bands) */
  dark: string;
  /** Text on dark sections */
  darkText: string;
  /** Hairlines and card borders */
  border: string;
}

export type RadiusStyle = "sharp" | "soft" | "round";
export type ButtonShape = "square" | "rounded" | "pill";
export type CardStyle = "flat" | "bordered" | "elevated";
export type ContentWidth = "narrow" | "normal" | "wide";
export type HeadingStyle = "normal" | "bold" | "uppercase" | "light";
export type TypeScale = "compact" | "normal" | "large";
export type Motion = "none" | "subtle";

export interface Theme {
  preset: string;
  colors: ThemeColors;
  fontHeading: string;
  fontBody: string;
  radius: RadiusStyle;
  buttonShape: ButtonShape;
  cardStyle: CardStyle;
  contentWidth: ContentWidth;
  headingStyle: HeadingStyle;
  typeScale: TypeScale;
  motion: Motion;
}

export interface ThemePreset extends Theme {
  label: string;
  description: string;
}

/**
 * Font registry. `google` is the exact css2 family spec (only weights the
 * family really has — requesting a missing weight makes Google Fonts reject
 * the whole stylesheet). `headingWeight` avoids faux-bold on display faces
 * that ship a single weight.
 */
export const FONTS: Record<string, { stack: string; google: string; headingWeight: number; category: "sans" | "serif" | "display" | "devanagari" }> = {
  Inter: { stack: '"Inter", system-ui, sans-serif', google: "Inter:wght@400;500;600;700;800", headingWeight: 700, category: "sans" },
  Manrope: { stack: '"Manrope", system-ui, sans-serif', google: "Manrope:wght@400;500;600;700;800", headingWeight: 700, category: "sans" },
  Poppins: { stack: '"Poppins", system-ui, sans-serif', google: "Poppins:wght@400;500;600;700", headingWeight: 600, category: "sans" },
  "DM Sans": { stack: '"DM Sans", system-ui, sans-serif', google: "DM+Sans:wght@400;500;600;700", headingWeight: 700, category: "sans" },
  "Work Sans": { stack: '"Work Sans", system-ui, sans-serif', google: "Work+Sans:wght@400;500;600;700", headingWeight: 600, category: "sans" },
  Outfit: { stack: '"Outfit", system-ui, sans-serif', google: "Outfit:wght@400;500;600;700", headingWeight: 600, category: "sans" },
  "Space Grotesk": { stack: '"Space Grotesk", system-ui, sans-serif', google: "Space+Grotesk:wght@400;500;600;700", headingWeight: 700, category: "sans" },
  Nunito: { stack: '"Nunito", system-ui, sans-serif', google: "Nunito:wght@400;600;700;800", headingWeight: 800, category: "sans" },
  "Plus Jakarta Sans": { stack: '"Plus Jakarta Sans", system-ui, sans-serif', google: "Plus+Jakarta+Sans:wght@400;500;600;700;800", headingWeight: 700, category: "sans" },
  Sora: { stack: '"Sora", system-ui, sans-serif', google: "Sora:wght@400;500;600;700", headingWeight: 600, category: "sans" },
  Archivo: { stack: '"Archivo", system-ui, sans-serif', google: "Archivo:wght@400;500;600;700;800", headingWeight: 800, category: "sans" },
  "Bricolage Grotesque": { stack: '"Bricolage Grotesque", system-ui, sans-serif', google: "Bricolage+Grotesque:wght@400;500;600;700;800", headingWeight: 700, category: "display" },
  Syne: { stack: '"Syne", system-ui, sans-serif', google: "Syne:wght@400;500;600;700;800", headingWeight: 700, category: "display" },
  Fraunces: { stack: '"Fraunces", Georgia, serif', google: "Fraunces:wght@400;600;700", headingWeight: 600, category: "serif" },
  "Playfair Display": { stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;600;700", headingWeight: 600, category: "serif" },
  "Cormorant Garamond": { stack: '"Cormorant Garamond", Georgia, serif', google: "Cormorant+Garamond:wght@400;500;600;700", headingWeight: 600, category: "serif" },
  "DM Serif Display": { stack: '"DM Serif Display", Georgia, serif', google: "DM+Serif+Display", headingWeight: 400, category: "serif" },
  "Instrument Serif": { stack: '"Instrument Serif", Georgia, serif', google: "Instrument+Serif", headingWeight: 400, category: "serif" },
  "Libre Baskerville": { stack: '"Libre Baskerville", Georgia, serif', google: "Libre+Baskerville:wght@400;700", headingWeight: 700, category: "serif" },
  Lora: { stack: '"Lora", Georgia, serif', google: "Lora:wght@400;600;700", headingWeight: 600, category: "serif" },
  Merriweather: { stack: '"Merriweather", Georgia, serif', google: "Merriweather:wght@400;700", headingWeight: 700, category: "serif" },
  Mukta: { stack: '"Mukta", "Noto Sans Devanagari", system-ui, sans-serif', google: "Mukta:wght@400;500;600;700", headingWeight: 700, category: "devanagari" },
  Hind: { stack: '"Hind", "Noto Sans Devanagari", system-ui, sans-serif', google: "Hind:wght@400;500;600;700", headingWeight: 600, category: "devanagari" },
  "Noto Serif Devanagari": { stack: '"Noto Serif Devanagari", Georgia, serif', google: "Noto+Serif+Devanagari:wght@400;600;700", headingWeight: 600, category: "devanagari" },
  "System UI": { stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", google: "", headingWeight: 700, category: "sans" },
};

export const FONT_NAMES = Object.keys(FONTS);

type PresetSeed = Omit<ThemePreset, "colors"> & { colors: Omit<ThemeColors, "accentText" | "darkText"> & Partial<Pick<ThemeColors, "accentText" | "darkText">> };

const SEEDS: PresetSeed[] = [
  {
    preset: "editorial",
    label: "Premium editorial",
    description: "Magazine-style serif headlines, generous margins. Consultants, authors, architects.",
    colors: { bg: "#faf8f3", surface: "#f0ebe1", text: "#1b1a17", muted: "#5d574d", accent: "#8a3b22", secondary: "#c99a3c", dark: "#1b1a17", border: "#e2dacb" },
    fontHeading: "Instrument Serif",
    fontBody: "Inter",
    radius: "sharp",
    buttonShape: "square",
    cardStyle: "flat",
    contentWidth: "narrow",
    headingStyle: "light",
    typeScale: "large",
    motion: "subtle",
  },
  {
    preset: "saas",
    label: "Modern SaaS",
    description: "Crisp sans-serif, indigo accents, product-led. Apps and software.",
    colors: { bg: "#ffffff", surface: "#f5f6fb", text: "#0f1222", muted: "#4b5168", accent: "#4f46e5", secondary: "#06b6d4", dark: "#0b0d1a", border: "#e3e5ef" },
    fontHeading: "Plus Jakarta Sans",
    fontBody: "Inter",
    radius: "soft",
    buttonShape: "rounded",
    cardStyle: "bordered",
    contentWidth: "normal",
    headingStyle: "bold",
    typeScale: "normal",
    motion: "subtle",
  },
  {
    preset: "corporate",
    label: "Professional corporate",
    description: "Trustworthy navy and clean grids. Firms, finance, B2B services.",
    colors: { bg: "#ffffff", surface: "#f2f5f9", text: "#0d1b2e", muted: "#46566b", accent: "#0b4f8a", secondary: "#2a9d8f", dark: "#0b1a2c", border: "#dbe3ec" },
    fontHeading: "Manrope",
    fontBody: "Manrope",
    radius: "soft",
    buttonShape: "rounded",
    cardStyle: "bordered",
    contentWidth: "normal",
    headingStyle: "bold",
    typeScale: "normal",
    motion: "none",
  },
  {
    preset: "studio",
    label: "Bold creative studio",
    description: "Oversized type, high contrast, punchy colour. Agencies and creators.",
    colors: { bg: "#f4f1ea", surface: "#e9e4d8", text: "#111111", muted: "#4a4a4a", accent: "#ff4a1c", secondary: "#2b59ff", dark: "#111111", border: "#d8d1c2" },
    fontHeading: "Syne",
    fontBody: "Work Sans",
    radius: "sharp",
    buttonShape: "square",
    cardStyle: "flat",
    contentWidth: "wide",
    headingStyle: "uppercase",
    typeScale: "large",
    motion: "subtle",
  },
  {
    preset: "luxury",
    label: "Elegant luxury",
    description: "Ink and gold, refined serif, quiet confidence. Jewellery, salons, fashion.",
    colors: { bg: "#fbfaf7", surface: "#f1ede4", text: "#16130f", muted: "#5b544a", accent: "#8a6a1f", secondary: "#3d2f1c", dark: "#14110d", border: "#e0d8c8" },
    fontHeading: "Cormorant Garamond",
    fontBody: "DM Sans",
    radius: "sharp",
    buttonShape: "square",
    cardStyle: "flat",
    contentWidth: "narrow",
    headingStyle: "normal",
    typeScale: "large",
    motion: "subtle",
  },
  {
    preset: "minimal",
    label: "Minimal portfolio",
    description: "Black and white, lots of air, work first. Photographers, designers.",
    colors: { bg: "#ffffff", surface: "#f4f4f4", text: "#111111", muted: "#5c5c5c", accent: "#111111", secondary: "#8c8c8c", dark: "#111111", border: "#e2e2e2" },
    fontHeading: "DM Sans",
    fontBody: "DM Sans",
    radius: "sharp",
    buttonShape: "square",
    cardStyle: "flat",
    contentWidth: "wide",
    headingStyle: "normal",
    typeScale: "normal",
    motion: "subtle",
  },
  {
    preset: "vibrant",
    label: "Vibrant consumer brand",
    description: "Joyful colour pops and friendly rounded shapes. D2C, food, kids, lifestyle.",
    colors: { bg: "#fffaf3", surface: "#ffeedd", text: "#22152b", muted: "#5d4a63", accent: "#e8366d", secondary: "#ffb01f", dark: "#2b1236", border: "#f6dcc8" },
    fontHeading: "Bricolage Grotesque",
    fontBody: "Nunito",
    radius: "round",
    buttonShape: "pill",
    cardStyle: "elevated",
    contentWidth: "normal",
    headingStyle: "bold",
    typeScale: "large",
    motion: "subtle",
  },
  {
    preset: "local",
    label: "Local business",
    description: "Warm terracotta and cream, approachable. Shops, clinics, home services.",
    colors: { bg: "#fbf6ee", surface: "#f3e9dc", text: "#211a15", muted: "#5f5246", accent: "#b4492a", secondary: "#2b5f5c", dark: "#2a1f19", border: "#e3d5c4" },
    fontHeading: "Fraunces",
    fontBody: "Manrope",
    radius: "soft",
    buttonShape: "rounded",
    cardStyle: "bordered",
    contentWidth: "normal",
    headingStyle: "normal",
    typeScale: "normal",
    motion: "subtle",
  },
  {
    preset: "hospitality",
    label: "Restaurant & hospitality",
    description: "Rich deep tones and appetising warmth. Restaurants, cafés, hotels.",
    colors: { bg: "#fdf8f1", surface: "#f4e7d6", text: "#2a1a12", muted: "#6a5143", accent: "#9c2f1f", secondary: "#d89a2b", dark: "#24140d", border: "#ead8c2" },
    fontHeading: "DM Serif Display",
    fontBody: "Work Sans",
    radius: "soft",
    buttonShape: "pill",
    cardStyle: "elevated",
    contentWidth: "normal",
    headingStyle: "normal",
    typeScale: "large",
    motion: "subtle",
  },
  {
    preset: "dark-tech",
    label: "Dark technology",
    description: "Dark mode with electric accents. Software, AI, gaming, dev tools.",
    colors: { bg: "#0b0d12", surface: "#141821", text: "#eef0f6", muted: "#a3a9ba", accent: "#7c6cff", secondary: "#22d3ee", dark: "#06070a", border: "#252a37" },
    fontHeading: "Space Grotesk",
    fontBody: "Inter",
    radius: "soft",
    buttonShape: "rounded",
    cardStyle: "bordered",
    contentWidth: "normal",
    headingStyle: "bold",
    typeScale: "normal",
    motion: "subtle",
  },
  {
    preset: "organic",
    label: "Warm & organic",
    description: "Leafy greens and earthy calm. Wellness, yoga, organic food, eco brands.",
    colors: { bg: "#f7f6ef", surface: "#e9ecdc", text: "#1c2414", muted: "#4f5a44", accent: "#3d6b2f", secondary: "#c2853d", dark: "#1a2412", border: "#d8dcc6" },
    fontHeading: "Lora",
    fontBody: "Nunito",
    radius: "round",
    buttonShape: "pill",
    cardStyle: "flat",
    contentWidth: "normal",
    headingStyle: "normal",
    typeScale: "normal",
    motion: "subtle",
  },
  {
    preset: "playful",
    label: "Playful startup",
    description: "Bright, bouncy and optimistic. Early-stage startups, communities, events.",
    colors: { bg: "#ffffff", surface: "#f2f0ff", text: "#1d1736", muted: "#55507a", accent: "#6d28d9", secondary: "#f97316", dark: "#1d1736", border: "#e4e0fa" },
    fontHeading: "Outfit",
    fontBody: "DM Sans",
    radius: "round",
    buttonShape: "pill",
    cardStyle: "elevated",
    contentWidth: "normal",
    headingStyle: "bold",
    typeScale: "large",
    motion: "subtle",
  },
];

/** Older preset ids (saved projects, templates) → current directions. */
const PRESET_ALIASES: Record<string, string> = { warm: "local", clean: "corporate", premium: "luxury", fresh: "organic", bold: "studio", calm: "corporate", night: "dark-tech" };

export function resolvePresetId(id: unknown): string {
  const s = typeof id === "string" ? id : "";
  return PRESET_ALIASES[s] ?? s;
}

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick black or white text for legibility on the given background. */
export function readableTextOn(bg: string): string {
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#111111") ? "#ffffff" : "#111111";
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Nudge `fg` toward black or white until it reaches `min` contrast on `bg`. */
export function ensureContrastOn(fg: string, bg: string, min: number): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const target = luminance(bg) > 0.4 ? "#000000" : "#ffffff";
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = mix(fg, target, t);
    if (contrastRatio(c, bg) >= min) return c;
  }
  return target;
}

/**
 * Make any palette readable: body text ≥ 7:1 on page/surface where
 * possible (≥4.5 guaranteed), secondary text ≥ 4.5:1, button labels and
 * dark-section text chosen for maximum contrast.
 */
export function repairContrast(c: ThemeColors): ThemeColors {
  const out = { ...c };
  out.text = ensureContrastOn(ensureContrastOn(out.text, out.bg, 7), out.surface, 4.5);
  out.muted = ensureContrastOn(ensureContrastOn(out.muted, out.bg, 4.5), out.surface, 4.5);
  out.accentText = readableTextOn(out.accent);
  // Links/eyebrows in the accent colour must read on the page background.
  if (contrastRatio(out.accent, out.bg) < 3) out.accent = ensureContrastOn(out.accent, out.bg, 3);
  out.accentText = readableTextOn(out.accent);
  out.darkText = ensureContrastOn(out.darkText || readableTextOn(out.dark), out.dark, 7);
  return out;
}

function presetFromSeed(seed: PresetSeed): ThemePreset {
  const colors = repairContrast({ ...seed.colors, accentText: seed.colors.accentText ?? readableTextOn(seed.colors.accent), darkText: seed.colors.darkText ?? readableTextOn(seed.colors.dark) });
  return { ...seed, colors };
}

export const THEME_PRESETS: ThemePreset[] = SEEDS.map(presetFromSeed);

export const DEFAULT_THEME: Theme = toTheme(THEME_PRESETS.find((p) => p.preset === "local")!);

function toTheme(p: ThemePreset): Theme {
  return {
    preset: p.preset,
    colors: { ...p.colors },
    fontHeading: p.fontHeading,
    fontBody: p.fontBody,
    radius: p.radius,
    buttonShape: p.buttonShape,
    cardStyle: p.cardStyle,
    contentWidth: p.contentWidth,
    headingStyle: p.headingStyle,
    typeScale: p.typeScale,
    motion: p.motion,
  };
}

export function themeFromPreset(name: unknown): Theme {
  const id = resolvePresetId(name);
  const preset = THEME_PRESETS.find((p) => p.preset === id) ?? THEME_PRESETS.find((p) => p.preset === "local")!;
  return toTheme(preset);
}

/**
 * Apply a brand colour to a theme: becomes the accent, and the text colour
 * on buttons is recomputed so labels stay readable whatever colour is picked.
 */
export function withAccent(theme: Theme, accent: string): Theme {
  if (!isHexColor(accent)) return theme;
  return { ...theme, colors: repairContrast({ ...theme.colors, accent: accent.toLowerCase(), accentText: readableTextOn(accent) }) };
}

const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : fallback);

/** Coerce untrusted theme data to a valid Theme (unknown fields dropped, bad values replaced). */
export function normalizeTheme(raw: unknown, opts: { repair?: boolean } = {}): Theme {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<Theme> & { colors?: Partial<ThemeColors> };
  const base = themeFromPreset(input.preset);
  const colors = { ...base.colors };
  let changed = false;
  if (input.colors && typeof input.colors === "object") {
    for (const key of Object.keys(colors) as (keyof ThemeColors)[]) {
      const v = input.colors[key];
      if (isHexColor(v)) {
        colors[key] = v.toLowerCase();
        changed = true;
      }
    }
  }
  return {
    preset: base.preset,
    // Saved/edited palettes are the user's choice and kept as-is unless a
    // caller (AI output) asks for repair.
    colors: opts.repair && changed ? repairContrast(colors) : colors,
    fontHeading: typeof input.fontHeading === "string" && input.fontHeading in FONTS ? input.fontHeading : base.fontHeading,
    fontBody: typeof input.fontBody === "string" && input.fontBody in FONTS ? input.fontBody : base.fontBody,
    radius: pick(input.radius, ["sharp", "soft", "round"] as const, base.radius),
    buttonShape: pick(input.buttonShape, ["square", "rounded", "pill"] as const, base.buttonShape),
    cardStyle: pick(input.cardStyle, ["flat", "bordered", "elevated"] as const, base.cardStyle),
    contentWidth: pick(input.contentWidth, ["narrow", "normal", "wide"] as const, base.contentWidth),
    headingStyle: pick(input.headingStyle, ["normal", "bold", "uppercase", "light"] as const, base.headingStyle),
    typeScale: pick(input.typeScale, ["compact", "normal", "large"] as const, base.typeScale),
    motion: pick(input.motion, ["none", "subtle"] as const, base.motion),
  };
}
