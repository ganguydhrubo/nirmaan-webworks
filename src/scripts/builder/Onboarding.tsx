import { useEffect, useRef, useState } from "preact/hooks";
import { PAGE_OPTIONS, WEBSITE_GOALS, WEBSITE_TYPES, type BriefShape as Brief } from "@/lib/builder/options";
import { TEMPLATE_LIST } from "@/lib/builder/templates";
import { THEME_PRESETS } from "@/lib/builder/themes";
import type { ProjectSummary } from "./persistence";
import { Icon } from "./ui";

// ---------------------------------------------------------------------------
// Start screen
// ---------------------------------------------------------------------------

export function StartScreen(props: {
  projects: ProjectSummary[];
  storageOk: boolean;
  onAi: () => void;
  onTemplate: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (file: File) => void;
  showTemplates: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (props.showTemplates) templatesRef.current?.scrollIntoView({ block: "start" });
  }, [props.showTemplates]);
  return (
    <div class="atb-start">
      <header class="atb-start-head">
        <a href="/free-website-builder" class="atb-back-link">
          <Icon name="back" size={16} /> ATITTLE
        </a>
      </header>
      <main class="atb-start-main">
        <h1>How would you like to start?</h1>
        <p class="atb-muted">You can change everything afterwards — text, colours, sections and pages.</p>
        <div class="atb-choice-grid">
          <button type="button" class="atb-choice atb-choice-primary" onClick={props.onAi}>
            <span class="atb-choice-icon">
              <Icon name="sparkles" size={26} />
            </span>
            <strong>Generate with AI</strong>
            <span>Answer a few questions and get a first draft of your website in under a minute.</span>
          </button>
          <button type="button" class="atb-choice" onClick={() => templatesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <span class="atb-choice-icon">
              <Icon name="layers" size={26} />
            </span>
            <strong>Start with a template</strong>
            <span>Pick a ready-made design and fill in your own details. No AI needed.</span>
          </button>
        </div>

        {props.projects.length > 0 && (
          <section class="atb-start-section" aria-labelledby="atb-your-projects">
            <h2 id="atb-your-projects">Your projects on this device</h2>
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
          <h2 id="atb-templates">Templates</h2>
          <div class="atb-template-grid">
            {TEMPLATE_LIST.map((t) => {
              const preset = THEME_PRESETS.find((p) => p.preset === t.preset)!;
              return (
                <button type="button" key={t.id} class="atb-template" onClick={() => props.onTemplate(t.id)} data-template={t.id}>
                  <span class="atb-template-thumb" aria-hidden="true" style={{ background: preset.colors.bg }}>
                    <iframe src={`/free-website-builder/template-preview/${t.id}.html`} loading="lazy" tabIndex={-1} sandbox="" title="" />
                  </span>
                  <strong>{t.label}</strong>
                  <span class="atb-muted">{t.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section class="atb-start-section atb-start-foot">
          <p class="atb-muted">
            {props.storageOk
              ? "Projects are saved automatically in this browser on this device. There's no ATITTLE account yet, so download a backup file to move a project to another device."
              : "This browser isn't allowing the builder to save (private browsing can do this). You can still build and download your website — download a project backup before closing the tab."}
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
// AI brief form
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
            <input value={b.businessName} maxLength={80} required placeholder="e.g. Sharma Dental Care" onInput={(e) => set("businessName", e.currentTarget.value)} />
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
              placeholder="e.g. Family dental clinic in Salt Lake, Kolkata. We do check-ups, cleaning, braces and implants. Friendly with nervous patients and children. Open Mon–Sat."
              onInput={(e) => set("description", e.currentTarget.value)}
            />
            <small class="atb-muted">What you do, where, for whom, and what makes you different. {1200 - b.description.length} characters left.</small>
          </label>

          <details class="atb-more" open>
            <summary>Style, goal and pages (optional)</summary>
            <div class="atb-field">
              <span id="atb-style-label">Visual style</span>
              <div class="atb-style-grid" role="radiogroup" aria-labelledby="atb-style-label">
                <button type="button" role="radio" aria-checked={b.style === "auto"} class="atb-style" onClick={() => set("style", "auto")}>
                  <span class="atb-style-swatch atb-style-auto" aria-hidden="true">
                    <Icon name="sparkles" />
                  </span>
                  Let AI choose
                </button>
                {THEME_PRESETS.map((p) => (
                  <button type="button" key={p.preset} role="radio" aria-checked={b.style === p.preset} class="atb-style" onClick={() => set("style", p.preset)} title={p.description}>
                    <span class="atb-style-swatch" aria-hidden="true" style={{ background: p.colors.bg, borderColor: p.colors.border }}>
                      <span style={{ background: p.colors.accent }} />
                      <span style={{ background: p.colors.text }} />
                    </span>
                    {p.label}
                  </button>
                ))}
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
              <input value={b.audience} maxLength={200} placeholder="e.g. Families and working professionals nearby" onInput={(e) => set("audience", e.currentTarget.value)} />
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
  error: { code: string; message: string } | null;
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
  const retryable = props.error && !["quota_exceeded", "not_configured", "invalid_input"].includes(props.error.code);

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
            {retryable && <p class="atb-muted">Trying again uses another free AI request.</p>}
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
