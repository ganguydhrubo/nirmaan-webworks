/**
 * Design-based image fallbacks: abstract compositions drawn in the site's
 * own theme colours and rasterised to a real image file, so they persist and
 * export like any other image. Always stored with source "illustration" and
 * labelled as such — never presented as a photo or as AI-generated.
 */
import { validateAsset, type Asset } from "@/lib/builder/schema";
import type { ThemeColors } from "@/lib/builder/themes";

export type IllustrationStyle = "waves" | "shapes" | "arcs" | "grid" | "sunrise" | "mesh";
export const ILLUSTRATION_STYLES: { id: IllustrationStyle; label: string }[] = [
  { id: "mesh", label: "Soft mesh" },
  { id: "waves", label: "Waves" },
  { id: "shapes", label: "Shapes" },
  { id: "arcs", label: "Arcs" },
  { id: "grid", label: "Grid" },
  { id: "sunrise", label: "Sunrise" },
];

/** Small deterministic PRNG so "shuffle" is reproducible per seed. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function illustrationSvg(style: IllustrationStyle, c: ThemeColors, w: number, h: number, seed: number): string {
  const r = rng(seed);
  const pal = [c.accent, c.secondary, c.dark, c.surface];
  const pickc = () => pal[Math.floor(r() * pal.length)]!;
  let body = "";
  switch (style) {
    case "mesh": {
      body += `<rect width="${w}" height="${h}" fill="${c.surface}"/>`;
      for (let i = 0; i < 5; i++) {
        const cx = r() * w;
        const cy = r() * h;
        const rad = (0.35 + r() * 0.45) * Math.max(w, h);
        body += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="url(#g${i % 2})" opacity="${(0.45 + r() * 0.4).toFixed(2)}"/>`;
      }
      return wrap(w, h, `<defs><radialGradient id="g0"><stop offset="0" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient><radialGradient id="g1"><stop offset="0" stop-color="${c.secondary}"/><stop offset="1" stop-color="${c.secondary}" stop-opacity="0"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="${(Math.min(w, h) / 14).toFixed(0)}"/></filter></defs><g filter="url(#b)">${body}</g>`);
    }
    case "waves": {
      body += `<rect width="${w}" height="${h}" fill="${c.surface}"/>`;
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const y0 = h * (0.35 + i * 0.13);
        const amp = h * (0.05 + r() * 0.06);
        const k = 1.5 + r() * 1.5;
        let d = `M0 ${y0.toFixed(0)}`;
        for (let x = 0; x <= w; x += w / 24) d += ` L${x.toFixed(0)} ${(y0 + Math.sin((x / w) * Math.PI * k + i) * amp).toFixed(0)}`;
        d += ` L${w} ${h} L0 ${h} Z`;
        body += `<path d="${d}" fill="${i % 2 ? c.secondary : c.accent}" opacity="${(0.25 + i * 0.15).toFixed(2)}"/>`;
      }
      return wrap(w, h, body);
    }
    case "shapes": {
      body += `<rect width="${w}" height="${h}" fill="${c.bg}"/>`;
      for (let i = 0; i < 9; i++) {
        const x = r() * w;
        const y = r() * h;
        const s = (0.08 + r() * 0.22) * Math.min(w, h);
        const col = pickc();
        const t = Math.floor(r() * 3);
        if (t === 0) body += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(0)}" fill="${col}" opacity="0.85"/>`;
        else if (t === 1) body += `<rect x="${(x - s).toFixed(0)}" y="${(y - s).toFixed(0)}" width="${(s * 2).toFixed(0)}" height="${(s * 2).toFixed(0)}" rx="${(s * 0.3).toFixed(0)}" fill="${col}" opacity="0.85" transform="rotate(${(r() * 60 - 30).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
        else body += `<path d="M${x.toFixed(0)} ${(y - s).toFixed(0)} L${(x + s).toFixed(0)} ${(y + s).toFixed(0)} L${(x - s).toFixed(0)} ${(y + s).toFixed(0)} Z" fill="${col}" opacity="0.85"/>`;
      }
      return wrap(w, h, body);
    }
    case "arcs": {
      body += `<rect width="${w}" height="${h}" fill="${c.dark}"/>`;
      const cx = w * (0.2 + r() * 0.6);
      const cy = h * (0.9 + r() * 0.3);
      for (let i = 9; i > 0; i--) {
        const rad = (i / 9) * Math.max(w, h) * 1.05;
        body += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="none" stroke="${i % 2 ? c.accent : c.secondary}" stroke-width="${(Math.min(w, h) / 40).toFixed(0)}" opacity="${(0.25 + (9 - i) * 0.08).toFixed(2)}"/>`;
      }
      return wrap(w, h, body);
    }
    case "grid": {
      body += `<rect width="${w}" height="${h}" fill="${c.surface}"/>`;
      const cols = 8;
      const cell = w / cols;
      const rows = Math.ceil(h / cell);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          if (r() < 0.35) continue;
          const col = pickc();
          const kind = r();
          const px = x * cell;
          const py = y * cell;
          if (kind < 0.4) body += `<rect x="${px.toFixed(0)}" y="${py.toFixed(0)}" width="${cell.toFixed(0)}" height="${cell.toFixed(0)}" fill="${col}" opacity="0.9"/>`;
          else if (kind < 0.75) body += `<path d="M${px.toFixed(0)} ${py.toFixed(0)} A${cell.toFixed(0)} ${cell.toFixed(0)} 0 0 1 ${(px + cell).toFixed(0)} ${(py + cell).toFixed(0)} L${px.toFixed(0)} ${(py + cell).toFixed(0)} Z" fill="${col}" opacity="0.9"/>`;
          else body += `<circle cx="${(px + cell / 2).toFixed(0)}" cy="${(py + cell / 2).toFixed(0)}" r="${(cell / 2.4).toFixed(0)}" fill="${col}" opacity="0.9"/>`;
        }
      return wrap(w, h, body);
    }
    case "sunrise": {
      const sunY = h * (0.55 + r() * 0.15);
      body += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.surface}"/><stop offset="1" stop-color="${c.secondary}" stop-opacity="0.55"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;
      body += `<circle cx="${(w * (0.3 + r() * 0.4)).toFixed(0)}" cy="${sunY.toFixed(0)}" r="${(Math.min(w, h) * 0.22).toFixed(0)}" fill="${c.accent}"/>`;
      for (let i = 0; i < 3; i++) {
        const base = h * (0.62 + i * 0.12);
        let d = `M0 ${base.toFixed(0)}`;
        for (let x = 0; x <= w; x += w / 6) d += ` Q${(x + w / 12).toFixed(0)} ${(base - h * (0.08 + r() * 0.12)).toFixed(0)} ${(x + w / 6).toFixed(0)} ${base.toFixed(0)}`;
        d += ` L${w} ${h} L0 ${h} Z`;
        body += `<path d="${d}" fill="${c.dark}" opacity="${(0.45 + i * 0.25).toFixed(2)}"/>`;
      }
      return wrap(w, h, body);
    }
  }
}

function wrap(w: number, h: number, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
}

/** Rasterise an illustration to a validated JPEG asset (SVG itself is never stored: it can carry script). */
export async function illustrationAsset(style: IllustrationStyle, colors: ThemeColors, aspect: number, seed: number): Promise<Asset> {
  const w = 1600;
  const h = Math.round(w / aspect);
  const svg = illustrationSvg(style, colors, w, h, seed);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const asset = validateAsset({ name: `illustration-${style}`, mime: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.86), source: "illustration" });
    if (!asset) throw new Error("Couldn't create the illustration.");
    return asset;
  } finally {
    URL.revokeObjectURL(url);
  }
}
