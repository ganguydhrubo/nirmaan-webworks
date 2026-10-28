import { useEffect, useRef, useState } from "preact/hooks";
import { getSectionDef, normalizeFields, type FieldSpec, type ImageValue } from "@/lib/builder/catalog";
import type { Section } from "@/lib/builder/schema";
import { safeHref, safeImageSrc, ASSET_PREFIX, PAGE_LINK_PREFIX } from "@/lib/builder/sanitize";
import {
  useEditor,
  findSection,
  updateProp,
  updateSection,
  duplicateSection,
  removeSection,
  moveSection,
  currentPage,
  getState,
  type EditorState,
} from "./store";
import { ImageStudio, type StudioTab } from "./ImageStudio";
import { saveNow } from "./autosave";
import { Icon, confirmDialog } from "./ui";

export function Properties({ onAskAi }: { onAskAi: () => void }) {
  const selectedId = useEditor((s) => s.selectedId);
  const section = useEditor((s) => findSection(s.selectedId, s));
  const focusPath = useEditor((s) => s.focusPath);

  if (!selectedId || !section) {
    return (
      <div class="atb-props-empty">
        <Icon name="layers" size={28} />
        <p>
          <strong>Select a section</strong>
        </p>
        <p class="atb-muted">Click any section in the preview (or in the list on the left) to edit its content and style here. Click directly on text in the preview to type over it.</p>
      </div>
    );
  }
  const def = getSectionDef(section.type)!;
  return (
    <div class="atb-props" key={section.id}>
      <div class="atb-props-head">
        <div>
          <p class="atb-eyebrow">Selected section</p>
          <h2>{def.label}</h2>
        </div>
        <SectionActions section={section} />
      </div>
      <button type="button" class="atb-btn atb-btn-soft atb-full" onClick={onAskAi}>
        <Icon name="sparkles" /> Ask AI to edit this section
      </button>

      {def.variants.length > 1 && (
        <label class="atb-field">
          <span>Layout</span>
          <select value={section.variant} onChange={(e) => updateSection(section.id, { variant: e.currentTarget.value })}>
            {def.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div class="atb-fieldset">
        {def.fields.map((f) => (
          <FieldControl key={f.key} section={section} field={f} path={f.key} focusPath={focusPath} />
        ))}
      </div>

      {section.type !== "navbar" && <StyleControls section={section} />}
    </div>
  );
}

function SectionActions({ section }: { section: Section }) {
  const pinned = !!getSectionDef(section.type)?.pinned;
  const index = useEditor((s) => currentPage(s).sections.findIndex((x) => x.id === section.id));
  return (
    <div class="atb-row-actions">
      {!pinned && (
        <>
          <button type="button" class="atb-icon-btn" aria-label="Move section up" onClick={() => moveSection(section.id, index - 1)}>
            <Icon name="up" />
          </button>
          <button type="button" class="atb-icon-btn" aria-label="Move section down" onClick={() => moveSection(section.id, index + 1)}>
            <Icon name="down" />
          </button>
          <button type="button" class="atb-icon-btn" aria-label="Duplicate section" onClick={() => duplicateSection(section.id)}>
            <Icon name="copy" />
          </button>
        </>
      )}
      <button
        type="button"
        class="atb-icon-btn atb-danger"
        aria-label="Delete section"
        onClick={() => {
          if (confirmDialog(`Delete this ${getSectionDef(section.type)?.label.toLowerCase()} section? You can undo this.`)) removeSection(section.id);
        }}
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}

function StyleControls({ section }: { section: Section }) {
  return (
    <details class="atb-more" open>
      <summary>Section style</summary>
      <div class="atb-field">
        <span>Background</span>
        <div class="atb-seg atb-seg-grid" role="radiogroup" aria-label="Background">
          {(
            [
              ["default", "Page"],
              ["surface", "Soft"],
              ["accent", "Brand"],
              ["dark", "Dark"],
              ["gradient", "Glow"],
              ["pattern", "Dots"],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={section.style.background === v} onClick={() => updateSection(section.id, { style: { ...section.style, background: v } })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {section.type !== "footer" && (
        <div class="atb-two">
          <div class="atb-field">
            <span>Text alignment</span>
            <div class="atb-seg" role="radiogroup" aria-label="Text alignment">
              {(["left", "center"] as const).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={section.style.align === v} onClick={() => updateSection(section.id, { style: { ...section.style, align: v } })}>
                  {v === "left" ? "Left" : "Center"}
                </button>
              ))}
            </div>
          </div>
          <label class="atb-field">
            <span>Spacing</span>
            <select value={section.style.spacing} onChange={(e) => updateSection(section.id, { style: { ...section.style, spacing: e.currentTarget.value as Section["style"]["spacing"] } })}>
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
        </div>
      )}
    </details>
  );
}

// ---------------------------------------------------------------------------
// Field controls
// ---------------------------------------------------------------------------

function valueAt(section: Section, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), section.props);
}

function FieldControl({ section, field, path, focusPath }: { section: Section; field: FieldSpec; path: string; focusPath: string | null }) {
  const value = valueAt(section, path);
  const id = `f-${section.id}-${path.replace(/\./g, "-")}`;
  switch (field.kind) {
    case "text":
      return (
        <label class="atb-field" for={id}>
          <span>{field.label}</span>
          <input id={id} value={String(value ?? "")} maxLength={field.max} onInput={(e) => updateProp(section.id, path, e.currentTarget.value)} />
          {field.help && <small class="atb-muted">{field.help}</small>}
        </label>
      );
    case "textarea":
      return (
        <label class="atb-field" for={id}>
          <span>{field.label}</span>
          <textarea id={id} value={String(value ?? "")} maxLength={field.max} rows={field.max > 600 ? 7 : 3} onInput={(e) => updateProp(section.id, path, e.currentTarget.value)} />
          {field.help && <small class="atb-muted">{field.help}</small>}
        </label>
      );
    case "bool":
      return (
        <div class="atb-field">
          <label class="atb-check">
            <input type="checkbox" checked={value === true} onChange={(e) => updateProp(section.id, path, e.currentTarget.checked)} />
            {field.label}
          </label>
          {field.help && <small class="atb-muted">{field.help}</small>}
        </div>
      );
    case "lines":
      return (
        <label class="atb-field" for={id}>
          <span>{field.label}</span>
          <textarea
            id={id}
            rows={4}
            value={Array.isArray(value) ? (value as string[]).join("\n") : ""}
            onInput={(e) =>
              updateProp(
                section.id,
                path,
                e.currentTarget.value
                  .split("\n")
                  .slice(0, field.maxItems)
                  .map((l) => l.slice(0, field.maxEach)),
              )
            }
          />
        </label>
      );
    case "link":
      return <LinkField section={section} field={field} path={path} value={String(value ?? "")} id={id} />;
    case "image":
      return <ImageField section={section} field={field} path={path} value={(value ?? { src: "", alt: "" }) as ImageValue} focus={focusPath === path} />;
    case "list":
      return <ListField section={section} field={field} path={path} items={Array.isArray(value) ? (value as Record<string, unknown>[]) : []} focusPath={focusPath} />;
  }
}

function linkTargets(s: EditorState): { value: string; label: string }[] {
  const page = currentPage(s);
  const out: { value: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const p of s.doc.pages) {
    for (const sec of p.sections) {
      if (sec.type === "navbar" || sec.type === "footer" || seen.has(sec.type)) continue;
      seen.add(sec.type);
      out.push({ value: `#${sec.type}`, label: `Section: ${getSectionDef(sec.type)?.label}${p.id !== page.id ? ` (on ${p.title})` : ""}` });
    }
  }
  for (const p of s.doc.pages) out.push({ value: `${PAGE_LINK_PREFIX}${p.slug}`, label: `Page: ${p.title}` });
  return out;
}

function LinkField({ section, field, path, value, id }: { section: Section; field: Extract<FieldSpec, { kind: "link" }>; path: string; value: string; id: string }) {
  const targets = useEditor(linkTargets);
  const isPreset = value === "" || targets.some((t) => t.value === value);
  const [custom, setCustom] = useState(!isPreset);
  const [draft, setDraft] = useState(isPreset ? "" : value);
  const invalid = custom && draft.trim() !== "" && !safeHref(draft);
  const isFormEndpoint = field.key === "formEndpoint";

  if (isFormEndpoint) {
    return (
      <label class="atb-field" for={id}>
        <span>{field.label}</span>
        <input
          id={id}
          type="url"
          placeholder="https://formspree.io/f/…"
          value={draft || value}
          onInput={(e) => {
            const v = e.currentTarget.value;
            setDraft(v);
            const safe = safeHref(v);
            updateProp(section.id, path, safe.startsWith("https://") ? safe : "");
          }}
        />
        {draft && !safeHref(draft).startsWith("https://") && <small class="atb-error">Must be an https:// address.</small>}
        {field.help && <small class="atb-muted">{field.help}</small>}
      </label>
    );
  }

  return (
    <div class="atb-field">
      <label for={id}>{field.label}</label>
      <select
        id={id}
        value={custom ? "__custom" : value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          if (v === "__custom") {
            setCustom(true);
            return;
          }
          setCustom(false);
          updateProp(section.id, path, v);
        }}
      >
        <option value="">No link</option>
        {targets.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
        <option value="__custom">Web address, email or phone…</option>
      </select>
      {custom && (
        <>
          <input
            aria-label={`${field.label}: custom address`}
            placeholder="https://… or mailto:you@example.com or tel:+91…"
            value={draft}
            onInput={(e) => {
              const v = e.currentTarget.value;
              setDraft(v);
              updateProp(section.id, path, safeHref(v));
            }}
          />
          {invalid && <small class="atb-error">This link isn't valid. Use a web address (https://…), mailto: or tel:.</small>}
        </>
      )}
    </div>
  );
}

function ImageField({ section, field, path, value, focus }: { section: Section; field: Extract<FieldSpec, { kind: "image" }>; path: string; value: ImageValue; focus: boolean }) {
  const assets = useEditor((s) => s.doc.assets);
  const boxRef = useRef<HTMLDivElement>(null);
  const [studio, setStudio] = useState<StudioTab | null>(null);
  const [urlDraft, setUrlDraft] = useState(value.src.startsWith("https://") ? value.src : "");
  const src = safeImageSrc(value.src, new Set(Object.keys(assets)));
  const asset = src.startsWith(ASSET_PREFIX) ? assets[src.slice(ASSET_PREFIX.length)] : undefined;
  const preview = asset ? asset.dataUrl : src;

  useEffect(() => {
    if (focus && boxRef.current) {
      boxRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
      boxRef.current.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
  }, [focus]);

  // Prompt suggestion for AI images: the alt text the AI wrote, else the section's headline.
  const p = section.props as Record<string, unknown>;
  const suggestion = value.alt || String(p.headline ?? p.heading ?? "").slice(0, 200);

  return (
    <div class={`atb-field atb-image-field${focus ? " atb-focus-ring" : ""}`} ref={boxRef}>
      <span>{field.label}</span>
      <div class="atb-image-row">
        <button type="button" class="atb-thumb atb-thumb-btn" onClick={() => setStudio(preview ? "library" : "ai")} aria-label={preview ? "Change image" : "Add an image"}>
          {preview ? <img src={preview} alt="" /> : <Icon name="image" size={22} />}
        </button>
        <div class="atb-image-meta">
          {asset?.source && <span class={`atb-tag atb-tag-${asset.source}`}>{asset.source === "ai" ? "AI-generated" : asset.source === "illustration" ? "Illustration" : "Uploaded"}</span>}
          {!preview && <span class="atb-muted atb-small">No image yet — a soft colour block is shown.</span>}
          {preview && (
            <button type="button" class="atb-link-btn atb-small" onClick={() => updateProp(section.id, path, { src: "", alt: value.alt })}>
              Remove image
            </button>
          )}
        </div>
      </div>
      <div class="atb-image-sources">
        <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={() => setStudio("stock")}>
          <Icon name="search" size={15} /> Stock Media
        </button>
        <button type="button" class="atb-btn atb-btn-soft atb-btn-sm" onClick={() => setStudio("ai")}>
          <Icon name="sparkles" size={15} /> AI image
        </button>
        <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm" onClick={() => setStudio("upload")}>
          <Icon name="upload" size={15} /> Upload
        </button>
        <button
          type="button"
          class="atb-btn atb-btn-sm"
          style={{ background: "#d4af37", color: "#1c1917", fontWeight: 700 }}
          onClick={async () => {
            const projectId = getState().projectId ?? "";
            await saveNow();
            window.location.href = `/free-brand-studio/app?returnTo=builder&projectId=${encodeURIComponent(projectId)}&targetSection=${encodeURIComponent(section.id)}&targetPath=${encodeURIComponent(path)}`;
          }}
          title="Open Logo & Design Studio"
        >
          <Icon name="sparkles" size={15} /> Create or Edit Logo
        </button>
        <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm" onClick={() => setStudio("library")}>
          <Icon name="image" size={15} /> Your images
        </button>
        <button type="button" class="atb-btn atb-btn-ghost atb-btn-sm" onClick={() => setStudio("illustration")}>
          <Icon name="palette" size={15} /> Illustration
        </button>
      </div>
      <details class="atb-sub">
        <summary>Use an image web address instead</summary>
        <input
          type="url"
          placeholder="https://…/photo.jpg"
          value={urlDraft}
          aria-label="Image web address"
          onInput={(e) => {
            const v = e.currentTarget.value;
            setUrlDraft(v);
            const safe = safeImageSrc(v);
            if (safe || !v) updateProp(section.id, path, { src: safe, alt: value.alt });
          }}
        />
        {urlDraft && !safeImageSrc(urlDraft) && <small class="atb-error">Use an https:// link to a JPG, PNG, WebP or GIF image.</small>}
        <small class="atb-muted">Linked images load from that website, so they must stay online. Uploading is more reliable. Only use images you have permission to use.</small>
      </details>
      <label class="atb-field atb-tight">
        <span>Image description (for screen readers and Google)</span>
        <input value={value.alt} maxLength={160} onInput={(e) => updateProp(section.id, `${path}.alt`, e.currentTarget.value)} />
      </label>
      {studio && <ImageStudio sectionId={section.id} path={path} alt={value.alt} suggestion={suggestion} initialTab={studio} onClose={() => setStudio(null)} />}
    </div>
  );
}

function ListField({ section, field, path, items, focusPath }: { section: Section; field: Extract<FieldSpec, { kind: "list" }>; path: string; items: Record<string, unknown>[]; focusPath: string | null }) {
  const [open, setOpen] = useState<number | null>(() => {
    const m = focusPath?.match(new RegExp(`^${path}\\.(\\d+)\\.`));
    return m ? Number(m[1]) : null;
  });
  useEffect(() => {
    const m = focusPath?.match(new RegExp(`^${path}\\.(\\d+)\\.`));
    if (m) setOpen(Number(m[1]));
  }, [focusPath, path]);

  const setItems = (next: Record<string, unknown>[]) => updateProp(section.id, path, next);
  const titleOf = (it: Record<string, unknown>, i: number) => {
    const first = field.fields.find((f) => f.kind === "text" || f.kind === "textarea");
    const v = first ? String(it[first.key] ?? "") : "";
    return v ? v.slice(0, 40) : `${field.itemLabel} ${i + 1}`;
  };

  return (
    <div class="atb-field">
      <span>{field.label}</span>
      <ul class="atb-list">
        {items.map((it, i) => (
          <li key={i} class={open === i ? "atb-open" : ""}>
            <div class="atb-list-row">
              <button type="button" class="atb-list-title" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                <Icon name={open === i ? "down" : "up"} size={14} />
                {titleOf(it, i)}
              </button>
              <div class="atb-row-actions">
                <button type="button" class="atb-icon-btn atb-sm" aria-label={`Move ${field.itemLabel.toLowerCase()} up`} disabled={i === 0} onClick={() => setItems(swap(items, i, i - 1))}>
                  <Icon name="up" size={15} />
                </button>
                <button type="button" class="atb-icon-btn atb-sm" aria-label={`Move ${field.itemLabel.toLowerCase()} down`} disabled={i === items.length - 1} onClick={() => setItems(swap(items, i, i + 1))}>
                  <Icon name="down" size={15} />
                </button>
                <button
                  type="button"
                  class="atb-icon-btn atb-sm atb-danger"
                  aria-label={`Remove ${field.itemLabel.toLowerCase()}`}
                  disabled={items.length <= field.minItems}
                  onClick={() => {
                    setItems(items.filter((_, j) => j !== i));
                    setOpen(null);
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
            {open === i && (
              <div class="atb-list-body">
                {field.fields.map((f) => (
                  <FieldControl key={f.key} section={section} field={f} path={`${path}.${i}.${f.key}`} focusPath={focusPath} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {items.length < field.maxItems && (
        <button
          type="button"
          class="atb-btn atb-btn-ghost atb-btn-sm"
          onClick={() => {
            const template = field.default[0] ?? {};
            setItems([...items, normalizeFields(field.fields, template)]);
            setOpen(items.length);
          }}
        >
          <Icon name="plus" size={16} /> Add {field.itemLabel.toLowerCase()}
        </button>
      )}
    </div>
  );
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  const copy = arr.slice();
  [copy[a], copy[b]] = [copy[b]!, copy[a]!];
  return copy;
}

