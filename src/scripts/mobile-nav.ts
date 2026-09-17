const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
const panel = document.querySelector<HTMLElement>("[data-nav-panel]");
const closeBtn = document.querySelector<HTMLButtonElement>("[data-nav-close]");
const scrim = document.querySelector<HTMLElement>("[data-nav-scrim]");

if (toggle && panel) {
  let lastFocused: HTMLElement | null = null;
  let scrollY = 0;
  let typingTimers: number[] = [];
  let closeTimeout: number | null = null;

  const focusables = () =>
    Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((el) => el.offsetParent !== null);

  const getNavLinks = () => Array.from(panel.querySelectorAll<HTMLElement>(".mobile-nav-link"));
  const getTypedContainers = () => Array.from(panel.querySelectorAll<HTMLElement>(".mobile-nav-typed"));

  function clearTyping() {
    typingTimers.forEach((t) => clearTimeout(t));
    typingTimers = [];
  }

  function resetToStableState() {
    clearTyping();
    getNavLinks().forEach((link) => link.classList.add("is-visible"));
    getTypedContainers().forEach((container) => {
      const fullText = container.dataset.navLabel || "";
      const textEl = container.querySelector<HTMLElement>(".typed-text");
      const cursor = container.querySelector<HTMLElement>(".typed-cursor");
      const dot = container.querySelector<HTMLElement>(".nav-pulse-dot");
      const badge = container.closest(".mobile-nav-link")?.querySelector<HTMLElement>(".nav-badge-new");

      if (textEl) textEl.textContent = fullText;
      if (cursor) cursor.classList.add("is-done");
      if (dot) dot.classList.add("is-visible");
      if (badge) badge.classList.add("is-visible");
      container.classList.add("is-stable");
    });
  }

  function startTypingSequence() {
    clearTyping();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      resetToStableState();
      return;
    }

    const typedContainers = getTypedContainers();

    // 1. Initial blanking and prep
    typedContainers.forEach((container) => {
      const link = container.closest<HTMLElement>(".mobile-nav-link");
      const textEl = container.querySelector<HTMLElement>(".typed-text");
      const cursor = container.querySelector<HTMLElement>(".typed-cursor");
      const dot = container.querySelector<HTMLElement>(".nav-pulse-dot");
      const badge = link?.querySelector<HTMLElement>(".nav-badge-new");

      if (link) link.classList.remove("is-visible");
      if (textEl) textEl.textContent = "";
      if (cursor) cursor.classList.remove("is-done");
      if (dot) dot.classList.remove("is-visible");
      if (badge) badge.classList.remove("is-visible");
      container.classList.remove("is-stable");
    });

    // 2. Cascading staggered typing
    typedContainers.forEach((container, index) => {
      const link = container.closest<HTMLElement>(".mobile-nav-link");
      const textEl = container.querySelector<HTMLElement>(".typed-text");
      const cursor = container.querySelector<HTMLElement>(".typed-cursor");
      const dot = container.querySelector<HTMLElement>(".nav-pulse-dot");
      const badge = link?.querySelector<HTMLElement>(".nav-badge-new");
      const label = container.dataset.navLabel || "";

      // Reveal link row with staggered glide
      const rowDelay = 90 + index * 60;
      const rowTimer = window.setTimeout(() => {
        if (link) link.classList.add("is-visible");

        // Type each character smoothly
        let charIndex = 0;
        const charInterval = 22; // 22ms per character for liquid smooth typing

        function typeNext() {
          if (charIndex < label.length) {
            charIndex++;
            if (textEl) textEl.textContent = label.slice(0, charIndex);
            const nextTimer = window.setTimeout(typeNext, charInterval);
            typingTimers.push(nextTimer);
          } else {
            // Typing finished for this item -> settle into stable state!
            if (cursor) cursor.classList.add("is-done");
            container.classList.add("is-stable");
            if (dot) dot.classList.add("is-visible");
            if (badge) badge.classList.add("is-visible");
          }
        }

        typeNext();
      }, rowDelay);

      typingTimers.push(rowTimer);
    });
  }

  function open() {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }

    lastFocused = document.activeElement as HTMLElement;
    scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    panel!.hidden = false;
    if (scrim) scrim.hidden = false;
    toggle!.setAttribute("aria-expanded", "true");

    requestAnimationFrame(() => {
      panel!.classList.add("is-open");
      if (scrim) scrim.classList.add("is-open");
    });

    startTypingSequence();

    document.addEventListener("keydown", onKeydown);
    const first = focusables()[0];
    first?.focus();
  }

  function close() {
    clearTyping();
    resetToStableState();

    panel!.classList.remove("is-open");
    if (scrim) scrim.classList.remove("is-open");
    toggle!.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKeydown);

    closeTimeout = window.setTimeout(() => {
      panel!.hidden = true;
      if (scrim) scrim.hidden = true;
      closeTimeout = null;
    }, 280);

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

  // Re-sync nav labels if language changes while panel is open
  window.addEventListener("atittle:langchange", () => {
    if (!panel.hidden) resetToStableState();
  });
}
