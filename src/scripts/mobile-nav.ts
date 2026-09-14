const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
const panel = document.querySelector<HTMLElement>("[data-nav-panel]");
const closeBtn = document.querySelector<HTMLButtonElement>("[data-nav-close]");
const scrim = document.querySelector<HTMLElement>("[data-nav-scrim]");

if (toggle && panel) {
  let lastFocused: HTMLElement | null = null;
  let scrollY = 0;

  const focusables = () =>
    Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((el) => el.offsetParent !== null);

  function open() {
    lastFocused = document.activeElement as HTMLElement;
    scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    panel!.hidden = false;
    if (scrim) scrim.hidden = false;
    toggle!.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", onKeydown);
    const first = focusables()[0];
    first?.focus();
  }

  function close() {
    panel!.hidden = true;
    if (scrim) scrim.hidden = true;
    toggle!.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKeydown);

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);

    lastFocused?.focus();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = focusables();
    if (items.length === 0) return;
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

  toggle.addEventListener("click", () => (panel.hidden ? open() : close()));
  closeBtn?.addEventListener("click", close);
  scrim?.addEventListener("click", close);

  // Close on route change (View Transitions) so a stale open menu never persists.
  document.addEventListener("astro:before-preparation", () => {
    if (!panel.hidden) close();
  });
}
