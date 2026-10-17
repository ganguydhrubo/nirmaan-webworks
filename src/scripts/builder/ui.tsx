import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

const PATHS: Record<string, string> = {
  undo: "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  redo: "m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
  desktop: "M3 5h18v11H3zM8 20h8M12 16v4",
  tablet: "M6 3h12v18H6zM11 18h2",
  mobile: "M8 2.5h8v19H8zM11 18.5h2",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M8 8h12v12H8zM4 16V4h12",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  sparkles: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  close: "M6 6l12 12M18 6 6 18",
  back: "M15 18l-6-6 6-6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  alert: "M12 8v5M12 16.5h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  image: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01",
  page: "M6 3h8l4 4v14H6zM14 3v4h4",
  palette: "M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.4-1-1.6-1-3 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM7.5 11.5h.01M10.5 7.5h.01M15 7.5h.01",
  layers: "m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z",
  refresh: "M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4",
};

export function Icon({ name, size = 18, label }: { name: string; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden={label ? undefined : "true"} role={label ? "img" : undefined} aria-label={label}>
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ComponentChildren; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button:not(.atb-modal-x)")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, [tabindex='0']")].filter((el) => !el.hasAttribute("disabled"));
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);
  return (
    <div class="atb-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class={`atb-modal${wide ? " atb-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="atb-modal-title" ref={ref}>
        <div class="atb-modal-head">
          <h2 id="atb-modal-title">{title}</h2>
          <button type="button" class="atb-icon-btn atb-modal-x" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div class="atb-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

export interface ToastMsg {
  id: number;
  text: string;
  tone: "info" | "success" | "error";
  action?: { label: string; run: () => void };
}

let toastListener: ((t: ToastMsg[]) => void) | null = null;
let toasts: ToastMsg[] = [];
let toastSeq = 0;

export function toast(text: string, tone: ToastMsg["tone"] = "info", action?: ToastMsg["action"], ms = 6000): void {
  const t: ToastMsg = { id: ++toastSeq, text, tone, action };
  toasts = [...toasts, t].slice(-4);
  toastListener?.(toasts);
  window.setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListener?.(toasts);
  }, ms);
}

export function Toasts() {
  const [items, setItems] = useState<ToastMsg[]>(toasts);
  useEffect(() => {
    toastListener = setItems;
    return () => {
      toastListener = null;
    };
  }, []);
  return (
    <div class="atb-toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} class={`atb-toast atb-toast-${t.tone}`}>
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              class="atb-link-btn"
              onClick={() => {
                t.action!.run();
                toasts = toasts.filter((x) => x.id !== t.id);
                setItems(toasts);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function confirmDialog(message: string): boolean {
  return window.confirm(message);
}
