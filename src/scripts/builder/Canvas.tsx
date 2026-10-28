import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { googleFontsHref } from "@/lib/builder/render";
import {
  getState,
  subscribe,
  currentPage,
  selectSection,
  selectPage,
  moveSection,
  duplicateSection,
  removeSection,
  updateProp,
  undo,
  redo,
  getIn,
  findSection,
  useEditor,
  type Viewport,
} from "./store";
import { previewBody, previewCss, previewDocument } from "./preview";
import { saveNow } from "./autosave";

const DEVICE_WIDTH: Record<Viewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

interface BridgeMsg {
  __atb?: number;
  type?: string;
  id?: string;
  action?: string;
  focusPath?: string;
  image?: string | null;
  key?: string;
  value?: string;
  slug?: string;
  anchor?: string;
  shift?: boolean;
}

export function Canvas() {
  const viewport = useEditor((s) => s.viewport);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });
  // A fresh <iframe> per (re)load: setting srcdoc on an already-loaded
  // frame doesn't reliably navigate it in every browser/timing.
  const [frame, setFrame] = useState({ html: "", n: 0 });
  const ready = useRef(false);
  const queue = useRef<Record<string, unknown>[]>([]);
  const pendingAnchor = useRef("");

  // Measure the available area so the device frame scales to fit.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const send = (msg: Record<string, unknown>) => {
      const win = frameRef.current?.contentWindow;
      if (!ready.current || !win) {
        queue.current.push(msg);
        return;
      }
      // The preview has an opaque origin (sandbox without allow-same-origin),
      // so "*" is the only possible target; the content is not sensitive.
      win.postMessage({ ...msg, __atb: 1 }, "*");
    };

    let s = getState();
    let loadKey = "";
    const reload = () => {
      const st = getState();
      const page = currentPage(st);
      loadKey = `${page.id}|${googleFontsHref(st.doc.theme)}`;
      ready.current = false;
      queue.current = [];
      const html = previewDocument(st.doc, page, true);
      setFrame((f) => ({ html, n: f.n + 1 }));
    };
    reload();

    const unsub = subscribe(() => {
      const next = getState();
      const page = currentPage(next);
      const key = `${page.id}|${googleFontsHref(next.doc.theme)}`;
      if (key !== loadKey) {
        reload();
      } else {
        if (next.doc !== s.doc) {
          if (next.doc.theme !== s.doc.theme)
            send({ type: "css", css: previewCss(next.doc) });
          // Inline edits typed in the canvas are already on screen; re-rendering
          // would reset the caret mid-sentence.
          if (next.lastOrigin !== "canvas" && currentPage(s) !== page)
            send({
              type: "body",
              html: previewBody(next.doc, page),
              selected: next.selectedId,
            });
          else if (next.lastOrigin !== "canvas" && pageContentChanged(s, next))
            send({
              type: "body",
              html: previewBody(next.doc, page),
              selected: next.selectedId,
            });
        }
        if (next.selectedId !== s.selectedId)
          send({
            type: "select",
            id: next.selectedId,
            scroll: next.lastOrigin !== "canvas" && !next.focusPath,
          });
      }
      s = next;
    });

    const onMessage = (e: MessageEvent) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow)
        return;
      const m = (e.data ?? {}) as BridgeMsg;
      if (m.__atb !== 1) return;
      switch (m.type) {
        case "ready": {
          ready.current = true;
          const st = getState();
          if (st.selectedId)
            queue.current.push({
              type: "select",
              id: st.selectedId,
              scroll: false,
            });
          if (pendingAnchor.current)
            queue.current.push({
              type: "scrollTo",
              anchor: pendingAnchor.current,
            });
          pendingAnchor.current = "";
          const pending = queue.current;
          queue.current = [];
          pending.forEach(send);
          break;
        }
        case "select":
          if (typeof m.id === "string")
            selectSection(
              m.id,
              typeof m.image === "string"
                ? m.image.slice(m.image.indexOf(":") + 1)
                : null,
            );
          break;
        case "text": {
          if (typeof m.key !== "string" || typeof m.value !== "string") break;
          const sep = m.key.indexOf(":");
          const sectionId = m.key.slice(0, sep);
          const path = m.key.slice(sep + 1);
          const section = findSection(sectionId);
          if (!section || getIn(section.props, path) === m.value) break;
          updateProp(sectionId, path, m.value.slice(0, 5000), "canvas");
          break;
        }
        case "navigate": {
          const st = getState();
          const target = st.doc.pages.find((p) => p.slug === m.slug);
          if (target) {
            pendingAnchor.current = m.anchor ?? "";
            selectPage(target.id);
          }
          break;
        }
        case "action": {
          if (typeof m.id !== "string" || typeof m.action !== "string") break;
          const st = getState();
          const page = currentPage(st);
          const idx = page.sections.findIndex((s) => s.id === m.id);
          if (idx < 0) break;
          switch (m.action) {
            case "moveUp":
              if (idx > 0) moveSection(m.id, idx - 1);
              break;
            case "moveDown":
              if (idx < page.sections.length - 1) moveSection(m.id, idx + 1);
              break;
            case "duplicate":
              duplicateSection(m.id);
              break;
            case "delete":
              removeSection(m.id);
              break;
            case "addBelow":
              window.dispatchEvent(new CustomEvent("atb-add-section", { detail: { afterIndex: idx } }));
              break;
          }
          break;
        }
        case "shortcut":
          if (m.key === "s") void saveNow();
          else if (m.key === "y" || (m.key === "z" && m.shift)) redo();
          else if (m.key === "z") undo();
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      unsub();
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const deviceW = DEVICE_WIDTH[viewport];
  const scale = Math.min(1, Math.max(0.2, (box.w - 32) / deviceW));
  const frameH = Math.max(400, (box.h - 32) / scale);

  return (
    <div class="atb-canvas" ref={boxRef}>
      <div
        class={`atb-device atb-device-${viewport}`}
        style={{ width: `${deviceW * scale}px`, height: `${frameH * scale}px` }}
      >
        {frame.html && (
          <iframe
            key={frame.n}
            ref={frameRef}
            title="Website preview — click a section to select it, click text to edit it"
            sandbox="allow-scripts"
            srcdoc={frame.html}
            style={{
              width: `${deviceW}px`,
              height: `${frameH}px`,
              transform: `scale(${scale})`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function pageContentChanged(
  prev: ReturnType<typeof getState>,
  next: ReturnType<typeof getState>,
): boolean {
  // Navigation and cross-page anchors depend on other pages too, so any
  // page-list change counts; otherwise compare this page's object identity.
  if (
    prev.doc.pages.length !== next.doc.pages.length ||
    prev.doc.name !== next.doc.name ||
    prev.doc.assets !== next.doc.assets
  )
    return true;
  if (
    prev.doc.pages.some(
      (p, i) =>
        p.title !== next.doc.pages[i]?.title ||
        p.slug !== next.doc.pages[i]?.slug,
    )
  )
    return true;
  return (
    currentPage(prev) !== currentPage(next) || prev.doc.pages !== next.doc.pages
  );
}
