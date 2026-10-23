import { CANVAS_PRESETS } from "./presets";

interface ToolbarTopProps {
  title: string;
  presetId: string;
  width: number;
  height: number;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onNavigateHome?: () => void;
  onTitleChange: (title: string) => void;
  onPresetChange: (presetId: string) => void;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onOpenExportModal: () => void;
  onCopyToClipboard: () => void;
}

export function ToolbarTop({
  title,
  presetId,
  width,
  height,
  zoom,
  canUndo,
  canRedo,
  onNavigateHome,
  onTitleChange,
  onPresetChange,
  onZoomChange,
  onUndo,
  onRedo,
  onClear,
  onExportJSON,
  onImportJSON,
  onOpenExportModal,
  onCopyToClipboard,
}: ToolbarTopProps) {
  return (
    <header class="studio-header">
      {/* Left: Brand Monogram, Home & Title Input */}
      <div class="studio-header-left">
        {onNavigateHome ? (
          <button
            type="button"
            onClick={onNavigateHome}
            class="studio-brand-badge"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            title="Return to Home & Templates Explorer"
          >
            <div class="studio-brand-logo">A</div>
            <span>ATITTLE <span style={{ color: "var(--studio-gold)", fontWeight: 400 }}>Brand Studio</span></span>
          </button>
        ) : (
          <a href="/free-brand-studio" class="studio-brand-badge" title="Brand Studio Home">
            <div class="studio-brand-logo">A</div>
            <span>ATITTLE <span style={{ color: "var(--studio-gold)", fontWeight: 400 }}>Brand Studio</span></span>
          </a>
        )}

        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            class="studio-icon-btn"
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px", fontSize: "11px", color: "var(--studio-text)", border: "1px solid var(--studio-border)", borderRadius: "6px" }}
            title="Browse all templates"
          >
            <span>🏠</span>
            <span>Home</span>
          </button>
        )}

        <div style={{ width: "1px", height: "20px", background: "var(--studio-border)", margin: "0 6px" }} />

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onInput={(e) => onTitleChange((e.target as HTMLInputElement).value)}
          class="studio-title-input"
          title="Click to rename design"
        />

        {/* Saved Status Indicator */}
        <div style={{ display: "flex", itemsCenter: "center", gap: "6px", fontSize: "11px", color: "var(--studio-text-muted)" }}>
          <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10b981" }} />
          <span>Saved</span>
        </div>
      </div>

      {/* Center: Format Dimension Selector & Undo/Redo */}
      <div class="studio-header-center">
        {/* Preset Selector */}
        <div class="studio-format-pill">
          <span style={{ color: "var(--studio-text-muted)" }}>Format:</span>
          <select
            value={presetId}
            onChange={(e) => onPresetChange((e.target as HTMLSelectElement).value)}
            class="studio-format-select"
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.width}x{p.height})
              </option>
            ))}
          </select>
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "var(--studio-gold)", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px" }}>
            {width} × {height}px
          </span>
        </div>

        {/* Undo / Redo */}
        <div class="studio-btn-group">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            class="studio-icon-btn"
            title="Undo (Ctrl+Z)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l6-6M3 10l6 6" />
            </svg>
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            class="studio-icon-btn"
            title="Redo (Ctrl+Y)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10H11a5 5 0 0 0-5 5v2M21 10l-6-6M21 10l-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right: Copy to WhatsApp, Backup & Export */}
      <div class="studio-header-right">
        {/* Copy to WhatsApp Button */}
        <button
          type="button"
          onClick={onCopyToClipboard}
          class="studio-icon-btn"
          style={{ border: "1px solid var(--studio-border)", padding: "6px 12px", gap: "6px", color: "#10b981", fontWeight: 600 }}
          title="Direct clipboard image copy for instant WhatsApp paste"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy Image</span>
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={onClear}
          class="studio-icon-btn"
          style={{ color: "#ef4444" }}
          title="Clear Canvas"
        >
          Clear
        </button>

        {/* Export / Download CTA */}
        <button
          type="button"
          onClick={onOpenExportModal}
          class="studio-btn-export"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <span>Export Design</span>
        </button>
      </div>
    </header>
  );
}
