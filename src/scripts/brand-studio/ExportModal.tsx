import { useState } from "preact/hooks";
import type { StudioElement } from "./types";
import type { CanvasBackground } from "./store";
import {
  renderArtboardToCanvas,
  generateSvgString,
  copyCanvasImageToClipboard,
  triggerFileDownload,
} from "./export";

interface ExportModalProps {
  isOpen: boolean;
  title: string;
  width: number;
  height: number;
  background: CanvasBackground;
  elements: StudioElement[];
  onClose: () => void;
}

export function ExportModal({
  isOpen,
  title,
  width,
  height,
  background,
  elements,
  onClose,
}: ExportModalProps) {
  const [format, setFormat] = useState<"png" | "jpeg" | "svg" | "pdf">("png");
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const sanitizedSlug =
    (title || "untitled-design")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "atittle-design";

  const handleDownload = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      if (format === "svg") {
        const svgContent = generateSvgString(width, height, background, elements, { transparentBg });
        const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
        triggerFileDownload(blob, `${sanitizedSlug}.svg`);
      } else if (format === "pdf") {
        // Trigger browser print dialog for vector-clean PDF print
        window.print();
      } else {
        const canvas = await renderArtboardToCanvas(width, height, background, elements, {
          format,
          scale: scaleFactor,
          quality: format === "jpeg" ? 0.95 : 1.0,
          transparentBg: format === "png" && transparentBg,
        });
        const mime = format === "jpeg" ? "image/jpeg" : "image/png";
        const quality = format === "jpeg" ? 0.95 : 1.0;
        const dataUrl = canvas.toDataURL(mime, quality);
        triggerFileDownload(dataUrl, `${sanitizedSlug}@${scaleFactor}x.${format}`);
      }
      onClose();
    } catch (err: any) {
      console.error("[ExportModal] Export failed:", err);
      setErrorMessage(err?.message || "Failed to render design export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const canvas = await renderArtboardToCanvas(width, height, background, elements, {
        format: "png",
        scale: 1,
        transparentBg,
      });
      const copied = await copyCanvasImageToClipboard(canvas);
      if (copied) {
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2500);
      } else {
        setErrorMessage("Clipboard copy is restricted by browser security. Please use PNG Download.");
      }
    } catch (err: any) {
      console.error("[ExportModal] Clipboard copy failed:", err);
      setErrorMessage("Could not copy to clipboard. Please download directly.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 text-stone-100 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div class="flex items-center justify-between pb-3 border-b border-stone-800">
          <div>
            <h2 class="font-display font-bold text-lg text-amber-400">Export Your Design</h2>
            <p class="text-xs text-stone-400 mt-0.5">High-DPI raster, vector SVG, or WhatsApp copy</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="text-stone-500 hover:text-stone-300 p-1 rounded-lg text-sm"
            aria-label="Close export dialog"
          >
            ✕
          </button>
        </div>

        {/* Format Selection Cards */}
        <div class="space-y-2">
          <label class="text-xs font-semibold text-stone-300 uppercase tracking-wider block">
            File Format
          </label>
          <div class="grid grid-cols-2 gap-2.5">
            {[
              { id: "png", name: "PNG (Crisp)", desc: "Best for WhatsApp, Social & Web" },
              { id: "jpeg", name: "JPEG (Standard)", desc: "Compressed photo-ready" },
              { id: "svg", name: "Vector SVG", desc: "Infinitely scalable vector" },
              { id: "pdf", name: "Print PDF", desc: "Standard print workflow" },
            ].map((f) => (
              <div
                key={f.id}
                onClick={() => setFormat(f.id as any)}
                class={`p-3 rounded-xl border cursor-pointer transition-all ${
                  format === f.id
                    ? "border-amber-500 bg-amber-500/10 text-white shadow-sm"
                    : "border-stone-800 bg-stone-950/60 hover:bg-stone-950 text-stone-300"
                }`}
              >
                <div class="text-xs font-bold">{f.name}</div>
                <div class="text-[10px] text-stone-400 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transparent Background Option (for PNG / SVG Logos) */}
        {(format === "png" || format === "svg") && (
          <label class="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl border border-stone-800 bg-stone-950/60 hover:bg-stone-950 text-xs text-stone-200 transition-colors">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg((e.target as HTMLInputElement).checked)}
              class="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
            />
            <div class="flex flex-col">
              <span class="font-bold text-amber-300">Transparent Background</span>
              <span class="text-[10px] text-stone-400">Removes canvas background fill (essential for logos & watermarks)</span>
            </div>
          </label>
        )}

        {/* Resolution Quality (for PNG/JPEG) */}
        {(format === "png" || format === "jpeg") && (
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Resolution Scaling
              </label>
              <span class="text-xs font-mono text-amber-400">
                {width * scaleFactor} × {height * scaleFactor} px
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              {[
                { label: "1x (Standard)", val: 1 },
                { label: "2x (Retina)", val: 2 },
                { label: "3x (Ultra 4K)", val: 3 },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setScaleFactor(s.val)}
                  class={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    scaleFactor === s.val
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                      : "border-stone-800 bg-stone-950/60 hover:bg-stone-950 text-stone-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div class="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Notification pill */}
        {copiedNotification && (
          <div class="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-semibold">
            ✓ Copied to clipboard! Ready to paste directly into WhatsApp or Slack.
          </div>
        )}

        {/* Action Buttons */}
        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleCopyClipboard}
            class="flex-1 py-2.5 px-3 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-xs font-semibold text-stone-200 transition-colors"
          >
            📋 Copy to Clipboard
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-stone-950 text-xs font-bold shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isExporting ? "Rendering..." : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
