import { useEffect, useRef, useState } from "preact/hooks";
import { PAGE_OPTIONS, WEBSITE_GOALS, WEBSITE_TYPES, type BriefShape as Brief } from "@/lib/builder/options";
import { TEMPLATE_LIST } from "@/lib/builder/templates";
import { THEME_PRESETS } from "@/lib/builder/themes";
import type { ProjectSummary } from "./persistence";
import { Icon } from "./ui";

// ---------------------------------------------------------------------------
// Top 10 Trending Styles of 2026 (curated for modern conversion & aesthetic)
// ---------------------------------------------------------------------------
export const TRENDING_STYLES_2026 = [
  { preset: "saas", rank: "#1", badge: "🔥 #1 Trend 2026", label: "Modern SaaS & Tech", tag: "Crisp indigo, tech borders & rounded cards" },
  { preset: "corporate", rank: "#2", badge: "🏢 Top Corporate Trust", label: "Professional Corporate", tag: "Deep navy, structured authority & clean grid" },
  { preset: "dark-tech", rank: "#3", badge: "🔮 Cyber Dark", label: "Dark Cyber & Metallic", tag: "Obsidian backdrop with electric cyan & purple neon" },
  { preset: "luxury", rank: "#4", badge: "💎 High-End Luxury", label: "Gold & Ink Luxury", tag: "Warm gold & obsidian with Cormorant serif" },
  { preset: "editorial", rank: "#5", badge: "📰 Editorial Insight", label: "Minimalist Serif", tag: "Instrument Serif headlines with generous air" },
  { preset: "minimal", rank: "#6", badge: "⚪ Swiss Minimal", label: "Monochrome Minimal", tag: "Pure black & white with expansive breathing room" },
  { preset: "studio", rank: "#7", badge: "🎨 Neo-Brutalism", label: "Bold Creative Studio", tag: "Oversized typography, punchy contrast & bold borders" },
  { preset: "vibrant", rank: "#8", badge: "🍭 Vibrant Gen-Z", label: "Vibrant Consumer Brand", tag: "Playful berry & amber tones with bouncy pill shapes" },
  { preset: "local", rank: "#9", badge: "🏺 Warm Artisanal", label: "Terracotta & Local Craft", tag: "Warm terracotta & cream, approachable friendly feel" },
  { preset: "organic", rank: "#10", badge: "🌿 Nordic Organic", label: "Botanical & Wellness", tag: "Earthy sage greens & peaceful calm typography" },
] as const;

// ---------------------------------------------------------------------------
// Start screen: "How would you like to start?"
// ---------------------------------------------------------------------------

export function StartScreen(props: {
  projects: ProjectSummary[];
  storageOk: boolean;
  onAi: () => void;
  onTemplate: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (file: File) => void;
  onLeave: () => void;
  showTemplates: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (props.showTemplates) templatesRef.current?.scrollIntoView({ block: "start" });
  }, [props.showTemplates]);

  const filteredTemplates = TEMPLATE_LIST.filter((t) => {
    if (filter === "all") return true;
    if (filter === "trending") return !!t.tag?.includes("Trend") || !!t.tag?.includes("Corporate");
    if (filter === "corporate") return t.category === "Corporate" || t.preset === "corporate" || t.preset === "editorial";
    if (filter === "tech") return t.category === "Tech" || t.preset === "saas" || t.preset === "dark-tech";
    if (filter === "luxury") return t.preset === "luxury" || t.preset === "editorial";
    if (filter === "local") return t.category === "Local" || t.preset === "local" || t.preset === "hospitality";
    return true;
  });

  return (
    <div class="atb-start">
      <header class="atb-start-head">
        <button type="button" class="atb-back-link" onClick={props.onLeave} aria-label="Back to the previous page (or the ATITTLE homepage)">
          <Icon name="back" size={16} /> Back
        </button>
        <a href="/" class="atb-home-link">ATITTLE home</a>
      </header>
      <main class="atb-start-main">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span style={{ display: "inline-block", background: "#fbf6ee", color: "#c85a32", border: "1px solid #ebd9c8", padding: "4px 12px", borderRadius: "99px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "8px" }}>
            ✨ ATITTLE Free Website Studio
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 700, margin: "0 0 10px", color: "#1c1917" }}>
            How would you like to start?
          </h1>
          <p class="atb-muted" style={{ fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
            Create an original, mobile-responsive website in minutes. You can change every single detail afterwards.
          </p>
        </div>

        <div class="atb-choice-grid">
          <button type="button" class="atb-choice atb-choice-primary" onClick={props.onAi} style={{ position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: "12px", right: "12px", background: "#c85a32", color: "#fff", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase" }}>
              Fast · 30 Sec
            </span>
            <span class="atb-choice-icon">
              <Icon name="sparkles" size={26} />
            </span>
            <strong>Generate with AI</strong>
            <span>Describe what your business does and get a complete custom draft with pages and images.</span>
          </button>

          <button
            type="button"
            class="atb-choice"
            onClick={() => templatesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <span style={{ position: "absolute", top: "12px", right: "12px", background: "#1c1917", color: "#d4af37", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase" }}>
              12+ Styles
            </span>
            <span class="atb-choice-icon">
              <Icon name="layers" size={26} />
            </span>
            <strong>Start with a Trending Template</strong>
            <span>Pick a ready-made 2026 design (Corporate, SaaS, Minimalist, Luxury) and customize.</span>
          </button>
        </div>

        {props.projects.length > 0 && (
          <section class="atb-start-section" aria-labelledby="atb-your-projects">
            <h2 id="atb-your-projects">Your saved projects on this device</h2>
            <ul class="atb-project-list">
              {props.projects.map((p) => (
                <li key={p.id}>
                  <button type="button" class="atb-project" onClick={() => props.onOpen(p.id)}>
                    <strong>{p.name}</strong>
                    <span class="atb-muted">
                      {p.pageCount} page{p.pageCount === 1 ? "" : "s"} · edited {new Date(p.updatedAt).toLocaleString()}
                    </span>
                  </button>
                  <button type="button" class="atb-icon-btn" aria-label={`Delete ${p.name}`} onClick={() => props.onDelete(p.id)}>
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section class="atb-start-section" aria-labelledby="atb-templates" ref={templatesRef}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
            <div>
              <h2 id="atb-templates" style={{ margin: 0 }}>Trending 2026 Ready Templates</h2>
              <p class="atb-muted" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>Diverse aesthetic directions for companies, tech platforms, studios, and shops.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }} role="tablist" aria-label="Template categories">
              {[
                { id: "all", label: "All (12)" },
                { id: "trending", label: "🔥 Top Trending" },
                { id: "corporate", label: "🏢 Corporate Profile" },
                { id: "tech", label: "⚡ SaaS & Tech" },
                { id: "luxury", label: "💎 Luxury Serif" },
                { id: "local", label: "🏺 Local & Food" },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "99px",
                    fontSize: "0.8rem",
                    fontWeight: filter === c.id ? 700 : 500,
                    border: filter === c.id ? "1.5px solid #1c1917" : "1px solid #dcd7ce",
                    background: filter === c.id ? "#1c1917" : "#fff",
                    color: filter === c.id ? "#fff" : "#444",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div class="atb-template-grid">
            {filteredTemplates.map((t) => {
              const preset = THEME_PRESETS.find((p) => p.preset === t.preset)!;
              return (
                <button
                  type="button"
                  key={t.id}
                  class="atb-template"
                  onClick={() => props.onTemplate(t.id)}
                  data-template={t.id}
                  style={{ position: "relative", textAlign: "left" }}
                >
                  {t.tag && (
                    <span
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        zIndex: 3,
                        background: "rgba(28, 25, 23, 0.9)",
                        color: "#d4af37",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {t.tag}
                    </span>
                  )}
                  <span class="atb-template-thumb" aria-hidden="true" style={{ background: preset.colors.bg, position: "relative", minHeight: "150px" }}>
                    <iframe src={`/free-website-builder/template-preview/${t.id}.html`} loading="lazy" tabIndex={-1} sandbox="" title="" />
                  </span>
                  <div style={{ padding: "10px 4px 4px" }}>
                    <strong style={{ fontSize: "1.05rem", color: "#1c1917", display: "block" }}>{t.label}</strong>
                    <span class="atb-muted" style={{ fontSize: "0.85rem", lineHeight: 1.4, marginTop: "2px", display: "block" }}>
                      {t.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section class="atb-start-section atb-start-foot">
          <p class="atb-muted">
            {props.storageOk
              ? "Projects are saved automatically in this browser on this device. Download a project backup to move a project to another computer."
              : "This browser isn't allowing local storage. Download your project backup before closing the tab."}
          </p>
          <button type="button" class="atb-btn atb-btn-ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Import a project backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = (e.currentTarget as HTMLInputElement).files?.[0];
              if (file) props.onImport(file);
              (e.currentTarget as HTMLInputElement).value = "";
            }}
          />
        </section>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI brief form with Top 10 Trending Styles
// ---------------------------------------------------------------------------

export const EMPTY_BRIEF: Brief = {
  businessName: "",
  websiteType: "small-business",
  description: "",
  audience: "",
  style: "auto",
  goal: "enquiries",
  pages: [],
  brandColor: "",
  contact: { email: "", phone: "", whatsapp: "", address: "" },
};

export function Wizard(props: { initial: Brief; remaining: number | null; onBack: () => void; onSubmit: (b: Brief) => void }) {
  const [b, setB] = useState<Brief>(props.initial);
  const [useColor, setUseColor] = useState(!!props.initial.brandColor);
  const [error, setError] = useState("");
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setB((prev) => ({ ...prev, [k]: v }));
  const setContact = (k: keyof Brief["contact"], v: string) => setB((prev) => ({ ...prev, contact: { ...prev.contact, [k]: v } }));

  const submit = (e: Event) => {
    e.preventDefault();
    if (!b.businessName.trim()) return setError("Please enter your business or website name.");
    if (b.description.trim().length < 10) return setError("Please describe your website in a sentence or two.");
    setError("");
    props.onSubmit({ ...b, brandColor: useColor ? b.brandColor || "#c1522e" : "" });
  };

  return (
    <div class="atb-start">
      <header class="atb-start-head">
        <button type="button" class="atb-back-link" onClick={props.onBack}>
          <Icon name="back" size={16} /> Back
        </button>
      </header>
      <main class="atb-start-main atb-wizard">
        <h1>Tell us about your website</h1>
        <p class="atb-muted">Only the first three questions are required. The more you share, the better the first draft.</p>
        <form onSubmit={submit} noValidate>
          <label class="atb-field">
            <span>
              Business or website name <em>*</em>
            </span>
            <input value={b.businessName} maxLength={80} required placeholder="e.g. Meridian Corporate Advisory" onInput={(e) => set("businessName", e.currentTarget.value)} />
          </label>
          <label class="atb-field">
            <span>
              What kind of website? <em>*</em>
            </span>
            <select value={b.websiteType} onChange={(e) => set("websiteType", e.currentTarget.value)}>
              {WEBSITE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label class="atb-field">
            <span>
              Describe your business <em>*</em>
            </span>
            <textarea
              value={b.description}
              rows={4}
              maxLength={1200}
              required
              placeholder="e.g. Strategic business advisory firm in Ahmedabad. We advise founders and boards on growth, finance, and operations. Clean, professional and high-trust tone."
              onInput={(e) => set("description", e.currentTarget.value)}
            />
            <small class="atb-muted">What you do, where, for whom, and what makes you different. {1200 - b.description.length} characters left.</small>
          </label>

          <details class="atb-more" open>
            <summary>Top 10 Trending Styles & Options (2026)</summary>
            <div class="atb-field">
              <span id="atb-style-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Visual Style (Top 10 Trending in 2026)</span>
                <span style={{ background: "#c85a32", color: "#fff", fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px" }}>HOT</span>
              </span>
              <div class="atb-style-grid" role="radiogroup" aria-labelledby="atb-style-label">
                <button type="button" role="radio" aria-checked={b.style === "auto"} class="atb-style" onClick={() => set("style", "auto")}>
                  <span class="atb-style-swatch atb-style-auto" aria-hidden="true">
                    <Icon name="sparkles" />
                  </span>
                  <div>
                    <strong>Let AI choose</strong>
                    <span style={{ fontSize: "0.75rem", display: "block", color: "#666" }}>Optimized for your industry</span>
                  </div>
                </button>
                {TRENDING_STYLES_2026.map((s) => {
                  const p = THEME_PRESETS.find((tp) => tp.preset === s.preset)!;
                  return (
                    <button
                      type="button"
                      key={s.preset}
                      role="radio"
                      aria-checked={b.style === s.preset}
                      class="atb-style"
                      onClick={() => set("style", s.preset)}
                      title={s.tag}
                      style={{ textAlign: "left" }}
                    >
                      <span class="atb-style-swatch" aria-hidden="true" style={{ background: p.colors.bg, borderColor: p.colors.border }}>
                        <span style={{ background: p.colors.accent }} />
                        <span style={{ background: p.colors.text }} />
                      </span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#c85a32" }}>{s.badge}</span>
                        </div>
                        <strong style={{ display: "block", fontSize: "0.88rem" }}>{s.label}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <label class="atb-field">
              <span>Main goal of the website</span>
              <select value={b.goal} onChange={(e) => set("goal", e.currentTarget.value)}>
                {WEBSITE_GOALS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label class="atb-field">
              <span>Who are your customers?</span>
              <input value={b.audience} maxLength={200} placeholder="e.g. Founders, enterprises and professionals" onInput={(e) => set("audience", e.currentTarget.value)} />
            </label>
            <fieldset class="atb-field atb-pages">
              <legend>Extra pages (Home is always included)</legend>
              {PAGE_OPTIONS.map((p) => (
                <label key={p} class="atb-check">
                  <input
                    type="checkbox"
                    checked={b.pages.includes(p)}
                    onChange={(e) => set("pages", e.currentTarget.checked ? [...b.pages, p] : b.pages.filter((x) => x !== p))}
                  />
                  {p}
                </label>
              ))}
              <small class="atb-muted">Fewer pages generate faster. You can add pages later.</small>
            </fieldset>
            <div class="atb-field">
              <label class="atb-check">
                <input type="checkbox" checked={useColor} onChange={(e) => setUseColor(e.currentTarget.checked)} />I have a brand colour
              </label>
              {useColor && (
                <label class="atb-color-row">
                  <input type="color" value={b.brandColor || "#c1522e"} onInput={(e) => set("brandColor", e.currentTarget.value)} aria-label="Brand colour" />
                  <span class="atb-muted">{b.brandColor || "#c1522e"}</span>
                </label>
              )}
            </div>
          </details>

          <details class="atb-more">
            <summary>Contact details (optional)</summary>
            <p class="atb-muted">These go straight into your contact section. The AI never makes up contact details — anything you leave empty stays empty.</p>
            <div class="atb-two">
              <label class="atb-field">
                <span>Email</span>
                <input type="email" value={b.contact.email} maxLength={120} onInput={(e) => setContact("email", e.currentTarget.value)} />
              </label>
              <label class="atb-field">
                <span>Phone</span>
                <input type="tel" value={b.contact.phone} maxLength={30} onInput={(e) => setContact("phone", e.currentTarget.value)} />
              </label>
              <label class="atb-field">
                <span>WhatsApp number</span>
                <input type="tel" value={b.contact.whatsapp} maxLength={30} placeholder="+91 …" onInput={(e) => setContact("whatsapp", e.currentTarget.value)} />
              </label>
              <label class="atb-field">
                <span>City or address</span>
                <input value={b.contact.address} maxLength={240} onInput={(e) => setContact("address", e.currentTarget.value)} />
              </label>
            </div>
          </details>

          {error && (
            <p class="atb-error" role="alert">
              <Icon name="alert" /> {error}
            </p>
          )}
          <div class="atb-wizard-actions">
            <button type="submit" class="atb-btn atb-btn-primary atb-btn-lg">
              <Icon name="sparkles" /> Generate my website
            </button>
            <span class="atb-muted">
              Uses 1 free AI request{props.remaining !== null ? ` · ${props.remaining} left today` : ""}. Your description is sent to our AI provider to write the draft and is not stored by ATITTLE.
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generation progress / error
// ---------------------------------------------------------------------------

const STAGES = ["Planning your pages…", "Writing your headline and copy…", "Choosing colours and fonts…", "Laying out sections…", "Checking everything fits together…"];

export function Generating(props: {
  brief: Brief;
  error: { code: string; message: string; retryable: boolean } | null;
  onCancel: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onTemplates: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (props.error) return;
    setElapsed(0);
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [props.error]);
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(elapsed / 5))]!;
  const retryable = props.error && props.error.retryable && !["quota_exceeded", "not_configured", "invalid_input", "unavailable"].includes(props.error.code);

  return (
    <div class="atb-start">
      <main class="atb-start-main atb-generating">
        {!props.error ? (
          <>
            <BuildingPreview brief={props.brief} />
            <h1 aria-live="polite">{stage}</h1>
            <p class="atb-muted">This usually takes 15–45 seconds. {elapsed > 0 ? `${elapsed}s` : ""}</p>
            <div class="atb-progress" aria-hidden="true">
              <span />
            </div>
            <button type="button" class="atb-btn atb-btn-ghost" onClick={props.onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <span class="atb-error-icon" aria-hidden="true">
              <Icon name="alert" size={32} />
            </span>
            <h1>We couldn't generate your website</h1>
            <p role="alert">{props.error.message}</p>
            <div class="atb-wizard-actions atb-center">
              {retryable && (
                <button type="button" class="atb-btn atb-btn-primary" onClick={props.onRetry}>
                  Try again
                </button>
              )}
              <button type="button" class="atb-btn atb-btn-ghost" onClick={props.onEdit}>
                Change my answers
              </button>
              <button type="button" class="atb-btn atb-btn-ghost" onClick={props.onTemplates}>
                Start from a template instead
              </button>
            </div>
            {retryable && <p class="atb-muted">Your answers are kept. Failed attempts don't use up your free AI requests.</p>}
          </>
        )}
      </main>
    </div>
  );
}

/** Decorative "site assembling itself" animation shown while the AI works, in the visitor's chosen style. */
function BuildingPreview({ brief }: { brief: Brief }) {
  const preset = THEME_PRESETS.find((p) => p.preset === brief.style) ?? THEME_PRESETS[0]!;
  const c = brief.brandColor ? { ...preset.colors, accent: brief.brandColor } : preset.colors;
  const vars = { "--b-bg": c.bg, "--b-surface": c.surface, "--b-text": c.text, "--b-accent": c.accent, "--b-dark": c.dark, "--b-border": c.border } as Record<string, string>;
  return (
    <div class="atb-build" style={vars} aria-hidden="true">
      <div class="atb-build-bar">
        <i />
        <i />
        <i />
      </div>
      <div class="atb-build-page">
        <div class="atb-b atb-b-nav">
          <span class="atb-b-brand">{brief.businessName || "Your website"}</span>
          <span class="atb-b-links">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div class="atb-b atb-b-hero">
          <i class="atb-b-line atb-b-w70" />
          <i class="atb-b-line atb-b-w50" />
          <i class="atb-b-line atb-b-thin atb-b-w60" />
          <i class="atb-b-btn" />
        </div>
        <div class="atb-b atb-b-cards">
          <i />
          <i />
          <i />
        </div>
        <div class="atb-b atb-b-band" />
        <div class="atb-b atb-b-foot" />
      </div>
      <span class="atb-build-cursor" />
    </div>
  );
}
