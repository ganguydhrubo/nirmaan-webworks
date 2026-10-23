import type { StudioElement, TextElement, ShapeElement, ImageElement, IconElement } from "./types";
import type { CanvasBackground } from "./store";

export interface ExportOptions {
  format: "png" | "jpeg" | "svg" | "pdf";
  scale: number;
  quality?: number;
  transparentBg?: boolean;
}

export async function renderArtboardToCanvas(
  width: number,
  height: number,
  background: CanvasBackground,
  elements: StudioElement[],
  options: ExportOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const scale = options.scale || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas rendering context");

  ctx.scale(scale, scale);

  // 1. Draw Background (unless transparent PNG)
  if (!options.transparentBg) {
    if (background.type === "gradient") {
      const angleRad = ((background.gradientAngle || 135) * Math.PI) / 180;
      const x2 = Math.cos(angleRad) * width;
      const y2 = Math.sin(angleRad) * height;
      const grad = ctx.createLinearGradient(0, 0, Math.abs(x2), Math.abs(y2));
      grad.addColorStop(0, background.color);
      grad.addColorStop(1, background.gradientEnd || "#000000");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // 2. Draw Elements sequentially
  for (const el of elements) {
    ctx.save();
    ctx.globalAlpha = el.opacity;
    ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-(el.width / 2), -(el.height / 2));

    if (el.type === "shape") {
      const s = el as ShapeElement;
      ctx.fillStyle = s.fillColor;

      if (s.shadow) {
        ctx.shadowColor = s.shadow.color;
        ctx.shadowBlur = s.shadow.blur;
        ctx.shadowOffsetX = s.shadow.offsetX;
        ctx.shadowOffsetY = s.shadow.offsetY;
      }

      if (s.shapeKind === "circle") {
        ctx.beginPath();
        ctx.arc(s.width / 2, s.height / 2, s.width / 2, 0, Math.PI * 2);
        ctx.fill();
        if (s.strokeColor && s.strokeWidth) {
          ctx.strokeStyle = s.strokeColor;
          ctx.lineWidth = s.strokeWidth;
          ctx.stroke();
        }
      } else {
        const radius = s.shapeKind === "pill" ? s.height / 2 : s.borderRadius || 0;
        drawRoundedRectPath(ctx, 0, 0, s.width, s.height, radius);
        ctx.fill();
        if (s.strokeColor && s.strokeWidth) {
          ctx.strokeStyle = s.strokeColor;
          ctx.lineWidth = s.strokeWidth;
          ctx.stroke();
        }
      }
    } else if (el.type === "text") {
      const t = el as TextElement;

      if (t.backgroundColor) {
        ctx.fillStyle = t.backgroundColor;
        drawRoundedRectPath(ctx, 0, 0, t.width, t.height, t.borderRadius || 0);
        ctx.fill();
      }

      if (t.shadow) {
        ctx.shadowColor = t.shadow.color;
        ctx.shadowBlur = t.shadow.blur;
        ctx.shadowOffsetX = t.shadow.offsetX;
        ctx.shadowOffsetY = t.shadow.offsetY;
      }

      ctx.fillStyle = t.color;
      const fontStyle = t.fontStyle === "italic" ? "italic " : "";
      const fontWeight = t.fontWeight === "bold" || t.fontWeight === "800" ? "bold " : "";
      ctx.font = `${fontStyle}${fontWeight}${t.fontSize}px ${t.fontFamily}, Manrope, sans-serif`;
      ctx.textAlign = t.textAlign;
      ctx.textBaseline = "middle";

      const textX =
        t.textAlign === "center"
          ? t.width / 2
          : t.textAlign === "right"
          ? t.width - 12
          : 12;
      const textY = t.height / 2;

      const lines = t.content.split("\n");
      const lineSpacing = t.fontSize * (t.lineHeight || 1.25);
      const startY = textY - ((lines.length - 1) * lineSpacing) / 2;

      lines.forEach((line, i) => {
        let printText = line;
        if (t.textTransform === "uppercase") printText = line.toUpperCase();
        if (t.textTransform === "lowercase") printText = line.toLowerCase();
        ctx.fillText(printText, textX, startY + i * lineSpacing);
      });
    } else if (el.type === "image") {
      const imgEl = el as ImageElement;
      try {
        const img = await loadHtmlImage(imgEl.src);
        if (imgEl.borderRadius) {
          ctx.beginPath();
          drawRoundedRectPath(ctx, 0, 0, imgEl.width, imgEl.height, imgEl.borderRadius);
          ctx.clip();
        }
        ctx.drawImage(img, 0, 0, imgEl.width, imgEl.height);
      } catch {
        ctx.fillStyle = "#27272a";
        ctx.fillRect(0, 0, imgEl.width, imgEl.height);
      }
    } else if (el.type === "icon") {
      const ic = el as IconElement;
      ctx.fillStyle = ic.color;
      const p = new Path2D(ic.svgPath);
      ctx.fill(p);
    }

    ctx.restore();
  }

  return canvas;
}

export function generateSvgString(
  width: number,
  height: number,
  background: CanvasBackground,
  elements: StudioElement[],
  options?: { transparentBg?: boolean }
): string {
  const bgFill = options?.transparentBg
    ? ""
    : background.type === "solid"
    ? `<rect width="${width}" height="${height}" fill="${background.color}"/>`
    : `<defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${background.color}" />
          <stop offset="100%" stop-color="${background.gradientEnd || "#000000"}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>`;

  const elementSvg = elements
    .map((el) => {
      const transform = `transform="translate(${el.x}, ${el.y}) rotate(${el.rotation} ${el.width / 2} ${el.height / 2})" opacity="${el.opacity}"`;

      if (el.type === "shape") {
        const s = el as ShapeElement;
        const strokeAttr = s.strokeColor && s.strokeWidth ? `stroke="${s.strokeColor}" stroke-width="${s.strokeWidth}"` : "";
        if (s.shapeKind === "circle") {
          return `<g ${transform}><circle cx="${s.width / 2}" cy="${s.height / 2}" r="${s.width / 2}" fill="${s.fillColor}" ${strokeAttr}/></g>`;
        }
        const radius = s.shapeKind === "pill" ? s.height / 2 : s.borderRadius || 0;
        return `<g ${transform}><rect width="${s.width}" height="${s.height}" rx="${radius}" fill="${s.fillColor}" ${strokeAttr}/></g>`;
      }

      if (el.type === "text") {
        const t = el as TextElement;
        const anchor = t.textAlign === "center" ? "middle" : t.textAlign === "right" ? "end" : "start";
        const xPos = t.textAlign === "center" ? t.width / 2 : t.textAlign === "right" ? t.width - 10 : 10;
        const lines = t.content.split("\n");
        const lineH = t.fontSize * (t.lineHeight || 1.2);
        const yStart = t.height / 2 - ((lines.length - 1) * lineH) / 2;

        const tspans = lines
          .map((line, idx) => `<tspan x="${xPos}" y="${yStart + idx * lineH}">${escapeXml(line)}</tspan>`)
          .join("");

        return `<g ${transform}><text font-family="${t.fontFamily}, sans-serif" font-size="${t.fontSize}" font-weight="${t.fontWeight}" fill="${t.color}" text-anchor="${anchor}">${tspans}</text></g>`;
      }

      if (el.type === "image") {
        const img = el as ImageElement;
        return `<g ${transform}><image href="${img.src}" width="${img.width}" height="${img.height}" preserveAspectRatio="xMidYMid slice"/></g>`;
      }

      return "";
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${bgFill}
  ${elementSvg}
</svg>`;
}

export async function copyCanvasImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.clipboard?.write) return false;
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        resolve(true);
      } catch {
        resolve(false);
      }
    }, "image/png");
  });
}

export function triggerFileDownload(dataUrlOrBlob: string | Blob, filename: string) {
  const url = typeof dataUrlOrBlob === "string" ? dataUrlOrBlob : URL.createObjectURL(dataUrlOrBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof dataUrlOrBlob !== "string") {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
