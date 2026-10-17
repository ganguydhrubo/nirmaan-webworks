/**
 * Image uploads: decode in the browser, downscale to a sensible web size,
 * and re-encode. Re-encoding also strips camera metadata (EXIF GPS etc.)
 * so uploaded photos don't leak location data into the published site.
 */
import { MAX_ASSET_BYTES, validateAsset, type Asset } from "@/lib/builder/schema";

const MAX_DIMENSION = 1800;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPT_ATTR = ACCEPTED.join(",");
const MAX_INPUT_BYTES = 15_000_000;

export async function processUpload(file: File): Promise<Asset> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Please choose a JPG, PNG, WebP or GIF image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is too large (over 15 MB). Please choose a smaller one.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file couldn't be read as an image.");
  });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const transparent = file.type !== "image/jpeg" && hasTransparency(ctx, w, h);
  let dataUrl = transparent ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.84);
  // Step quality down until the image fits the per-image cap.
  for (const q of [0.72, 0.6, 0.5]) {
    if (dataUrl.length * 0.75 <= MAX_ASSET_BYTES || transparent) break;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  const mime = dataUrl.slice(5, dataUrl.indexOf(";")) as Asset["mime"];
  const asset = validateAsset({ name: file.name.replace(/\.[^.]+$/, ""), mime, dataUrl });
  if (!asset) throw new Error(`This image is still too large after compressing. Please use one under ${Math.round(MAX_ASSET_BYTES / 1_000_000)} MB.`);
  return asset;
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const step = Math.max(1, Math.floor(Math.max(w, h) / 200));
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3]! < 250) return true;
    }
  }
  return false;
}
