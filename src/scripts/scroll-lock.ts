/**
 * Shared, ref-counted background-scroll lock for full-screen/panel
 * overlays (hamburger nav, dock sections sheet, demo theatre).
 *
 * Why not just `body { overflow: hidden }`: that alone does not
 * reliably stop touch/rubber-band scrolling on iOS Safari, which is
 * why the more involved `position: fixed` + saved-offset technique is
 * used instead. Why lock <html> too: in standards mode the *root*
 * scrolling element is <html>, not <body> — locking only the body
 * still leaves wheel/keyboard scrolling free to move the document.
 *
 * Ref-counted so that if two overlays ever end up open at once, the
 * background only unlocks once the last one closes.
 */
let lockCount = 0;
let savedScrollY = 0;
let primed = false;

/**
 * Call this on `pointerdown` (not `click`) for any trigger button that
 * lives in a `position: sticky` container. On mousedown, the browser
 * focuses the clicked element *before* the click event (and therefore
 * before lockBodyScroll() would normally run) — and for a sticky-
 * positioned element, that native focus can trigger its own
 * scroll-into-view, silently resetting window.scrollY to 0 first. A
 * `position: fixed` trigger doesn't have this problem (it's
 * unambiguously always "in view"), only sticky ones. Priming captures
 * the real pre-interaction scroll position before that can happen.
 */
export function primeScrollLock(): void {
  if (lockCount === 0 && !primed) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    primed = true;
  }
}

export function lockBodyScroll(): void {
  if (lockCount === 0) {
    if (!primed) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
    }
    primed = false;
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";
  }
  lockCount++;
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.overflow = "";
    // Restoring `position: fixed` -> normal flow changes the document's
    // scrollable height; scrolling in the very same tick can read stale
    // (pre-reflow) layout and clamp to the wrong position. Force a
    // synchronous reflow (reading offsetHeight) before scrolling so the
    // browser has current layout to scroll against.
    void html.offsetHeight;
    window.scrollTo(0, savedScrollY);
  }
}
