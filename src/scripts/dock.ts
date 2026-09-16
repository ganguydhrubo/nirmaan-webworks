/**
 * dock.ts — macOS / iOS 26 Liquid Glass floating dock navigation controller.
 * Handles magnification physics, adaptive light/dark theming, section sheet dialog,
 * scroll-spy tracking, and accessible focus management.
 */

function initDock(): void {
  const dock = document.getElementById("floating-dock");
  if (!dock) return;

  const items = Array.from(dock.querySelectorAll<HTMLElement>(".dock-item"));
  const sectionsBtn = dock.querySelector<HTMLButtonElement>('[data-dock-action="sections"]');
  const homeBtn = dock.querySelector<HTMLAnchorElement>('[data-dock-action="home"]');
  const sheet = document.getElementById("dock-sheet");
  const sheetList = document.getElementById("dock-sheet-list");
  const sheetCloseBtns = Array.from(document.querySelectorAll<HTMLElement>("[data-dock-sheet-close]"));

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --------------------------------------------------------------------------
  // 1. Magnification Physics (Pointer & Touch)
  // --------------------------------------------------------------------------
  const MAX_SCALE = 1.35;
  const MAX_DIST = 80;

  if (!prefersReducedMotion) {
    // Desktop Pointer Magnification
    dock.addEventListener("mousemove", (e: MouseEvent) => {
      const pointerX = e.clientX;
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const dist = Math.abs(pointerX - itemCenter);

        if (dist < MAX_DIST) {
          const scale = 1 + (MAX_SCALE - 1) * Math.max(0, 1 - (dist / MAX_DIST) ** 2);
          item.style.setProperty("--dock-scale", scale.toFixed(3));
        } else {
          item.style.setProperty("--dock-scale", "1");
        }
      });
    });

    dock.addEventListener("mouseleave", () => {
      items.forEach((item) => item.style.setProperty("--dock-scale", "1"));
    });

    // Touch Magnification & Tooltip pop
    dock.addEventListener(
      "touchmove",
      (e: TouchEvent) => {
        const touch = e.touches[0];
        if (!touch) return;

        let closestItem: HTMLElement | null = null;
        let minDist = 48;

        items.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const itemCenter = rect.left + rect.width / 2;
          const dist = Math.abs(touch.clientX - itemCenter);
          if (dist < minDist) {
            minDist = dist;
            closestItem = item;
          }
        });

        items.forEach((item) => {
          if (item === closestItem) {
            item.classList.add("is-touching");
            item.style.setProperty("--dock-scale", "1.25");
          } else {
            item.classList.remove("is-touching");
            item.style.setProperty("--dock-scale", "1");
          }
        });
      },
      { passive: true }
    );

    const resetTouch = () => {
      items.forEach((item) => {
        item.classList.remove("is-touching");
        item.style.setProperty("--dock-scale", "1");
      });
    };

    dock.addEventListener("touchend", resetTouch, { passive: true });
    dock.addEventListener("touchcancel", resetTouch, { passive: true });
  }

  // --------------------------------------------------------------------------
  // 2. Discover Sections & Populate Section Sheet
  // --------------------------------------------------------------------------
  interface SectionMeta {
    id: string;
    title: string;
    desc: string;
    el: HTMLElement;
  }

  const sections: SectionMeta[] = [];
  const rawSections = Array.from(
    document.querySelectorAll<HTMLElement>("main > section[id], main section[data-dock-section], section[id]")
  ).filter((el) => {
    const id = el.id;
    return Boolean(id) && id !== "main-content" && el.offsetHeight > 40;
  });

  rawSections.forEach((el, index) => {
    const id = el.id;
    const explicitTitle = el.dataset.dockTitle;
    const heading = el.querySelector("h2, h3")?.textContent?.replace(/\s+/g, " ").trim();
    const title = explicitTitle || heading || `Section 0${index + 1}`;

    const explicitDesc = el.dataset.dockDesc;
    const lead = el.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 75);
    const desc = explicitDesc || (lead ? `${lead}...` : "Explore details");

    sections.push({ id, title, desc, el });
  });

  function renderSectionList(activeId?: string) {
    if (!sheetList) return;
    if (sections.length === 0) {
      sheetList.innerHTML = `<div class="py-6 text-center text-xs text-ink-500">No jump sections available on this page.</div>`;
      return;
    }

    sheetList.innerHTML = sections
      .map((s, idx) => {
        const isActive = s.id === activeId;
        return `
        <a
          href="#${s.id}"
          data-section-target="${s.id}"
          class="flex items-center justify-between rounded-xl border p-3 text-left transition ${
            isActive
              ? "border-brand-500 bg-brand-50/70 text-ink-950 font-semibold"
              : "border-ink-200 bg-cream/40 text-ink-800 hover:border-brand-400 hover:bg-cream"
          }"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
              isActive ? "bg-brand-600 text-cream" : "bg-ink-100 text-ink-600"
            }">
              0${idx + 1}
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-xs sm:text-sm font-semibold truncate ${isActive ? "text-brand-700" : "text-ink-950"}">
                ${s.title}
              </div>
              <div class="text-[11px] text-ink-500 truncate mt-0.5">
                ${s.desc}
              </div>
            </div>
          </div>
          <span class="text-xs font-bold ${isActive ? "text-brand-600" : "text-ink-400"} ml-2 shrink-0">
            ${isActive ? "Current" : "Jump →"}
          </span>
        </a>
      `;
      })
      .join("");

    sheetList.querySelectorAll<HTMLAnchorElement>("[data-section-target]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("data-section-target");
        if (!targetId) return;
        const targetEl = document.getElementById(targetId);
        closeSheet();
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          history.pushState(null, "", `#${targetId}`);
        }
      });
    });
  }

  // Initial render of section sheet list
  renderSectionList();

  // --------------------------------------------------------------------------
  // 3. Section Sheet Modal State & Accessibility
  // --------------------------------------------------------------------------
  let lastFocusedEl: HTMLElement | null = null;

  function openSheet(): void {
    if (!sheet) return;
    lastFocusedEl = document.activeElement as HTMLElement;
    sheet.hidden = false;
    sectionsBtn?.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", onSheetKeydown);

    // Focus first actionable element inside sheet
    const firstAction = sheet.querySelector<HTMLElement>("button, a[href]");
    firstAction?.focus();
  }

  function closeSheet(): void {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    sectionsBtn?.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onSheetKeydown);
    lastFocusedEl?.focus();
  }

  function onSheetKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      closeSheet();
      return;
    }
    if (e.key !== "Tab" || !sheet) return;

    const focusables = Array.from(
      sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    ).filter((el) => el.offsetParent !== null);

    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  sectionsBtn?.addEventListener("click", () => {
    const isHidden = sheet?.hidden ?? true;
    if (isHidden) {
      openSheet();
    } else {
      closeSheet();
    }
  });

  sheetCloseBtns.forEach((btn) => btn.addEventListener("click", closeSheet));

  // --------------------------------------------------------------------------
  // 4. Scroll-Spy & Adaptive Liquid Glass Theming
  // --------------------------------------------------------------------------
  let currentActiveSectionId = "";

  const themeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const target = entry.target as HTMLElement;
        currentActiveSectionId = target.id;

        // Theme check: Is this section dark?
        const isDark =
          target.dataset.theme === "dark" ||
          target.classList.contains("bg-ink-950") ||
          target.classList.contains("bg-ink-900") ||
          target.classList.contains("bg-brand-950") ||
          window.getComputedStyle(target).backgroundColor === "rgb(22, 17, 13)" ||
          window.getComputedStyle(target).backgroundColor === "rgb(33, 26, 21)";

        dock.setAttribute("data-dock-theme", isDark ? "dark" : "light");
        renderSectionList(currentActiveSectionId);
      });
    },
    {
      rootMargin: "-65% 0px -25% 0px",
      threshold: 0,
    }
  );

  rawSections.forEach((s) => themeObserver.observe(s));

  // Active home dot check & scroll auto-hide behavior
  let lastScrollY = window.scrollY;
  let scrollDelta = 0;
  const SCROLL_THRESHOLD = 10;

  const onScroll = () => {
    const currentScrollY = window.scrollY;
    const diff = currentScrollY - lastScrollY;

    if (currentScrollY < 250) {
      homeBtn?.classList.add("is-active");
      sectionsBtn?.classList.remove("is-active");
    } else {
      homeBtn?.classList.remove("is-active");
      sectionsBtn?.classList.add("is-active");
    }

    // Dock auto-hide on scroll down / show on scroll up
    const isSheetOpen = sheet && !sheet.hidden;
    if (isSheetOpen || currentScrollY < 100) {
      dock.classList.remove("is-hidden");
      scrollDelta = 0;
    } else {
      if ((diff > 0 && scrollDelta < 0) || (diff < 0 && scrollDelta > 0)) {
        scrollDelta = 0;
      }
      scrollDelta += diff;

      // Scrolling down -> hide dock to give unobstructed view of content
      if (scrollDelta > SCROLL_THRESHOLD && currentScrollY > 150) {
        dock.classList.add("is-hidden");
      }
      // Scrolling up -> reveal dock smoothly for quick navigation
      else if (scrollDelta < -SCROLL_THRESHOLD) {
        dock.classList.remove("is-hidden");
      }
    }

    lastScrollY = currentScrollY;
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // --------------------------------------------------------------------------
  // 5. First-Visit Dock Floating Labels & Long-Press
  // --------------------------------------------------------------------------
  const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSaveData = Boolean((navigator as any).connection?.saveData);

  // Long press on touch (400ms)
  items.forEach((item) => {
    let longPressTimer: number | null = null;

    item.addEventListener(
      "touchstart",
      () => {
        longPressTimer = window.setTimeout(() => {
          item.classList.add("is-label-visible");
        }, 400);
      },
      { passive: true }
    );

    const clearLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      item.classList.remove("is-label-visible");
    };

    item.addEventListener("touchend", clearLongPress, { passive: true });
    item.addEventListener("touchcancel", clearLongPress, { passive: true });
    item.addEventListener("touchmove", clearLongPress, { passive: true });
  });

  // First-visit ever floating labels (1400-3000ms)
  try {
    const hasSeenDockLabels = localStorage.getItem("atittle-dock-labels-seen");
    if (!hasSeenDockLabels && !isReducedMotion && !isSaveData) {
      setTimeout(() => {
        items.forEach((item) => item.classList.add("is-label-visible"));
        setTimeout(() => {
          items.forEach((item) => item.classList.remove("is-label-visible"));
          try {
            localStorage.setItem("atittle-dock-labels-seen", "1");
          } catch (_) {}
        }, 1600);
      }, 1400);
    }
  } catch (_) {}

  // --------------------------------------------------------------------------
  // 6. Idle Scroll Hint (3.5s after settle ~5.6s post load)
  // --------------------------------------------------------------------------
  try {
    const hasSeenScrollHint = sessionStorage.getItem("atittle-scroll-hint-seen");
    if (!hasSeenScrollHint && !isReducedMotion) {
      let hintTimer: number | null = window.setTimeout(() => {
        const nextEyebrow = document.querySelector<HTMLElement>(
          ".showcase-topline, #home-showcase .showcase-topline, .category-bar"
        );
        if (nextEyebrow && window.scrollY < 80) {
          nextEyebrow.animate(
            [
              { transform: "translateY(0)" },
              { transform: "translateY(-6px)" },
              { transform: "translateY(0)" },
              { transform: "translateY(-6px)" },
              { transform: "translateY(0)" },
            ],
            { duration: 1000, easing: "ease-in-out" }
          );
          sessionStorage.setItem("atittle-scroll-hint-seen", "1");
        }
      }, 5600);

      const cancelHint = () => {
        if (hintTimer) {
          clearTimeout(hintTimer);
          hintTimer = null;
        }
      };

      window.addEventListener("scroll", cancelHint, { passive: true, once: true });
      window.addEventListener("touchstart", cancelHint, { passive: true, once: true });
    }
  } catch (_) {}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDock);
} else {
  initDock();
}
