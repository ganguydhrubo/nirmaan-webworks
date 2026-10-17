import { useState } from "preact/hooks";
import { SECTION_DEFS, getSectionDef, type SectionType } from "@/lib/builder/catalog";
import { MAX_PAGES } from "@/lib/builder/schema";
import { FONTS, FONT_NAMES, THEME_PRESETS, themeFromPreset, readableTextOn, type ThemeColors } from "@/lib/builder/themes";
import {
  useEditor,
  currentPage,
  selectSection,
  moveSection,
  addSection,
  addPage,
  renamePage,
  deletePage,
  movePage,
  selectPage,
  setTheme,
  setSiteMeta,
} from "./store";
import { Icon, Modal, confirmDialog } from "./ui";

type Tab = "sections" | "pages" | "design";

export function LeftPanel({ onSelected }: { onSelected?: () => void }) {
  const [tab, setTab] = useState<Tab>("sections");
  return (
    <div class="atb-left">
      <div class="atb-tabs" role="tablist" aria-label="Editor panels">
        {(
          [
            ["sections", "Sections", "layers"],
            ["pages", "Pages", "page"],
            ["design", "Design", "palette"],
          ] as const
        ).map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" id={`atb-tab-${id}`} aria-selected={tab === id} aria-controls={`atb-panel-${id}`} onClick={() => setTab(id)}>
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
      </div>
      <div class="atb-left-body" role="tabpanel" id={`atb-panel-${tab}`} aria-labelledby={`atb-tab-${tab}`}>
        {tab === "sections" && <SectionsTab onSelected={onSelected} />}
        {tab === "pages" && <PagesTab />}
        {tab === "design" && <DesignTab />}
      </div>
    </div>
  );
}

function SectionsTab({ onSelected }: { onSelected?: () => void }) {
  const page = useEditor((s) => currentPage(s));
  const selectedId = useEditor((s) => s.selectedId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");

  const label = (type: SectionType, i: number) => {
    const s = page.sections[i]!;
    const p = s.props as Record<string, unknown>;
    const hint = String(p.headline ?? p.heading ?? p.brand ?? "").slice(0, 34);
    return { title: getSectionDef(type)?.label ?? type, hint };
  };

  return (
    <div>
      <p class="atb-muted atb-small">
        Page: <strong>{page.title}</strong> · drag to reorder, or focus a section and use Alt + ↑/↓.
      </p>
      <ol class="atb-section-list" onDragLeave={() => setOverIndex(null)}>
        {page.sections.map((s, i) => {
          const pinned = !!getSectionDef(s.type)?.pinned;
          const { title, hint } = label(s.type, i);
          return (
            <li
              key={s.id}
              class={`${selectedId === s.id ? "atb-active" : ""} ${overIndex === i && dragId && dragId !== s.id ? "atb-drop-target" : ""}`}
              draggable={!pinned}
              onDragStart={(e) => {
                setDragId(s.id);
                e.dataTransfer?.setData("text/plain", s.id);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) moveSection(dragId, i);
                setDragId(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverIndex(null);
              }}
            >
              <button
                type="button"
                class="atb-section-item"
                aria-current={selectedId === s.id ? "true" : undefined}
                onClick={() => {
                  selectSection(s.id);
                  onSelected?.();
                }}
                onKeyDown={(e) => {
                  if (!e.altKey || pinned) return;
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    moveSection(s.id, i + (e.key === "ArrowUp" ? -1 : 1));
                    setAnnounce(`${title} moved ${e.key === "ArrowUp" ? "up" : "down"}`);
                    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-sid="${s.id}"]`)?.focus());
                  }
                }}
                data-sid={s.id}
              >
                <span class="atb-grip" aria-hidden="true">
                  {pinned ? <Icon name={s.type === "navbar" ? "up" : "down"} size={14} /> : <Icon name="grip" size={16} />}
                </span>
                <span class="atb-section-text">
                  <strong>{title}</strong>
                  {hint && <span class="atb-muted">{hint}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <span class="atb-sr" aria-live="polite">
        {announce}
      </span>
      <button type="button" class="atb-btn atb-btn-primary atb-full" onClick={() => setAdding(true)}>
        <Icon name="plus" /> Add section
      </button>
      {adding && <AddSectionDialog onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddSectionDialog({ onClose }: { onClose: () => void }) {
  const page = useEditor((s) => currentPage(s));
  const selectedId = useEditor((s) => s.selectedId);
  const selectedIndex = page.sections.findIndex((s) => s.id === selectedId);
  return (
    <Modal title="Add a section" onClose={onClose} wide>
      <p class="atb-muted">{selectedIndex >= 0 ? "The new section is added below the selected one." : "The new section is added at the end of the page."}</p>
      <div class="atb-add-grid">
        {SECTION_DEFS.map((d) => {
          const taken = !!d.pinned && page.sections.some((s) => s.type === d.type);
          return (
            <button
              key={d.type}
              type="button"
              class="atb-add-card"
              disabled={taken}
              onClick={() => {
                addSection(d.type, undefined, selectedIndex >= 0 ? selectedIndex + 1 : undefined);
                onClose();
              }}
            >
              <strong>{d.label}</strong>
              <span class="atb-muted">{taken ? "Already on this page" : d.description}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function PagesTab() {
  const pages = useEditor((s) => s.doc.pages);
  const pageId = useEditor((s) => s.pageId);
  const [newTitle, setNewTitle] = useState("");
  return (
    <div>
      <ul class="atb-page-list">
        {pages.map((p, i) => (
          <li key={p.id} class={p.id === pageId ? "atb-active" : ""}>
            <div class="atb-page-row">
              <input aria-label={`Page name: ${p.title}`} value={p.title} maxLength={60} onFocus={() => selectPage(p.id)} onInput={(e) => renamePage(p.id, e.currentTarget.value)} />
              <span class="atb-muted atb-small">{i === 0 ? "index.html (home)" : `${p.slug}.html`}</span>
            </div>
            <div class="atb-row-actions">
              <button type="button" class="atb-icon-btn atb-sm" aria-label={`Open ${p.title}`} onClick={() => selectPage(p.id)}>
                <Icon name="eye" size={15} />
              </button>
              {i > 0 && (
                <>
                  <button type="button" class="atb-icon-btn atb-sm" aria-label={`Move ${p.title} earlier in the menu`} disabled={i === 1} onClick={() => movePage(p.id, -1)}>
                    <Icon name="up" size={15} />
                  </button>
                  <button type="button" class="atb-icon-btn atb-sm" aria-label={`Move ${p.title} later in the menu`} disabled={i === pages.length - 1} onClick={() => movePage(p.id, 1)}>
                    <Icon name="down" size={15} />
                  </button>
                  <button
                    type="button"
                    class="atb-icon-btn atb-sm atb-danger"
                    aria-label={`Delete page ${p.title}`}
                    onClick={() => {
                      if (confirmDialog(`Delete the "${p.title}" page and all its sections? You can undo this.`)) deletePage(p.id);
                    }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {pages.length < MAX_PAGES ? (
        <form
          class="atb-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            addPage(newTitle.trim());
            setNewTitle("");
          }}
        >
          <input value={newTitle} maxLength={60} placeholder="New page name, e.g. Services" aria-label="New page name" onInput={(e) => setNewTitle(e.currentTarget.value)} />
          <button type="submit" class="atb-btn atb-btn-primary atb-btn-sm" disabled={!newTitle.trim()}>
            <Icon name="plus" size={16} /> Add
          </button>
        </form>
      ) : (
        <p class="atb-muted atb-small">You've reached the maximum of {MAX_PAGES} pages.</p>
      )}
      <p class="atb-muted atb-small">The menu at the top of every page lists these pages in this order. New pages copy your navigation bar and footer.</p>
    </div>
  );
}

const COLOR_FIELDS: [keyof ThemeColors, string][] = [
  ["accent", "Brand / buttons"],
  ["bg", "Page background"],
  ["surface", "Soft sections & cards"],
  ["text", "Main text"],
  ["muted", "Secondary text"],
  ["dark", "Dark sections (footer)"],
];

function DesignTab() {
  const theme = useEditor((s) => s.doc.theme);
  const name = useEditor((s) => s.doc.name);
  const description = useEditor((s) => s.doc.description);

  const setColor = (key: keyof ThemeColors, value: string) => {
    const colors = { ...theme.colors, [key]: value };
    if (key === "accent") colors.accentText = readableTextOn(value);
    if (key === "dark") colors.darkText = readableTextOn(value);
    setTheme({ ...theme, colors }, `color:${key}`);
  };

  return (
    <div>
      <div class="atb-field">
        <span>Colour themes</span>
        <div class="atb-preset-grid">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              class={`atb-preset${theme.preset === p.preset ? " atb-active" : ""}`}
              aria-pressed={theme.preset === p.preset}
              title={p.description}
              onClick={() => setTheme(themeFromPreset(p.preset))}
            >
              <span class="atb-style-swatch" aria-hidden="true" style={{ background: p.colors.bg, borderColor: p.colors.border }}>
                <span style={{ background: p.colors.accent }} />
                <span style={{ background: p.colors.text }} />
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <details class="atb-more" open>
        <summary>Colours</summary>
        <div class="atb-color-grid">
          {COLOR_FIELDS.map(([key, label]) => (
            <label key={key} class="atb-color-row">
              <input type="color" value={theme.colors[key]} onInput={(e) => setColor(key, e.currentTarget.value)} aria-label={label} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </details>
      <details class="atb-more" open>
        <summary>Fonts & corners</summary>
        <label class="atb-field">
          <span>Headings font</span>
          <select value={theme.fontHeading} onChange={(e) => setTheme({ ...theme, fontHeading: e.currentTarget.value })}>
            {FONT_NAMES.map((f) => (
              <option key={f} value={f} style={{ fontFamily: FONTS[f]!.stack }}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label class="atb-field">
          <span>Body text font</span>
          <select value={theme.fontBody} onChange={(e) => setTheme({ ...theme, fontBody: e.currentTarget.value })}>
            {FONT_NAMES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <div class="atb-field">
          <span>Corners</span>
          <div class="atb-seg" role="radiogroup" aria-label="Corners">
            {(
              [
                ["sharp", "Sharp"],
                ["soft", "Soft"],
                ["round", "Round"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={theme.radius === v} onClick={() => setTheme({ ...theme, radius: v })}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </details>
      <details class="atb-more" open>
        <summary>Site details (SEO)</summary>
        <label class="atb-field">
          <span>Website name</span>
          <input value={name} maxLength={80} onInput={(e) => setSiteMeta({ name: e.currentTarget.value })} />
          <small class="atb-muted">Shown in browser tabs and Google results.</small>
        </label>
        <label class="atb-field">
          <span>Short description</span>
          <textarea value={description} maxLength={300} rows={3} onInput={(e) => setSiteMeta({ description: e.currentTarget.value })} />
          <small class="atb-muted">One or two sentences Google may show under your site's name. {300 - description.length} left.</small>
        </label>
      </details>
    </div>
  );
}

