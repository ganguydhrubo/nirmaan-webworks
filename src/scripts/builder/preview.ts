/**
 * Builds the HTML loaded into the editor's preview iframe.
 *
 * The iframe is sandboxed with only "allow-scripts" (no allow-same-origin),
 * so the preview runs in an opaque origin: generated content can't read
 * atittle.com cookies/storage, call our APIs with the visitor's credentials,
 * navigate the top window, open popups or submit forms. A strict CSP inside
 * the document limits it further to the bridge script below plus images and
 * Google Fonts. Communication is postMessage only, and the parent checks the
 * message source.
 */
import { renderPageDocument, renderPageBody, renderCss, type RenderOptions } from "@/lib/builder/render";
import type { Page, SiteDoc } from "@/lib/builder/schema";

export const PREVIEW_CSP =
  "default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; form-action 'none'; base-uri 'none'";

export function editorRenderOptions(doc: SiteDoc): RenderOptions {
  return {
    mode: "editor",
    pageHref: (slug) => `#page:${slug}`,
    assetUrl: (id) => doc.assets[id]?.dataUrl ?? "",
  };
}

/**
 * Runs inside the iframe. Must be self-contained (it is stringified), and
 * written as plain modern JS that every evergreen browser runs as-is.
 */
function bridge(interactive: boolean) {
  let selected: string | null = null;
  const timers: Record<string, number> = {};
  const supportsPlaintext = (function () {
    const d = document.createElement("div");
    d.setAttribute("contenteditable", "plaintext-only");
    return d.contentEditable === "plaintext-only";
  })();
  function post(msg: Record<string, unknown>) {
    msg.__atb = 1;
    parent.postMessage(msg, "*");
  }
  function sectionEl(id: string | null): HTMLElement | null {
    if (!id) return null;
    return document.querySelector('[data-section="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  }
  function mark(id: string | null) {
    const prev = document.querySelectorAll(".atb-sel");
    for (let i = 0; i < prev.length; i++) prev[i]!.classList.remove("atb-sel");
    const el = sectionEl(id);
    if (el) el.classList.add("atb-sel");
    selected = id;
  }
  function enable() {
    if (!interactive) return;
    const els = document.querySelectorAll("[data-edit]");
    for (let i = 0; i < els.length; i++) {
      els[i]!.setAttribute("contenteditable", supportsPlaintext ? "plaintext-only" : "true");
      els[i]!.setAttribute("spellcheck", "true");
      els[i]!.setAttribute("role", "textbox");
      els[i]!.setAttribute("aria-label", "Edit text");
    }
  }
  function flush(el: HTMLElement) {
    const key = el.getAttribute("data-edit");
    if (!key) return;
    clearTimeout(timers[key]);
    delete timers[key];
    post({ type: "text", key: key, value: el.innerText.replace(/\u00a0/g, " ") });
  }
  document.addEventListener(
    "click",
    function (e) {
      const t = e.target as HTMLElement;
      if (!t || !t.closest) return;
      const link = t.closest("a, button, summary, form");
      if (link) e.preventDefault();
      const a = t.closest("a");
      if (a && (!interactive || !t.closest("[data-edit]"))) {
        const href = a.getAttribute("href") || "";
        if (href.indexOf("#page:") === 0) post({ type: "navigate", slug: href.slice(6).split("#")[0], anchor: href.split("#")[2] || "" });
        else if (href.charAt(0) === "#" && href.length > 1) {
          const target = document.getElementById(href.slice(1));
          if (target) target.scrollIntoView({ behavior: "smooth" });
        } else if (!interactive && /^https?:/.test(href)) post({ type: "external", href: href });
      }
      if (!interactive) return;
      const sec = t.closest("[data-section]");
      const img = t.closest("[data-img]");
      if (sec) {
        mark(sec.getAttribute("data-section"));
        post({ type: "select", id: sec.getAttribute("data-section"), image: img ? img.getAttribute("data-img") : null });
      }
    },
    true,
  );
  document.addEventListener("submit", function (e) {
    e.preventDefault();
  });
  if (interactive) {
    document.addEventListener("input", function (e) {
      const t = e.target as HTMLElement;
      const el = t && t.closest ? (t.closest("[data-edit]") as HTMLElement | null) : null;
      if (!el) return;
      const key = el.getAttribute("data-edit")!;
      clearTimeout(timers[key]);
      timers[key] = window.setTimeout(function () {
        flush(el!);
      }, 300);
    });
    document.addEventListener("focusout", function (e) {
      const t = e.target as HTMLElement;
      if (t && t.hasAttribute && t.hasAttribute("data-edit")) flush(t);
    });
    document.addEventListener("keydown", function (e) {
      const t = e.target as HTMLElement;
      if (!t || !t.hasAttribute || !t.hasAttribute("data-edit")) {
        if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "y" || e.key === "s")) {
          e.preventDefault();
          post({ type: "shortcut", key: e.key, shift: e.shiftKey });
        }
        return;
      }
      if (e.key === "Escape" || (e.key === "Enter" && !t.hasAttribute("data-multiline"))) {
        e.preventDefault();
        t.blur();
      }
      if (e.key === "Enter" && t.hasAttribute("data-multiline") && !supportsPlaintext) {
        e.preventDefault();
        document.execCommand("insertText", false, "\n");
      }
    });
    document.addEventListener("paste", function (e) {
      const t = e.target as HTMLElement;
      if (supportsPlaintext || !t || !t.closest || !t.closest("[data-edit]")) return;
      e.preventDefault();
      const text = (e.clipboardData && e.clipboardData.getData("text/plain")) || "";
      document.execCommand("insertText", false, text);
    });
  }
  window.addEventListener("message", function (e) {
    if (e.source !== parent) return;
    const m = e.data || {};
    if (!m.__atb) return;
    if (m.type === "body") {
      const y = window.scrollY;
      document.body.innerHTML = m.html;
      enable();
      mark(m.selected === undefined ? selected : m.selected);
      window.scrollTo(0, y);
    } else if (m.type === "css") {
      const style = document.getElementById("site-css");
      if (style) style.textContent = m.css;
    } else if (m.type === "select") {
      mark(m.id);
      if (m.scroll) {
        const el = sectionEl(m.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (m.type === "scrollTo") {
      const target = m.anchor ? document.getElementById(m.anchor) : null;
      if (target) target.scrollIntoView({ block: "start" });
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enable);
  else enable();
  post({ type: "ready" });
}

const EDITOR_CSS = `
[data-section]{cursor:pointer;outline-offset:-2px;transition:outline-color .1s}
[data-section]:hover{outline:2px dashed rgba(193,82,46,.55)}
[data-section].atb-sel{outline:3px solid #c1522e!important;outline-offset:-3px}
[data-edit]{cursor:text;border-radius:3px}
[data-edit]:hover{box-shadow:0 0 0 2px rgba(193,82,46,.25)}
[data-edit]:focus{outline:2px solid #c1522e;outline-offset:3px;box-shadow:none}
.ph[data-img]{cursor:pointer}
img[data-img]{cursor:pointer}
.empty-page{padding:96px 20px;text-align:center;color:#8a8076;font:500 1rem system-ui,sans-serif}
`;

/** Full preview document for one page. `interactive` = editing canvas; false = clean "Preview" mode. */
export function previewDocument(doc: SiteDoc, page: Page, interactive: boolean): string {
  const opts = editorRenderOptions(doc);
  return renderPageDocument(doc, page, {
    ...opts,
    mode: interactive ? "editor" : "export",
    headExtra: `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}" />
${interactive ? `<style>${EDITOR_CSS}</style>` : ""}
<script>(${bridge.toString()})(${interactive ? "true" : "false"});</script>`,
  });
}

export function previewBody(doc: SiteDoc, page: Page): string {
  return renderPageBody(doc, page, editorRenderOptions(doc));
}

export function previewCss(doc: SiteDoc): string {
  return renderCss(doc.theme);
}
