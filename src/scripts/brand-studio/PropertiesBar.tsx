import { GOOGLE_FONTS } from "./fonts";
import type { StudioElement, TextElement, ShapeElement, ImageElement } from "./types";

interface PropertiesBarProps {
  element: StudioElement | null;
  onUpdate: (id: string, updates: Partial<StudioElement>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
}

export function PropertiesBar({
  element,
  onUpdate,
  onDuplicate,
  onDelete,
  onReorder,
}: PropertiesBarProps) {
  if (!element) {
    return (
      <div class="studio-props-bar" style={{ justifyContent: "center", color: "var(--studio-text-muted)", fontSize: "12px" }}>
        <span>✨ Select any element on canvas to customize typography, colors, layers, borders & effects</span>
      </div>
    );
  }

  return (
    <div class="studio-props-bar">
      {/* Left: Element-Specific Properties */}
      <div class="studio-props-left">
        {/* TEXT CONTROLS */}
        {element.type === "text" && (
          <TextProperties
            el={element as TextElement}
            onUpdate={(updates) => onUpdate(element.id, updates)}
          />
        )}

        {/* SHAPE CONTROLS */}
        {element.type === "shape" && (
          <ShapeProperties
            el={element as ShapeElement}
            onUpdate={(updates) => onUpdate(element.id, updates)}
          />
        )}

        {/* IMAGE CONTROLS */}
        {element.type === "image" && (
          <ImageProperties
            el={element as ImageElement}
            onUpdate={(updates) => onUpdate(element.id, updates)}
          />
        )}
      </div>

      {/* Right: Common Action Tools (Opacity, Duplicate, Layers, Delete) */}
      <div class="studio-props-right">
        {/* Opacity Control */}
        <div class="studio-color-pill">
          <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>Opacity:</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={element.opacity}
            onInput={(e) =>
              onUpdate(element.id, { opacity: parseFloat((e.target as HTMLInputElement).value) })
            }
            style={{ width: "60px", accentColor: "var(--studio-selection)" }}
          />
          <span style={{ fontSize: "10px", fontFamily: "monospace", width: "28px" }}>
            {Math.round(element.opacity * 100)}%
          </span>
        </div>

        {/* Duplicate */}
        <button
          type="button"
          onClick={() => onDuplicate(element.id)}
          class="studio-icon-btn"
          title="Duplicate Element"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>

        {/* Layer Forward */}
        <button
          type="button"
          onClick={() => onReorder(element.id, "up")}
          class="studio-icon-btn"
          title="Bring Forward"
        >
          ▲
        </button>

        {/* Layer Backward */}
        <button
          type="button"
          onClick={() => onReorder(element.id, "down")}
          class="studio-icon-btn"
          title="Send Backward"
        >
          ▼
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(element.id)}
          class="studio-icon-btn"
          style={{ color: "#ef4444" }}
          title="Delete (Del)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TextProperties({
  el,
  onUpdate,
}: {
  el: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
}) {
  const fontFamilies = GOOGLE_FONTS.map((val) => ({ label: val, val }));

  return (
    <>
      {/* Direct Content Input */}
      <input
        type="text"
        value={el.content}
        onInput={(e) => onUpdate({ content: (e.target as HTMLInputElement).value })}
        placeholder="Edit text content..."
        class="studio-input-sm"
        style={{
          width: "150px",
          padding: "3px 8px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid var(--studio-border)",
          background: "rgba(0,0,0,0.35)",
          color: "#fff",
        }}
        title="Edit Text Content"
      />

      {/* Font Family */}
      <select
        value={el.fontFamily}
        onChange={(e) => onUpdate({ fontFamily: (e.target as HTMLSelectElement).value })}
        class="studio-select-sm"
      >
        {fontFamilies.map((f) => (
          <option key={f.val} value={f.val}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <div class="studio-stepper">
        <button
          type="button"
          onClick={() => onUpdate({ fontSize: Math.max(10, el.fontSize - 2) })}
          class="studio-stepper-btn"
        >
          -
        </button>
        <span class="studio-stepper-val">{el.fontSize}</span>
        <button
          type="button"
          onClick={() => onUpdate({ fontSize: el.fontSize + 2 })}
          class="studio-stepper-btn"
        >
          +
        </button>
      </div>

      {/* Color Picker */}
      <div class="studio-color-pill" title="Text Color">
        <input
          type="color"
          value={el.color.startsWith("#") ? el.color : "#ffffff"}
          onInput={(e) => onUpdate({ color: (e.target as HTMLInputElement).value })}
          class="studio-color-input"
        />
        <span style={{ fontSize: "10px", fontFamily: "monospace" }}>{el.color}</span>
      </div>

      {/* Bold / Italic / Uppercase */}
      <div class="studio-btn-group">
        <button
          type="button"
          onClick={() => onUpdate({ fontWeight: el.fontWeight === "bold" ? "normal" : "bold" })}
          class={`studio-icon-btn ${el.fontWeight === "bold" ? "active" : ""}`}
          style={{ fontWeight: "bold", padding: "4px 8px" }}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ fontStyle: el.fontStyle === "italic" ? "normal" : "italic" })}
          class={`studio-icon-btn ${el.fontStyle === "italic" ? "active" : ""}`}
          style={{ fontStyle: "italic", fontFamily: "serif", padding: "4px 8px" }}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() =>
            onUpdate({ textTransform: el.textTransform === "uppercase" ? "none" : "uppercase" })
          }
          class={`studio-icon-btn ${el.textTransform === "uppercase" ? "active" : ""}`}
          style={{ fontSize: "10px", fontWeight: "bold", padding: "4px 8px" }}
          title="Uppercase"
        >
          AA
        </button>
      </div>

      {/* Alignment */}
      <div class="studio-btn-group">
        {(["left", "center", "right"] as const).map((align) => (
          <button
            key={align}
            type="button"
            onClick={() => onUpdate({ textAlign: align })}
            class={`studio-icon-btn ${el.textAlign === align ? "active" : ""}`}
            style={{ textTransform: "capitalize", padding: "4px 8px" }}
          >
            {align[0]}
          </button>
        ))}
      </div>
    </>
  );
}

function ShapeProperties({
  el,
  onUpdate,
}: {
  el: ShapeElement;
  onUpdate: (updates: Partial<ShapeElement>) => void;
}) {
  return (
    <>
      {/* Fill Color */}
      <div class="studio-color-pill" title="Fill Color">
        <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>Fill:</span>
        <input
          type="color"
          value={el.fillColor.startsWith("#") ? el.fillColor : "#d4af37"}
          onInput={(e) => onUpdate({ fillColor: (e.target as HTMLInputElement).value })}
          class="studio-color-input"
        />
      </div>

      {/* Stroke Color */}
      <div class="studio-color-pill" title="Border Stroke">
        <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>Border:</span>
        <input
          type="color"
          value={el.strokeColor && el.strokeColor.startsWith("#") ? el.strokeColor : "#f59e0b"}
          onInput={(e) => onUpdate({ strokeColor: (e.target as HTMLInputElement).value, strokeWidth: el.strokeWidth || 2 })}
          class="studio-color-input"
        />
        <select
          value={el.strokeWidth || 0}
          onChange={(e) => onUpdate({ strokeWidth: parseInt((e.target as HTMLSelectElement).value, 10) })}
          class="studio-select-sm"
          style={{ padding: "2px 4px", fontSize: "10px" }}
        >
          <option value="0">0px</option>
          <option value="1">1px</option>
          <option value="2">2px</option>
          <option value="4">4px</option>
        </select>
      </div>

      {/* Border Radius */}
      <div class="studio-color-pill">
        <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>Radius:</span>
        <input
          type="range"
          min="0"
          max="60"
          value={el.borderRadius || 0}
          onInput={(e) => onUpdate({ borderRadius: parseInt((e.target as HTMLInputElement).value, 10) })}
          style={{ width: "60px", accentColor: "var(--studio-selection)" }}
        />
        <span style={{ fontSize: "10px", fontFamily: "monospace" }}>{el.borderRadius || 0}px</span>
      </div>
    </>
  );
}

function ImageProperties({
  el,
  onUpdate,
}: {
  el: ImageElement;
  onUpdate: (updates: Partial<ImageElement>) => void;
}) {
  const filters: { label: string; val: ImageElement["filter"] }[] = [
    { label: "Normal", val: "none" },
    { label: "Warm Gold", val: "warm" },
    { label: "Noir B&W", val: "noir" },
    { label: "Vibrant", val: "vibrant" },
    { label: "Vintage Film", val: "vintage" },
    { label: "Dramatic", val: "dramatic" },
  ];

  return (
    <>
      <div class="studio-color-pill">
        <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>Filter:</span>
        <select
          value={el.filter || "none"}
          onChange={(e) => onUpdate({ filter: (e.target as HTMLSelectElement).value as any })}
          class="studio-select-sm"
        >
          {filters.map((f) => (
            <option key={f.val} value={f.val}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div class="studio-color-pill">
        <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>Corners:</span>
        <input
          type="range"
          min="0"
          max="60"
          value={el.borderRadius || 0}
          onInput={(e) => onUpdate({ borderRadius: parseInt((e.target as HTMLInputElement).value, 10) })}
          style={{ width: "60px", accentColor: "var(--studio-selection)" }}
        />
        <span style={{ fontSize: "10px", fontFamily: "monospace" }}>{el.borderRadius || 0}px</span>
      </div>
    </>
  );
}
