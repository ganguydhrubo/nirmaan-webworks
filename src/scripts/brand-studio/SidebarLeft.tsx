import { useState } from "preact/hooks";
import type { StudioElement, StudioTemplate, BrandKitState } from "./types";
import type { CanvasBackground } from "./store";
import { STUDIO_TEMPLATES, getTemplateThumbnail } from "./templates";
import { BRAND_PALETTES } from "./presets";
import { CURATED_PHOTOS, CURATED_ICONS } from "./assets";

interface SidebarLeftProps {
  elements: StudioElement[];
  selectedId: string | null;
  background: CanvasBackground;
  brandKit: BrandKitState;
  onSelect: (id: string | null) => void;
  onAddElement: (element: StudioElement) => void;
  onLoadTemplate: (template: StudioTemplate) => void;
  onSetBackground: (bg: CanvasBackground) => void;
  onReorder: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onDelete: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<StudioElement>) => void;
  onAddBrandColor: (color: string) => void;
  onRemoveBrandColor: (color: string) => void;
  onAddBrandLogo: (name: string, dataUrl: string) => void;
}

type TabKey = "templates" | "text" | "elements" | "media" | "brand" | "layers";

export function SidebarLeft({
  elements,
  selectedId,
  background,
  brandKit,
  onSelect,
  onAddElement,
  onLoadTemplate,
  onSetBackground,
  onReorder,
  onDelete,
  onUpdateElement,
  onAddBrandColor,
  onRemoveBrandColor,
  onAddBrandLogo,
}: SidebarLeftProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [userUploads, setUserUploads] = useState<{ id: string; url: string; name: string }[]>([]);
  const [newColorHex, setNewColorHex] = useState("#d4af37");

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "templates", label: "Templates", icon: "📑" },
    { key: "elements", label: "Elements", icon: "❖" },
    { key: "text", label: "Text", icon: "T" },
    { key: "media", label: "Photos", icon: "🖼️" },
    { key: "brand", label: "Brand Kit", icon: "🎨" },
    { key: "layers", label: "Layers", icon: "☷" },
  ];

  // Search filtering logic
  const filteredTemplates = STUDIO_TEMPLATES.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const filteredPhotos = CURATED_PHOTOS.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.label.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((tag) => tag.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const filteredIcons = CURATED_ICONS.filter((ic) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || ic.label.toLowerCase().includes(q) || ic.category.toLowerCase().includes(q);
  });

  // Text insertion helpers
  const addText = (kind: "heading" | "subheading" | "body" | "badge") => {
    const id = `text-${Date.now()}`;
    if (kind === "heading") {
      onAddElement({
        id,
        type: "text",
        content: "Add Luxury Heading",
        x: 100,
        y: 200,
        width: 880,
        height: 120,
        rotation: 0,
        opacity: 1,
        fontFamily: "Fraunces",
        fontSize: 72,
        fontWeight: "800",
        fontStyle: "normal",
        color: "#fef3c7",
        textAlign: "center",
        letterSpacing: -1,
        lineHeight: 1.1,
      });
    } else if (kind === "subheading") {
      onAddElement({
        id,
        type: "text",
        content: "High-Converting Subtitle For Your Offer",
        x: 140,
        y: 350,
        width: 800,
        height: 60,
        rotation: 0,
        opacity: 1,
        fontFamily: "Manrope",
        fontSize: 28,
        fontWeight: "600",
        fontStyle: "normal",
        color: "#e7e5e4",
        textAlign: "center",
        letterSpacing: 0.5,
        lineHeight: 1.3,
      });
    } else if (kind === "body") {
      onAddElement({
        id,
        type: "text",
        content: "Mention your business address, opening hours, or special discount terms here in plain, clear language.",
        x: 140,
        y: 440,
        width: 800,
        height: 80,
        rotation: 0,
        opacity: 1,
        fontFamily: "Manrope",
        fontSize: 20,
        fontWeight: "normal",
        fontStyle: "normal",
        color: "#d6d3d1",
        textAlign: "center",
        letterSpacing: 0,
        lineHeight: 1.5,
      });
    } else if (kind === "badge") {
      onAddElement({
        id,
        type: "text",
        content: "✦ LIMITED TIME 50% OFF ✦",
        x: 340,
        y: 120,
        width: 400,
        height: 50,
        rotation: 0,
        opacity: 1,
        fontFamily: "Manrope",
        fontSize: 16,
        fontWeight: "800",
        fontStyle: "normal",
        color: "#fbbf24",
        textAlign: "center",
        letterSpacing: 2,
        lineHeight: 1.2,
        textTransform: "uppercase",
        backgroundColor: "rgba(217, 119, 6, 0.25)",
        backgroundPadding: 8,
        borderRadius: 25,
      });
    }
  };

  // Shape insertion helpers
  const addShape = (kind: "rectangle" | "circle" | "pill" | "divider") => {
    const id = `shape-${Date.now()}`;
    if (kind === "rectangle") {
      onAddElement({
        id,
        type: "shape",
        shapeKind: "rectangle",
        x: 140,
        y: 300,
        width: 800,
        height: 400,
        rotation: 0,
        opacity: 1,
        fillColor: "rgba(28, 25, 23, 0.8)",
        strokeColor: "#d4af37",
        strokeWidth: 2,
        borderRadius: 20,
      });
    } else if (kind === "circle") {
      onAddElement({
        id,
        type: "shape",
        shapeKind: "circle",
        x: 440,
        y: 400,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        fillColor: "#ea580c",
      });
    } else if (kind === "pill") {
      onAddElement({
        id,
        type: "shape",
        shapeKind: "pill",
        x: 340,
        y: 200,
        width: 400,
        height: 70,
        rotation: 0,
        opacity: 1,
        fillColor: "#0284c7",
        borderRadius: 35,
      });
    } else if (kind === "divider") {
      onAddElement({
        id,
        type: "shape",
        shapeKind: "divider",
        x: 290,
        y: 400,
        width: 500,
        height: 4,
        rotation: 0,
        opacity: 0.8,
        fillColor: "#d4af37",
      });
    }
  };

  const handleDeviceUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const newUpload = { id: `up-${Date.now()}`, url: src, name: file.name };
      setUserUploads((prev) => [newUpload, ...prev]);

      onAddElement({
        id: `img-${Date.now()}`,
        type: "image",
        src,
        alt: file.name,
        x: 240,
        y: 240,
        width: 600,
        height: 450,
        rotation: 0,
        opacity: 1,
        borderRadius: 16,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      onAddBrandLogo(file.name, src);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", height: "100%", zIndex: 30 }}>
      {/* 1. Left Icon Rail (Canva-style) */}
      <nav class="studio-rail">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            class={`studio-rail-item ${activeTab === tab.key ? "active" : ""}`}
            title={tab.label}
          >
            <span class="studio-rail-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* 2. Left Flyout Drawer with Search Bar & Content */}
      <aside class="studio-drawer">
        {/* Search Bar (Contextual per tab) */}
        {(activeTab === "templates" || activeTab === "media" || activeTab === "elements") && (
          <div style={{ marginBottom: "14px" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                style={{
                  width: "100%",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--studio-border)",
                  borderRadius: "8px",
                  padding: "8px 12px 8px 32px",
                  color: "#fff",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: "10px", top: "8px", fontSize: "12px", opacity: 0.5 }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: "10px", top: "7px", background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: "11px" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: TEMPLATES */}
        {activeTab === "templates" && (
          <div>
            <div class="studio-drawer-title">
              <span>Curated Indian SMBs</span>
              <span style={{ fontSize: "11px", color: "var(--studio-text-muted)" }}>
                {filteredTemplates.length} Designs
              </span>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "10px", marginBottom: "8px" }}>
              {["All", "Logo Design", "Festive & Retail", "Healthcare", "Food & Dining", "Real Estate", "Salon & Style", "Corporate & Tech"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "16px",
                    border: "1px solid var(--studio-border)",
                    backgroundColor: selectedCategory === cat ? "var(--studio-selection)" : "rgba(255, 255, 255, 0.04)",
                    color: selectedCategory === cat ? "#fff" : "var(--studio-text-muted)",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredTemplates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--studio-text-muted)", fontSize: "12px" }}>
                No templates found matching "{searchQuery}".
              </div>
            ) : (
              <div>
                {filteredTemplates.map((tmpl) => {
                  const thumb = getTemplateThumbnail(tmpl);
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => onLoadTemplate(tmpl)}
                      class="studio-template-card"
                    >
                      <div
                        class="studio-template-thumb"
                        style={{
                          position: "relative",
                          overflow: "hidden",
                          height: "135px",
                          borderRadius: "8px",
                          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.85)), url(${thumb})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          padding: "10px",
                          marginBottom: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <span
                          style={{
                            alignSelf: "flex-start",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            padding: "2px 7px",
                            borderRadius: "10px",
                            backgroundColor: "rgba(0,0,0,0.65)",
                            color: "var(--studio-gold)",
                            border: "1px solid rgba(212, 175, 55, 0.4)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          {tmpl.category}
                        </span>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                            {tmpl.title}
                          </div>
                          <div style={{ fontSize: "10px", color: "#e5e5e5", opacity: 0.85 }}>
                            {tmpl.width} × {tmpl.height} px
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#fff" }}>{tmpl.title}</span>
                        <span style={{ fontSize: "10px", color: "var(--studio-gold)", fontWeight: 700 }}>Open →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ELEMENTS & ICONS */}
        {activeTab === "elements" && (
          <div>
            <div class="studio-drawer-title">
              <span>Shapes & Primitives</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px" }}>
              <button
                type="button"
                onClick={() => addShape("rectangle")}
                class="studio-template-card"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px" }}
              >
                <div style={{ width: "44px", height: "30px", borderRadius: "4px", border: "2px solid #8b5cf6", background: "rgba(139, 92, 246, 0.2)", marginBottom: "6px" }} />
                <span style={{ fontSize: "11px", color: "#fff" }}>Card Box</span>
              </button>

              <button
                type="button"
                onClick={() => addShape("circle")}
                class="studio-template-card"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px" }}
              >
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", border: "2px solid #ea580c", background: "rgba(234, 88, 12, 0.3)", marginBottom: "6px" }} />
                <span style={{ fontSize: "11px", color: "#fff" }}>Price Stamp</span>
              </button>

              <button
                type="button"
                onClick={() => addShape("pill")}
                class="studio-template-card"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px" }}
              >
                <div style={{ width: "48px", height: "22px", borderRadius: "11px", border: "2px solid #0284c7", background: "rgba(2, 132, 199, 0.3)", marginBottom: "6px" }} />
                <span style={{ fontSize: "11px", color: "#fff" }}>CTA Pill</span>
              </button>

              <button
                type="button"
                onClick={() => addShape("divider")}
                class="studio-template-card"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px" }}
              >
                <div style={{ width: "48px", height: "4px", borderRadius: "2px", background: "var(--studio-gold)", margin: "12px 0 6px 0" }} />
                <span style={{ fontSize: "11px", color: "#fff" }}>Divider Rule</span>
              </button>
            </div>

            <div class="studio-drawer-title">
              <span>Vector Icons ({filteredIcons.length})</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {filteredIcons.map((ic) => (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => {
                    onAddElement({
                      id: `icon-${Date.now()}`,
                      type: "icon",
                      iconName: ic.id,
                      svgPath: ic.svgPath,
                      viewBox: ic.viewBox,
                      color: "#d4af37",
                      x: 200,
                      y: 200,
                      width: 64,
                      height: 64,
                      rotation: 0,
                      opacity: 1,
                    });
                  }}
                  class="studio-template-card"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px", margin: 0 }}
                  title={ic.label}
                >
                  <svg viewBox={ic.viewBox} style={{ width: "22px", height: "22px", fill: "var(--studio-gold)", marginBottom: "4px" }}>
                    <path d={ic.svgPath} />
                  </svg>
                  <span style={{ fontSize: "9px", color: "var(--studio-text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>
                    {ic.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TEXT */}
        {activeTab === "text" && (
          <div>
            <div class="studio-drawer-title">
              <span>Typography Presets</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => addText("heading")}
                class="studio-template-card"
                style={{ textAlign: "left", width: "100%" }}
              >
                <div style={{ fontFamily: "Fraunces, serif", fontSize: "22px", fontWeight: 800, color: "#fbbf24" }}>
                  Add a headline
                </div>
                <div style={{ fontSize: "11px", color: "var(--studio-text-muted)", marginTop: "4px" }}>
                  Fraunces Serif · 72px Display
                </div>
              </button>

              <button
                type="button"
                onClick={() => addText("subheading")}
                class="studio-template-card"
                style={{ textAlign: "left", width: "100%" }}
              >
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>
                  Add a subheading
                </div>
                <div style={{ fontSize: "11px", color: "var(--studio-text-muted)", marginTop: "4px" }}>
                  Manrope Sans · 28px Semi-Bold
                </div>
              </button>

              <button
                type="button"
                onClick={() => addText("body")}
                class="studio-template-card"
                style={{ textAlign: "left", width: "100%" }}
              >
                <div style={{ fontSize: "12px", color: "#d4d4d8" }}>
                  Add a little bit of body text for terms and address details.
                </div>
                <div style={{ fontSize: "11px", color: "var(--studio-text-muted)", marginTop: "4px" }}>
                  Manrope Regular · 20px Body
                </div>
              </button>

              <button
                type="button"
                onClick={() => addText("badge")}
                class="studio-template-card"
                style={{ textAlign: "left", width: "100%" }}
              >
                <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: "20px", background: "rgba(217, 119, 6, 0.2)", border: "1px solid #d97706", fontSize: "11px", fontWeight: "bold", color: "#fbbf24" }}>
                  ✦ SPECIAL OFFER BADGE ✦
                </div>
                <div style={{ fontSize: "11px", color: "var(--studio-text-muted)", marginTop: "4px" }}>
                  Highlight Pill with Background
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: PHOTOS & UPLOADS */}
        {activeTab === "media" && (
          <div>
            <div class="studio-drawer-title">
              <span>Your Uploads</span>
            </div>

            {/* Upload Area */}
            <label class="studio-template-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", borderStyle: "dashed", cursor: "pointer", marginBottom: "14px" }}>
              <span style={{ fontSize: "22px", marginBottom: "4px" }}>☁️</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>Upload Device Image</span>
              <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>PNG, JPG, WebP</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleDeviceUpload(file);
                }}
              />
            </label>

            {userUploads.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                {userUploads.map((up) => (
                  <div
                    key={up.id}
                    onClick={() => {
                      onAddElement({
                        id: `img-${Date.now()}`,
                        type: "image",
                        src: up.url,
                        alt: up.name,
                        x: 240,
                        y: 240,
                        width: 600,
                        height: 450,
                        rotation: 0,
                        opacity: 1,
                        borderRadius: 16,
                      });
                    }}
                    style={{ height: "70px", borderRadius: "8px", overflow: "hidden", cursor: "pointer", border: "1px solid var(--studio-border)" }}
                  >
                    <img src={up.url} alt={up.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}

            <div class="studio-drawer-title">
              <span>Curated Stock Library ({filteredPhotos.length})</span>
            </div>

            {/* Photo Category Filter */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "8px" }}>
              {["All", "Festive & Retail", "Healthcare", "Food & Dining", "Real Estate", "Salon & Style", "Corporate & Tech"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "14px",
                    border: "1px solid var(--studio-border)",
                    backgroundColor: selectedCategory === cat ? "var(--studio-selection)" : "rgba(255, 255, 255, 0.04)",
                    color: selectedCategory === cat ? "#fff" : "var(--studio-text-muted)",
                    fontSize: "9px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    onAddElement({
                      id: `stock-${Date.now()}`,
                      type: "image",
                      src: photo.url,
                      alt: photo.label,
                      x: 240,
                      y: 240,
                      width: 600,
                      height: 450,
                      rotation: 0,
                      opacity: 1,
                      borderRadius: 16,
                    });
                  }}
                  style={{ position: "relative", height: "85px", borderRadius: "8px", overflow: "hidden", cursor: "pointer", border: "1px solid var(--studio-border)" }}
                >
                  <img src={photo.url} alt={photo.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", display: "flex", alignItems: "flex-end", padding: "6px" }}>
                    <span style={{ fontSize: "10px", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: BRAND KIT */}
        {activeTab === "brand" && (
          <div>
            <div class="studio-drawer-title">
              <span>{brandKit.brandName} Colors</span>
            </div>

            {/* Custom Brand Colors Swatches */}
            <div class="studio-template-card" style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                {brandKit.colors.map((c) => (
                  <div key={c} style={{ position: "relative" }}>
                    <div
                      onClick={() => {
                        if (selectedId) {
                          onUpdateElement(selectedId, { color: c, fillColor: c } as any);
                        } else {
                          onSetBackground({ ...background, color: c });
                        }
                      }}
                      style={{ backgroundColor: c, width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)" }}
                      title={`Apply ${c}`}
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveBrandColor(c)}
                      style={{ position: "absolute", top: "-4px", right: "-4px", width: "14px", height: "14px", borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", fontSize: "9px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Color Input */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="color"
                  value={newColorHex}
                  onInput={(e) => setNewColorHex((e.target as HTMLInputElement).value)}
                  class="studio-color-input"
                />
                <input
                  type="text"
                  value={newColorHex}
                  onInput={(e) => setNewColorHex((e.target as HTMLInputElement).value)}
                  style={{ width: "70px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--studio-border)", borderRadius: "4px", color: "#fff", fontSize: "11px", padding: "3px 6px", fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  onClick={() => onAddBrandColor(newColorHex)}
                  class="studio-icon-btn"
                  style={{ border: "1px solid var(--studio-border)", padding: "4px 8px", fontSize: "11px", color: "#fff" }}
                >
                  + Add Color
                </button>
              </div>
            </div>

            {/* Brand Logos */}
            <div class="studio-drawer-title">
              <span>Brand Logos & Stamps</span>
            </div>

            <label class="studio-template-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px", borderStyle: "dashed", cursor: "pointer", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>+ Upload Brand Logo</span>
              <span style={{ fontSize: "10px", color: "var(--studio-text-muted)" }}>Transparent PNG or SVG</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
            </label>

            {brandKit.logos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                {brandKit.logos.map((logo) => (
                  <div
                    key={logo.id}
                    onClick={() => {
                      onAddElement({
                        id: `logo-${Date.now()}`,
                        type: "image",
                        src: logo.dataUrl,
                        alt: logo.name,
                        x: 200,
                        y: 200,
                        width: 250,
                        height: 120,
                        rotation: 0,
                        opacity: 1,
                      });
                    }}
                    style={{ height: "65px", borderRadius: "8px", border: "1px solid var(--studio-border)", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", cursor: "pointer" }}
                  >
                    <img src={logo.dataUrl} alt={logo.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Curated Luxury Palettes */}
            <div class="studio-drawer-title">
              <span>Pre-Built Luxury Palettes</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {BRAND_PALETTES.map((palette) => (
                <div key={palette.id} class="studio-template-card" style={{ padding: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff", display: "block", marginBottom: "6px" }}>{palette.name}</span>
                  <div style={{ display: "flex", gap: "5px" }}>
                    {palette.colors.map((c, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (selectedId) {
                            onUpdateElement(selectedId, { color: c, fillColor: c } as any);
                          } else {
                            onSetBackground({ ...background, color: c });
                          }
                        }}
                        style={{ backgroundColor: c, width: "26px", height: "26px", borderRadius: "4px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)" }}
                        title={`Apply ${c}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: LAYERS */}
        {activeTab === "layers" && (
          <div>
            <div class="studio-drawer-title">
              <span>Canvas Layers ({elements.length})</span>
            </div>

            {elements.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--studio-text-muted)", textAlign: "center", padding: "20px" }}>Canvas is empty.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[...elements].reverse().map((el, revIdx) => {
                  const isSelected = el.id === selectedId;
                  const label =
                    el.type === "text"
                      ? (el as any).content.slice(0, 22) || "Text Layer"
                      : el.type === "shape"
                      ? `Shape: ${(el as any).shapeKind}`
                      : el.type === "icon"
                      ? `Icon: ${(el as any).iconName || "vector"}`
                      : "Image Layer";

                  return (
                    <div
                      key={el.id}
                      onClick={() => onSelect(el.id)}
                      class="studio-template-card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        marginBottom: "0",
                        borderColor: isSelected ? "var(--studio-selection)" : "var(--studio-border)",
                        backgroundColor: isSelected ? "rgba(139, 92, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--studio-text-muted)" }}>{elements.length - revIdx}</span>
                        <span style={{ fontSize: "12px", color: isSelected ? "#fff" : "var(--studio-text)", fontWeight: isSelected ? 700 : 500, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{label}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorder(el.id, "up");
                          }}
                          class="studio-icon-btn"
                          title="Bring Forward"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorder(el.id, "down");
                          }}
                          class="studio-icon-btn"
                          title="Send Backward"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(el.id);
                          }}
                          class="studio-icon-btn"
                          style={{ color: "#ef4444" }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
