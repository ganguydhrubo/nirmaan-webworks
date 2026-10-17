import { useEffect, useRef, useState } from "preact/hooks";
import { MAX_ASSETS, type Asset } from "@/lib/builder/schema";
import { useEditor, setUploadedImage, applyLibraryImage, renameAsset, deleteAsset, assetUsage, getState } from "./store";
import { processUpload, ACCEPT_ATTR } from "./images";
import { generateAiImage, imageAvailability, toWebAsset } from "./api";
import { ILLUSTRATION_STYLES, illustrationAsset, type IllustrationStyle } from "./illustrations";
import { Icon, Modal, toast, confirmDialog } from "./ui";

export type StudioTab = "ai" | "upload" | "library" | "illustration";

const ASPECTS: { id: string; label: string; ratio: number }[] = [
  { id: "16:9", label: "Wide 16:9", ratio: 16 / 9 },
  { id: "4:3", label: "Standard 4:3", ratio: 4 / 3 },
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "3:4", label: "Portrait 3:4", ratio: 3 / 4 },
];
const STYLES = [
  { id: "photo", label: "Photo" },
  { id: "illustration", label: "Illustration" },
  { id: "minimal", label: "Minimal" },
  { id: "3d", label: "3D render" },
  { id: "watercolor", label: "Watercolour" },
];
const SOURCE_LABEL: Record<string, string> = { upload: "Uploaded", ai: "AI-generated", illustration: "Illustration", url: "From link" };

export function ImageStudio(props: { sectionId: string; path: string; alt: string; suggestion: string; initialTab?: StudioTab; onClose: () => void }) {
  const [tab, setTab] = useState<StudioTab>(props.initialTab ?? "ai");
  const assets = useEditor((s) => s.doc.assets);
  const full = Object.keys(assets).length >= MAX_ASSETS;

  const apply = (asset: Asset, alt: string, message: string) => {
    if (Object.keys(getState().doc.assets).length >= MAX_ASSETS) {
      toast(`Your project already has ${MAX_ASSETS} images. Delete unused ones in "Your images" first.`, "error");
      return;
    }
    setUploadedImage(props.sectionId, props.path, asset, alt);
    toast(message, "success", undefined, 2500);
    props.onClose();
  };

  return (
    <Modal title="Choose an image" onClose={props.onClose} wide>
      <div class="atb-studio-tabs" role="tablist" aria-label="Image source">
        {(
          [
            ["ai", "Generate with AI", "sparkles"],
            ["upload", "Upload", "upload"],
            ["library", `Your images (${Object.keys(assets).length})`, "image"],
            ["illustration", "Illustration", "palette"],
          ] as const
        ).map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
      </div>
      {full && tab !== "library" && <p class="atb-error">This project has the maximum {MAX_ASSETS} images. Delete unused ones in "Your images" to add more.</p>}
      {tab === "ai" && <AiTab suggestion={props.suggestion} onApply={(a, alt) => apply(a, alt, "AI image added.")} />}
      {tab === "upload" && <UploadTab alt={props.alt} onApply={(a, alt) => apply(a, alt, "Image added.")} />}
      {tab === "library" && (
        <LibraryTab
          onPick={(id) => {
            applyLibraryImage(props.sectionId, props.path, id, props.alt || assets[id]?.name || "");
            toast("Image applied.", "success", undefined, 2000);
            props.onClose();
          }}
        />
      )}
      {tab === "illustration" && <IllustrationTab onApply={(a) => apply(a, "", "Illustration added.")} />}
    </Modal>
  );
}

function AiTab({ suggestion, onApply }: { suggestion: string; onApply: (a: Asset, alt: string) => void }) {
  const [status, setStatus] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [prompt, setPrompt] = useState(suggestion);
  const [aspect, setAspect] = useState("4:3");
  const [style, setStyle] = useState("photo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ asset: Asset; width: number; height: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void imageAvailability().then(setStatus);
    return () => abortRef.current?.abort();
  }, []);

  const run = async () => {
    if (busy || prompt.trim().length < 3) return;
    setBusy(true);
    setError("");
    setResult(null);
    abortRef.current = new AbortController();
    const r = await generateAiImage(prompt.trim(), aspect, style, abortRef.current.signal);
    setBusy(false);
    if (!r.ok) {
      if (r.code !== "aborted") setError(r.message);
      if (r.code === "unavailable" || r.code === "not_configured") setStatus({ available: false, reason: r.message });
      return;
    }
    try {
      // Store a web-sized copy (the provider image can be several MB).
      const asset = await toWebAsset(r.asset.dataUrl, r.asset.name, "ai", r.asset.prompt);
      setResult({ asset, width: r.width, height: r.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process the generated image.");
    }
  };

  if (status && !status.available) {
    return (
      <div class="atb-studio-pane">
        <div class="atb-notice atb-notice-witty" role="status">
          <span class="atb-notice-emoji" aria-hidden="true">
            😏
          </span>
          <div>
            <strong>Trust us, AI-generated images aren't exactly free magic!</strong>
            <p>Our AI image generator is currently unavailable. Need a stunning visual? Get in touch with us, and we'll help bring your vision to life.</p>
            <a class="atb-btn atb-btn-primary atb-btn-sm atb-notice-cta" href="/contact" target="_blank" rel="noopener" data-analytics-event="builder_image_unavailable_contact">
              Contact Us <span aria-hidden="true">→</span>
            </a>
            <p class="atb-muted atb-small">Meanwhile, you can upload your own photo, reuse one from your images, or add an illustration in your site's colours.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div class="atb-studio-pane">
      <label class="atb-field">
        <span>Describe the image</span>
        <textarea rows={3} maxLength={600} value={prompt} disabled={busy} onInput={(e) => setPrompt(e.currentTarget.value)} placeholder="e.g. A bright, modern dental clinic reception with plants and natural light" />
      </label>
      <div class="atb-two">
        <div class="atb-field">
          <span>Style</span>
          <div class="atb-chips">
            {STYLES.map((s) => (
              <button key={s.id} type="button" class={`atb-chip${style === s.id ? " atb-chip-on" : ""}`} aria-pressed={style === s.id} onClick={() => setStyle(s.id)} disabled={busy}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div class="atb-field">
          <span>Shape</span>
          <div class="atb-chips">
            {ASPECTS.map((a) => (
              <button key={a.id} type="button" class={`atb-chip${aspect === a.id ? " atb-chip-on" : ""}`} aria-pressed={aspect === a.id} onClick={() => setAspect(a.id)} disabled={busy}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && (
        <p class="atb-error" role="alert">
          <Icon name="alert" /> {error}
        </p>
      )}
      {busy && (
        <div class="atb-gen-wait" role="status">
          <span class="atb-spinner atb-spinner-dark" aria-hidden="true" /> Generating your image… this can take 10–30 seconds.
          <button type="button" class="atb-link-btn" onClick={() => abortRef.current?.abort()}>
            Cancel
          </button>
        </div>
      )}
      {result && (
        <figure class="atb-gen-result">
          <img src={result.asset.dataUrl} alt="" />
          <figcaption class="atb-muted atb-small">
            AI-generated · {result.width}×{result.height}
          </figcaption>
        </figure>
      )}
      <div class="atb-modal-actions">
        <span class="atb-muted atb-small">Uses 1 of your free AI images for today. Images are created by an AI model; check them before publishing.</span>
        {result ? (
          <>
            <button type="button" class="atb-btn atb-btn-ghost" onClick={() => void run()} disabled={busy}>
              Regenerate
            </button>
            <button type="button" class="atb-btn atb-btn-primary" onClick={() => onApply(result.asset, prompt.slice(0, 150))}>
              <Icon name="check" /> Use this image
            </button>
          </>
        ) : (
          <button type="button" class="atb-btn atb-btn-primary" onClick={() => void run()} disabled={busy || prompt.trim().length < 3 || !status}>
            <Icon name="sparkles" /> Generate image
          </button>
        )}
      </div>
    </div>
  );
}

function UploadTab({ alt, onApply }: { alt: string; onApply: (a: Asset, alt: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const asset = await processUpload(file);
      onApply(asset, alt || asset.name.replace(/[-_]+/g, " "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't use that image.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="atb-studio-pane">
      <button
        type="button"
        class={`atb-drop${drag ? " atb-drop-on" : ""}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handle(e.dataTransfer?.files?.[0]);
        }}
        disabled={busy}
      >
        <Icon name="upload" size={28} />
        <strong>{busy ? "Processing…" : "Click to choose a photo, or drop it here"}</strong>
        <span class="atb-muted">JPG, PNG, WebP or GIF, up to 15 MB. We resize it for the web and remove camera location data.</span>
      </button>
      <input ref={fileRef} type="file" accept={ACCEPT_ATTR} hidden onChange={(e) => void handle(e.currentTarget.files?.[0] ?? undefined)} />
      {error && (
        <p class="atb-error" role="alert">
          <Icon name="alert" /> {error}
        </p>
      )}
      <p class="atb-muted atb-small">Only upload images you own or have permission to use. Images are saved with your project in this browser and included in your download.</p>
    </div>
  );
}

function LibraryTab({ onPick }: { onPick: (id: string) => void }) {
  const doc = useEditor((s) => s.doc);
  const entries = Object.entries(doc.assets);
  if (!entries.length) return <p class="atb-muted atb-studio-pane">No images yet. Upload one, generate one, or add an illustration — it will appear here for reuse.</p>;
  return (
    <div class="atb-studio-pane">
      <ul class="atb-library">
        {entries.map(([id, asset]) => {
          const used = assetUsage(doc, id);
          return (
            <li key={id}>
              <button type="button" class="atb-lib-thumb" onClick={() => onPick(id)} aria-label={`Use ${asset.name}`}>
                <img src={asset.dataUrl} alt="" loading="lazy" />
              </button>
              <input class="atb-lib-name" value={asset.name} maxLength={80} aria-label="Image name" onInput={(e) => renameAsset(id, e.currentTarget.value)} />
              <div class="atb-lib-meta">
                <span class={`atb-tag atb-tag-${asset.source ?? "upload"}`}>{SOURCE_LABEL[asset.source ?? "upload"]}</span>
                <span class="atb-muted atb-small">{used ? `Used ${used}×` : "Not used"}</span>
                <button
                  type="button"
                  class="atb-icon-btn atb-sm atb-danger"
                  aria-label={`Delete ${asset.name}`}
                  disabled={used > 0}
                  title={used > 0 ? "In use — replace it in its section first" : "Delete"}
                  onClick={() => {
                    if (confirmDialog(`Delete "${asset.name}" from this project?`)) deleteAsset(id);
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IllustrationTab({ onApply }: { onApply: (a: Asset) => void }) {
  const colors = useEditor((s) => s.doc.theme.colors);
  const [style, setStyle] = useState<IllustrationStyle>("mesh");
  const [aspect, setAspect] = useState(ASPECTS[1]!);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [preview, setPreview] = useState<Asset | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setError("");
    illustrationAsset(style, colors, aspect.ratio, seed)
      .then((a) => live && setPreview(a))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Couldn't draw the illustration."));
    return () => {
      live = false;
    };
  }, [style, aspect, seed, colors]);
  return (
    <div class="atb-studio-pane">
      <p class="atb-muted atb-small">Abstract artwork drawn in your site's colours — a tasteful stand-in until you have real photos. It's labelled as an illustration, not a photo.</p>
      <div class="atb-chips">
        {ILLUSTRATION_STYLES.map((s) => (
          <button key={s.id} type="button" class={`atb-chip${style === s.id ? " atb-chip-on" : ""}`} aria-pressed={style === s.id} onClick={() => setStyle(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div class="atb-chips atb-mt">
        {ASPECTS.map((a) => (
          <button key={a.id} type="button" class={`atb-chip${aspect.id === a.id ? " atb-chip-on" : ""}`} aria-pressed={aspect.id === a.id} onClick={() => setAspect(a)}>
            {a.label}
          </button>
        ))}
      </div>
      {error && <p class="atb-error">{error}</p>}
      {preview && (
        <figure class="atb-gen-result">
          <img src={preview.dataUrl} alt="" />
          <figcaption class="atb-muted atb-small">Illustration</figcaption>
        </figure>
      )}
      <div class="atb-modal-actions">
        <button type="button" class="atb-btn atb-btn-ghost" onClick={() => setSeed(Math.floor(Math.random() * 1e6))}>
          Shuffle
        </button>
        <button type="button" class="atb-btn atb-btn-primary" disabled={!preview} onClick={() => preview && onApply(preview)}>
          <Icon name="check" /> Use this illustration
        </button>
      </div>
    </div>
  );
}
