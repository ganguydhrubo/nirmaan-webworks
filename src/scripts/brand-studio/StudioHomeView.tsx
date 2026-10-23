import { useState } from "preact/hooks";
import type { StudioTemplate, CanvasPreset, BrandKitState } from "./types";
import { STUDIO_TEMPLATES, getTemplateThumbnail } from "./templates";
import { CANVAS_PRESETS } from "./presets";

interface StudioHomeViewProps {
  brandKit: BrandKitState;
  onSelectTemplate: (template: StudioTemplate) => void;
  onCreateBlank: (presetId: string) => void;
  onOpenEditor: () => void;
}

export function StudioHomeView({
  brandKit,
  onSelectTemplate,
  onCreateBlank,
  onOpenEditor,
}: StudioHomeViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"home" | "templates" | "brand">("home");

  const categories = [
    "All",
    "Logo Design",
    "Festive & Retail",
    "Healthcare",
    "Food & Dining",
    "Real Estate",
    "Salon & Style",
    "Corporate & Tech",
  ];

  const filteredTemplates = STUDIO_TEMPLATES.filter((t) => {
    const matchesCat = activeCategory === "All" || t.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div class="studio-home-layout">
      {/* 1. Left Vertical Rail (Canva-style) */}
      <aside class="studio-home-rail">
        <div class="studio-home-rail-top">
          <div class="studio-home-logo-box">
            <span class="studio-brand-logo">A</span>
          </div>

          {/* + Create Button */}
          <button
            type="button"
            onClick={() => onCreateBlank("insta-square")}
            class="studio-create-pill-btn"
            title="Create a new blank design"
          >
            <span style={{ fontSize: "16px", fontWeight: "bold" }}>+</span>
            <span style={{ fontSize: "11px", fontWeight: 700 }}>Create</span>
          </button>

          <nav class="studio-home-nav">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              class={`studio-home-nav-item ${activeTab === "home" ? "active" : ""}`}
            >
              <span class="studio-home-nav-icon">🏠</span>
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              class={`studio-home-nav-item ${activeTab === "templates" ? "active" : ""}`}
            >
              <span class="studio-home-nav-icon">📑</span>
              <span>Templates</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("brand")}
              class={`studio-home-nav-item ${activeTab === "brand" ? "active" : ""}`}
            >
              <span class="studio-home-nav-icon">🎨</span>
              <span>Brand Kit</span>
            </button>

            <button
              type="button"
              onClick={onOpenEditor}
              class="studio-home-nav-item"
            >
              <span class="studio-home-nav-icon">🖌️</span>
              <span>Editor</span>
            </button>
          </nav>
        </div>

        <div class="studio-home-rail-bottom">
          <a
            href="/services"
            class="studio-home-nav-item"
            title="Back to Services"
            style={{ textDecoration: "none" }}
          >
            <span class="studio-home-nav-icon">←</span>
            <span>Services</span>
          </a>
        </div>
      </aside>

      {/* 2. Main Content Stream */}
      <main class="studio-home-main">
        {/* Hero Section: "What will you design today?" */}
        <section class="studio-hero-banner">
          <div class="studio-hero-content">
            <h1 class="studio-hero-title">What will you design today?</h1>
            <p class="studio-hero-subtitle">
              Professional, high-converting social media creatives, WhatsApp promotions, menus, and brand marketing. Free forever.
            </p>

            {/* Sub Tabs */}
            <div class="studio-subtabs">
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                class={`studio-subtab-btn ${activeTab === "home" ? "active" : ""}`}
              >
                🏠 Home
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("templates")}
                class={`studio-subtab-btn ${activeTab === "templates" ? "active" : ""}`}
              >
                📑 Templates
              </button>
            </div>

            {/* Centered Search Bar */}
            <div class="studio-hero-search-wrapper">
              <span class="studio-hero-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search templates, Diwali sales, dental clinic, food menus, real estate..."
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                class="studio-hero-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  class="studio-hero-search-clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Category Filter Chips */}
            <div class="studio-quick-chips">
              {[
                { label: "All Formats", cat: "All", icon: "✨" },
                { label: "Logo Pre-Builders", cat: "Logo Design", icon: "🛡️" },
                { label: "Festive & Retail", cat: "Festive & Retail", icon: "🪔" },
                { label: "Food & Dining", cat: "Food & Dining", icon: "🍲" },
                { label: "Healthcare", cat: "Healthcare", icon: "🩺" },
                { label: "Real Estate", cat: "Real Estate", icon: "🏢" },
                { label: "Salon & Style", cat: "Salon & Style", icon: "✂️" },
                { label: "Corporate & Tech", cat: "Corporate & Tech", icon: "💻" },
              ].map((chip) => (
                <button
                  key={chip.cat}
                  type="button"
                  onClick={() => setActiveCategory(chip.cat)}
                  class={`studio-chip-btn ${activeCategory === chip.cat ? "active" : ""}`}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Explore Dimension Formats */}
        <section class="studio-section">
          <div class="studio-section-header">
            <h2 class="studio-section-title">Explore Formats</h2>
            <span class="studio-section-desc">Start from popular social, print, and advertising dimensions</span>
          </div>

          <div class="studio-formats-grid">
            {CANVAS_PRESETS.map((p) => (
              <div
                key={p.id}
                onClick={() => onCreateBlank(p.id)}
                class="studio-format-card"
              >
                <div class="studio-format-icon-box">
                  {p.id === "logo-design" && "🛡️"}
                  {p.id === "insta-square" && "📷"}
                  {p.id === "whatsapp-story" && "📱"}
                  {p.id === "insta-portrait" && "🖼️"}
                  {p.id === "youtube-landscape" && "🎬"}
                  {p.id === "business-card" && "💳"}
                  {p.id === "a4-flyer" && "📄"}
                  {p.id === "promo-banner" && "📢"}
                  {p.id === "product-badge" && "🛍️"}
                </div>
                <div class="studio-format-info">
                  <div class="studio-format-name">{p.name}</div>
                  <div class="studio-format-dim">
                    {p.width} × {p.height} px • {p.badge || p.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Templates for You */}
        <section class="studio-section">
          <div class="studio-section-header">
            <h2 class="studio-section-title">
              {activeCategory === "All" ? "Curated Templates for You" : `${activeCategory} Templates`}
            </h2>
            <span class="studio-section-desc">
              100% editable vector templates created for ambitious Indian brands
            </span>
          </div>

          {/* Templates Grid */}
          <div class="studio-cards-grid">
            {/* Blank Canvas Card */}
            <div
              onClick={() => onCreateBlank("insta-square")}
              class="studio-blank-card"
            >
              <div class="studio-blank-plus">+</div>
              <div class="studio-blank-title">Create a blank design</div>
              <div class="studio-blank-desc">1080 × 1080 px (Square)</div>
            </div>

            {/* Template Cards */}
            {filteredTemplates.map((t) => {
              const thumbUrl = getTemplateThumbnail(t);
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTemplate(t)}
                  class="studio-feed-card"
                >
                  <div
                    class="studio-feed-thumb"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.85)), url(${thumbUrl})`,
                    }}
                  >
                    <span class="studio-feed-badge">{t.category}</span>
                    <div class="studio-feed-hover-overlay">
                      <span class="studio-feed-hover-btn">Customize Template →</span>
                    </div>
                  </div>

                  <div class="studio-feed-meta">
                    <h3 class="studio-feed-title">{t.title}</h3>
                    <div class="studio-feed-sub">
                      <span>{t.width} × {t.height} px</span>
                      <span>•</span>
                      <span style={{ color: "var(--studio-gold)" }}>{t.tags[0] || "Editable"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Brand Kit Panel View (if selected) */}
        {activeTab === "brand" && (
          <section class="studio-section" style={{ marginTop: "30px" }}>
            <div class="studio-section-header">
              <h2 class="studio-section-title">Your Brand Kit</h2>
              <span class="studio-section-desc">Manage logos, palettes, and brand fonts across all designs</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div class="studio-format-card" style={{ padding: "20px", flexDirection: "column", alignItems: "flex-start" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", marginBottom: "10px" }}>Saved Brand Colors</h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {brandKit.colors.map((c) => (
                    <div key={c} style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: c, border: "1px solid rgba(255,255,255,0.2)" }} title={c} />
                  ))}
                </div>
              </div>

              <div class="studio-format-card" style={{ padding: "20px", flexDirection: "column", alignItems: "flex-start" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", marginBottom: "10px" }}>Uploaded Brand Logos</h3>
                {brandKit.logos.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--studio-text-muted)" }}>No logos uploaded yet. Add your brand logo in the editor.</p>
                ) : (
                  <div style={{ display: "flex", gap: "10px" }}>
                    {brandKit.logos.map((logo) => (
                      <img key={logo.id} src={logo.dataUrl} alt={logo.name} style={{ height: "45px", objectFit: "contain" }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
