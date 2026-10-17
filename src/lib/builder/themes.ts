/**
 * Theme presets and font allowlist for generated websites.
 *
 * The preset idea (a named palette + font pairing the AI picks by "vibe")
 * follows OpenPage's theme-presets.ts (MIT, see CREDITS.md), reduced to the
 * handful of semantic colours our own renderer actually uses.
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
  /** Buttons, links, highlights */
  accent: string;
  /** Text on top of accent */
  accentText: string;
  /** Dark section background (footer, bands) */
  dark: string;
  /** Text on dark sections */
  darkText: string;
  /** Hairlines and card borders */
  border: string;
}

export type RadiusStyle = "sharp" | "soft" | "round";

export interface Theme {
  preset: string;
  colors: ThemeColors;
  fontHeading: string;
  fontBody: string;
  radius: RadiusStyle;
}

export interface ThemePreset extends Theme {
  label: string;
  description: string;
}

export const FONTS: Record<string, { stack: string; google: string }> = {
  Inter: { stack: '"Inter", system-ui, sans-serif', google: "Inter:wght@400;500;600;700" },
  Manrope: { stack: '"Manrope", system-ui, sans-serif', google: "Manrope:wght@400;500;600;700" },
  Poppins: { stack: '"Poppins", system-ui, sans-serif', google: "Poppins:wght@400;500;600;700" },
  "DM Sans": { stack: '"DM Sans", system-ui, sans-serif', google: "DM+Sans:wght@400;500;600;700" },
  "Work Sans": { stack: '"Work Sans", system-ui, sans-serif', google: "Work+Sans:wght@400;500;600;700" },
  Outfit: { stack: '"Outfit", system-ui, sans-serif', google: "Outfit:wght@400;500;600;700" },
  "Space Grotesk": { stack: '"Space Grotesk", system-ui, sans-serif', google: "Space+Grotesk:wght@400;500;600;700" },
  Nunito: { stack: '"Nunito", system-ui, sans-serif', google: "Nunito:wght@400;600;700;800" },
  Fraunces: { stack: '"Fraunces", Georgia, serif', google: "Fraunces:wght@400;600;700" },
  "Playfair Display": { stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;600;700" },
  Lora: { stack: '"Lora", Georgia, serif', google: "Lora:wght@400;600;700" },
  Merriweather: { stack: '"Merriweather", Georgia, serif', google: "Merriweather:wght@400;700" },
  "System UI": { stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", google: "" },
};

export const FONT_NAMES = Object.keys(FONTS);

export const THEME_PRESETS: ThemePreset[] = [
  {
    preset: "warm",
    label: "Warm & welcoming",
    description: "Terracotta and cream. Cafés, home businesses, wellness.",
    colors: { bg: "#fbf6ee", surface: "#f3e9dc", text: "#211a15", muted: "#5f5246", accent: "#b4492a", accentText: "#ffffff", dark: "#2a1f19", darkText: "#f7efe6", border: "#e3d5c4" },
    fontHeading: "Fraunces",
    fontBody: "Manrope",
    radius: "soft",
  },
  {
    preset: "clean",
    label: "Clean & professional",
    description: "White and confident blue. Consultants, clinics, services.",
    colors: { bg: "#ffffff", surface: "#f3f6fb", text: "#0f172a", muted: "#475569", accent: "#1d4ed8", accentText: "#ffffff", dark: "#0b1324", darkText: "#e2e8f0", border: "#dbe3ee" },
    fontHeading: "Inter",
    fontBody: "Inter",
    radius: "soft",
  },
  {
    preset: "premium",
    label: "Premium & elegant",
    description: "Ink black with gold. Jewellery, salons, luxury, law.",
    colors: { bg: "#fbfaf7", surface: "#f1ede4", text: "#16130f", muted: "#5b544a", accent: "#8a6a1f", accentText: "#ffffff", dark: "#14110d", darkText: "#efe7d6", border: "#e0d8c8" },
    fontHeading: "Playfair Display",
    fontBody: "DM Sans",
    radius: "sharp",
  },
  {
    preset: "fresh",
    label: "Fresh & natural",
    description: "Leafy green. Organic food, yoga, gardening, eco brands.",
    colors: { bg: "#f8faf5", surface: "#ebf2e3", text: "#16220f", muted: "#4d5c44", accent: "#2f6b2a", accentText: "#ffffff", dark: "#15230f", darkText: "#e7f0de", border: "#d5e2c8" },
    fontHeading: "Outfit",
    fontBody: "Nunito",
    radius: "round",
  },
  {
    preset: "bold",
    label: "Bold & energetic",
    description: "High-contrast coral. Gyms, events, creators, startups.",
    colors: { bg: "#ffffff", surface: "#fff1ec", text: "#1a1a1a", muted: "#555555", accent: "#d63d1f", accentText: "#ffffff", dark: "#111111", darkText: "#f5f5f5", border: "#f0d9d1" },
    fontHeading: "Space Grotesk",
    fontBody: "Work Sans",
    radius: "sharp",
  },
  {
    preset: "calm",
    label: "Calm & trustworthy",
    description: "Soft teal. Healthcare, therapy, education, finance.",
    colors: { bg: "#f7fbfb", surface: "#e6f1f0", text: "#102726", muted: "#46605e", accent: "#1f6460", accentText: "#ffffff", dark: "#102726", darkText: "#e0efed", border: "#cfe2e0" },
    fontHeading: "Lora",
    fontBody: "Inter",
    radius: "soft",
  },
  {
    preset: "minimal",
    label: "Minimal & modern",
    description: "Black and white. Portfolios, architects, photographers.",
    colors: { bg: "#ffffff", surface: "#f4f4f4", text: "#111111", muted: "#5c5c5c", accent: "#111111", accentText: "#ffffff", dark: "#111111", darkText: "#f2f2f2", border: "#e2e2e2" },
    fontHeading: "DM Sans",
    fontBody: "DM Sans",
    radius: "sharp",
  },
  {
    preset: "night",
    label: "Dark & techy",
    description: "Dark mode with electric violet. Software, gaming, agencies.",
    colors: { bg: "#0e0f14", surface: "#171922", text: "#f2f3f7", muted: "#a3a8b8", accent: "#8b7cf6", accentText: "#0e0f14", dark: "#08090c", darkText: "#e6e8ef", border: "#262936" },
    fontHeading: "Space Grotesk",
    fontBody: "Inter",
    radius: "soft",
  },
];

export const DEFAULT_THEME: Theme = toTheme(THEME_PRESETS[0]!);

function toTheme(p: ThemePreset): Theme {
  return { preset: p.preset, colors: { ...p.colors }, fontHeading: p.fontHeading, fontBody: p.fontBody, radius: p.radius };
}

export function themeFromPreset(name: unknown): Theme {
  const preset = THEME_PRESETS.find((p) => p.preset === name) ?? THEME_PRESETS[0]!;
  return toTheme(preset);
}

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

/**
 * Apply a brand colour to a theme: becomes the accent, and the text colour
 * on buttons is recomputed so labels stay readable whatever colour is picked.
 */
export function withAccent(theme: Theme, accent: string): Theme {
  if (!isHexColor(accent)) return theme;
  return { ...theme, colors: { ...theme.colors, accent: accent.toLowerCase(), accentText: readableTextOn(accent) } };
}

/** Coerce untrusted theme data to a valid Theme (unknown fields dropped, bad values replaced). */
export function normalizeTheme(raw: unknown): Theme {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<Theme> & { colors?: Partial<ThemeColors> };
  const base = themeFromPreset(input.preset);
  const colors = { ...base.colors };
  if (input.colors && typeof input.colors === "object") {
    for (const key of Object.keys(colors) as (keyof ThemeColors)[]) {
      const v = input.colors[key];
      if (isHexColor(v)) colors[key] = v.toLowerCase();
    }
  }
  return {
    preset: base.preset,
    colors,
    fontHeading: typeof input.fontHeading === "string" && input.fontHeading in FONTS ? input.fontHeading : base.fontHeading,
    fontBody: typeof input.fontBody === "string" && input.fontBody in FONTS ? input.fontBody : base.fontBody,
    radius: input.radius === "sharp" || input.radius === "soft" || input.radius === "round" ? input.radius : base.radius,
  };
}
