import { useRef, useEffect, useState } from "preact/hooks";
import type { StudioElement, TextElement, ShapeElement, ImageElement, IconElement } from "./types";
import type { CanvasBackground } from "./store";
import { loadStudioFont } from "./fonts";
import { SHAPE_PATHS } from "./shapes";

interface CanvasStageProps {
  width: number;
  height: number;
  background: CanvasBackground;
  elements: StudioElement[];
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<StudioElement>) => void;
  onDeleteElement: (id: string) => void;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: (w: number, h: number) => void;
}

export function CanvasStage({
  width,
  height,
  background,
  elements,
  selectedId,
  zoom,
  onSelect,
  onUpdateElement,
  onDeleteElement,
  onZoomChange,
  onFitToScreen,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    elements.forEach((el) => { if (el.type === "text") void loadStudioFont(el.fontFamily); });
    if (editingId && !elements.some((el) => el.id === editingId && !el.hidden && !el.locked)) setEditingId(null);
  }, [elements]);

  useEffect(() => {
    if (!editingId || !editorRef.current) return;
    const el = elements.find((item) => item.id === editingId);
    if (el?.type !== "text") return;
    // The DOM owns the caret while editing; state still receives every input.
    editorRef.current.textContent = el.content;
    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingId]);

  // Guide lines for center snapping
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});

  const dragInfo = useRef<{
    isDragging: boolean;
    elementId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const resizeInfo = useRef<{
    isResizing: boolean;
    elementId: string;
    handle: string;
    startX: number;
    startY: number;
    origWidth: number;
    origHeight: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Auto-fit artboard on mount or window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        onFitToScreen(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [width, height]);

  // Global mousemove and mouseup listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragInfo.current && dragInfo.current.isDragging) {
        const { elementId, startX, startY, origX, origY } = dragInfo.current;
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;

        let targetX = Math.round(origX + dx);
        let targetY = Math.round(origY + dy);

        // Center snapping tolerance (6px)
        const activeEl = elements.find((el) => el.id === elementId);
        const newGuides: { x?: number; y?: number } = {};

        if (activeEl) {
          const centerX = width / 2 - activeEl.width / 2;
          const centerY = height / 2 - activeEl.height / 2;

          if (Math.abs(targetX - centerX) < 6) {
            targetX = Math.round(centerX);
            newGuides.x = width / 2;
          }
          if (Math.abs(targetY - centerY) < 6) {
            targetY = Math.round(centerY);
            newGuides.y = height / 2;
          }
        }

        setGuides(newGuides);
        onUpdateElement(elementId, { x: targetX, y: targetY });
      } else if (resizeInfo.current && resizeInfo.current.isResizing) {
        const { elementId, handle, startX, startY, origWidth, origHeight, origX, origY } = resizeInfo.current;
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;

        let newW = origWidth;
        let newH = origHeight;
        let newX = origX;
        let newY = origY;

        if (handle === "se") {
          newW = Math.max(30, origWidth + dx);
          newH = Math.max(20, origHeight + dy);
        } else if (handle === "sw") {
          newW = Math.max(30, origWidth - dx);
          newH = Math.max(20, origHeight + dy);
          newX = origX + (origWidth - newW);
        } else if (handle === "ne") {
          newW = Math.max(30, origWidth + dx);
          newH = Math.max(20, origHeight - dy);
          newY = origY + (origHeight - newH);
        } else if (handle === "nw") {
          newW = Math.max(30, origWidth - dx);
          newH = Math.max(20, origHeight - dy);
          newX = origX + (origWidth - newW);
          newY = origY + (origHeight - newH);
        } else if (handle === "e") {
          newW = Math.max(30, origWidth + dx);
        } else if (handle === "w") {
          newW = Math.max(30, origWidth - dx);
          newX = origX + (origWidth - newW);
        } else if (handle === "s") {
          newH = Math.max(20, origHeight + dy);
        } else if (handle === "n") {
          newH = Math.max(20, origHeight - dy);
          newY = origY + (origHeight - newH);
        }

        onUpdateElement(elementId, {
          width: Math.round(newW),
          height: Math.round(newH),
          x: Math.round(newX),
          y: Math.round(newY),
        });
      }
    };

    const handleMouseUp = () => {
      dragInfo.current = null;
      resizeInfo.current = null;
      setGuides({});
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [zoom, elements, width, height, onUpdateElement]);

  const handleElementMouseDown = (e: MouseEvent, el: StudioElement) => {
    e.stopPropagation();
    onSelect(el.id);
    if (el.locked || editingId === el.id || e.detail > 1) return;

    dragInfo.current = {
      isDragging: true,
      elementId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
  };

  const handleResizeStart = (e: MouseEvent, el: StudioElement, handle: string) => {
    e.stopPropagation();
    if (el.locked) return;

    resizeInfo.current = {
      isResizing: true,
      elementId: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origWidth: el.width,
      origHeight: el.height,
      origX: el.x,
      origY: el.y,
    };
  };

  const getBackgroundStyle = () => {
    if (background.type === "gradient") {
      const angle = background.gradientAngle ?? 135;
      const end = background.gradientEnd ?? "#000000";
      return {
        background: `linear-gradient(${angle}deg, ${background.color}, ${end})`,
      };
    }
    return {
      backgroundColor: background.color,
    };
  };

  return (
    <div
      ref={containerRef}
      class="studio-canvas-container"
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (
          target === containerRef.current ||
          target?.id === "atittle-canvas-stage" ||
          target?.classList.contains("studio-canvas-container") ||
          target?.classList.contains("studio-artboard-wrapper")
        ) {
          onSelect(null);
        }
      }}
    >
      {/* Centered Scaled Artboard */}
      <div
        class="studio-artboard-wrapper"
        style={{
          width: `${Math.round(width * zoom)}px`,
          height: `${Math.round(height * zoom)}px`,
          position: "relative",
          margin: "auto",
          flexShrink: 0,
        }}
      >
        <div
          ref={stageRef}
          id="atittle-canvas-stage"
          class="studio-artboard"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
            ...getBackgroundStyle(),
          }}
        >
          {/* Snap Alignment Guides */}
          {guides.x !== undefined && (
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${guides.x}px`,
                width: "1px",
                backgroundColor: "#ec4899",
                zIndex: 60,
                pointerEvents: "none",
              }}
            />
          )}
          {guides.y !== undefined && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${guides.y}px`,
                height: "1px",
                backgroundColor: "#ec4899",
                zIndex: 60,
                pointerEvents: "none",
              }}
            />
          )}

          {elements.filter((el) => !el.hidden).map((el) => {
            const isSelected = selectedId === el.id;
            return (
              <div
                key={el.id}
                class={`studio-element ${isSelected ? "selected" : ""}`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  transform: `rotate(${el.rotation}deg)`,
                  opacity: el.opacity,
                }}
                onMouseDown={(e) => handleElementMouseDown(e, el)}
                tabIndex={0}
                role="button"
                aria-label={el.type === "text" ? `Edit text: ${el.content}` : `${el.type} layer`}
                onDblClick={(e) => {
                  if (el.type !== "text" || el.locked) return;
                  e.stopPropagation();
                  dragInfo.current = null;
                  resizeInfo.current = null;
                  setEditingId(el.id);
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if ((e.key === "Enter" || e.key === "F2") && el.type === "text" && !el.locked) {
                    e.preventDefault();
                    setEditingId(el.id);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(el.id);
                }}
              >
                {/* Text Element */}
                {el.type === "text" && (editingId === el.id ? (
                  <div style={{ ...textElementStyle(el), pointerEvents: "auto", userSelect: "text", cursor: "text" }}>
                    <div
                      ref={editorRef}
                      class="studio-inline-text"
                      contentEditable="plaintext-only"
                      role="textbox"
                      aria-label="Edit canvas text"
                      aria-multiline="true"
                      spellcheck
                      style={{ width: "100%", outline: "none", minHeight: `${el.fontSize * el.lineHeight}px`, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onInput={(e) => onUpdateElement(el.id, { content: e.currentTarget.innerText })}
                      onBlur={(e) => { onUpdateElement(el.id, { content: e.currentTarget.innerText }); setEditingId(null); }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Escape") { e.preventDefault(); e.currentTarget.blur(); }
                      }}
                    />
                  </div>
                ) : renderTextElement(el))}

                {/* Shape Element */}
                {el.type === "shape" && renderShapeElement(el as ShapeElement)}

                {/* Image Element */}
                {el.type === "image" && renderImageElement(el as ImageElement)}

                {/* Icon Element */}
                {el.type === "icon" && renderIconElement(el as IconElement)}

                {/* 8-Point Bounding Box Handles */}
                {isSelected && !el.locked && editingId !== el.id && (
                  <>
                    {/* Corners */}
                    <div
                      class="studio-handle studio-handle-nw"
                      onMouseDown={(e) => handleResizeStart(e, el, "nw")}
                    />
                    <div
                      class="studio-handle studio-handle-ne"
                      onMouseDown={(e) => handleResizeStart(e, el, "ne")}
                    />
                    <div
                      class="studio-handle studio-handle-sw"
                      onMouseDown={(e) => handleResizeStart(e, el, "sw")}
                    />
                    <div
                      class="studio-handle studio-handle-se"
                      onMouseDown={(e) => handleResizeStart(e, el, "se")}
                    />

                    {/* Edge Midpoints */}
                    <div
                      style={{
                        position: "absolute",
                        top: "-5px",
                        left: "calc(50% - 6px)",
                        width: "12px",
                        height: "8px",
                        borderRadius: "2px",
                        backgroundColor: "#fff",
                        border: "2px solid var(--studio-selection)",
                        cursor: "ns-resize",
                        zIndex: 40,
                      }}
                      onMouseDown={(e) => handleResizeStart(e, el, "n")}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-5px",
                        left: "calc(50% - 6px)",
                        width: "12px",
                        height: "8px",
                        borderRadius: "2px",
                        backgroundColor: "#fff",
                        border: "2px solid var(--studio-selection)",
                        cursor: "ns-resize",
                        zIndex: 40,
                      }}
                      onMouseDown={(e) => handleResizeStart(e, el, "s")}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "-5px",
                        top: "calc(50% - 6px)",
                        width: "8px",
                        height: "12px",
                        borderRadius: "2px",
                        backgroundColor: "#fff",
                        border: "2px solid var(--studio-selection)",
                        cursor: "ew-resize",
                        zIndex: 40,
                      }}
                      onMouseDown={(e) => handleResizeStart(e, el, "w")}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: "-5px",
                        top: "calc(50% - 6px)",
                        width: "8px",
                        height: "12px",
                        borderRadius: "2px",
                        backgroundColor: "#fff",
                        border: "2px solid var(--studio-selection)",
                        cursor: "ew-resize",
                        zIndex: 40,
                      }}
                      onMouseDown={(e) => handleResizeStart(e, el, "e")}
                    />

                    {/* Quick Delete Floating Pill */}
                    <button
                      type="button"
                      class="studio-delete-pill"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteElement(el.id);
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Zoom Dock */}
      <div class="studio-bottom-zoom">
        <button
          type="button"
          onClick={() => onZoomChange(zoom - 0.1)}
          class="studio-icon-btn"
          style={{ padding: "2px 8px" }}
          title="Zoom Out"
        >
          -
        </button>
        <span style={{ fontFamily: "monospace", minWidth: "44px", textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(zoom + 0.1)}
          class="studio-icon-btn"
          style={{ padding: "2px 8px" }}
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (containerRef.current) {
              onFitToScreen(containerRef.current.clientWidth, containerRef.current.clientHeight);
            }
          }}
          class="studio-icon-btn"
          style={{ color: "var(--studio-gold)", fontWeight: "bold", marginLeft: "4px" }}
          title="Fit Artboard to Screen"
        >
          Fit
        </button>
      </div>
    </div>
  );
}

function textElementStyle(el: TextElement): import("preact").JSX.CSSProperties {
  return {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: el.fontFamily,
        fontSize: `${el.fontSize}px`,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        color: el.color,
        textAlign: el.textAlign,
        letterSpacing: `${el.letterSpacing}px`,
        lineHeight: el.lineHeight,
        textTransform: el.textTransform || "none",
        textShadow: el.shadow ? `${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color}` : "none",
        backgroundColor: el.backgroundColor || "transparent",
        padding: `${el.backgroundPadding || 0}px`,
        borderRadius: `${el.borderRadius || 0}px`,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        pointerEvents: "none",
        userSelect: "none",
  };
}

function renderTextElement(el: TextElement) {
  return <div style={textElementStyle(el)}>{el.content}</div>;
}

function renderShapeElement(el: ShapeElement) {
  const path = SHAPE_PATHS[el.shapeKind];
  if (path) return <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ pointerEvents: "none" }}><path d={path} fill={el.fillColor} stroke={el.strokeColor || "none"} stroke-width={el.strokeWidth || 0} /></svg>;
  const shadowStyle = el.shadow
    ? `${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color}`
    : "none";

  if (el.shapeKind === "circle") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          backgroundColor: el.fillColor,
          border: el.strokeColor && el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor}` : "none",
          boxShadow: shadowStyle,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (el.shapeKind === "pill") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: `${el.height / 2}px`,
          backgroundColor: el.fillColor,
          border: el.strokeColor && el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor}` : "none",
          boxShadow: shadowStyle,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (el.shapeKind === "divider") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "2px",
          backgroundColor: el.fillColor,
          boxShadow: shadowStyle,
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: el.fillColor,
        borderRadius: `${el.borderRadius || 0}px`,
        border: el.strokeColor && el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor}` : "none",
        boxShadow: shadowStyle,
        pointerEvents: "none",
      }}
    />
  );
}

function renderImageElement(el: ImageElement) {
  let filterCss = "none";
  if (el.filter === "warm") filterCss = "sepia(0.2) saturate(1.3) contrast(1.05)";
  if (el.filter === "noir") filterCss = "grayscale(1) contrast(1.2)";
  if (el.filter === "vibrant") filterCss = "saturate(1.5) contrast(1.1)";
  if (el.filter === "vintage") filterCss = "sepia(0.5) contrast(0.9) brightness(0.95)";
  if (el.filter === "dramatic") filterCss = "contrast(1.4) brightness(0.9)";

  return (
    <img
      src={el.src}
      alt={el.alt || "Canvas visual element"}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        pointerEvents: "none",
        userSelect: "none",
        borderRadius: `${el.borderRadius || 0}px`,
        filter: filterCss,
      }}
    />
  );
}

function renderIconElement(el: IconElement) {
  return (
    <svg
      viewBox={el.viewBox || "0 0 24 24"}
      style={{
        width: "100%",
        height: "100%",
        fill: el.color,
        pointerEvents: "none",
      }}
    >
      <path d={el.svgPath} />
    </svg>
  );
}
