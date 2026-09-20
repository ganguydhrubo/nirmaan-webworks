/**
 * kinetic-motion.ts — ATITTLE Kinetic Motion & Audio Engine
 *
 * Implements high-fidelity studio animations inspired by modern cinematic web experiences:
 * 1. 3D Perspective Tilt with cursor-relative spring physics
 * 2. Spotlight gradient border & sheen tracking
 * 3. Magnetic cursor pull for primary CTAs
 * 4. Zero-byte procedural Web Audio micro-interactions (opt-in)
 * 5. Cinematic Demo Theatre event bus
 *
 * Designed with zero layout shifts (CLS = 0) and graceful mobile degradation.
 */

// Web Audio Synthesizer for UI micro-interactions
class SoundFXEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  constructor() {
    // Check saved preference (default disabled until user activates)
    try {
      this.enabled = localStorage.getItem("atittle-sound-fx") === "true";
    } catch (_) {
      this.enabled = false;
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isSoundEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("atittle-sound-fx", String(this.enabled));
    } catch (_) {}
    if (this.enabled) {
      this.initCtx();
      this.playChime();
    }
    window.dispatchEvent(new CustomEvent("atittle:sound-toggled", { detail: { enabled: this.enabled } }));
    return this.enabled;
  }

  /**
   * Crisp, subtle tactile click (40ms micro-pop)
   */
  public playClick(freq = 900) {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_) {}
  }

  /**
   * Smooth aerodynamic whoosh for transitions
   */
  public playSwoosh() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.16);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch (_) {}
  }

  /**
   * Gentle camera-shutter tick — sharp click + soft mechanical release,
   * for demo card selection (distinct from the generic UI playClick).
   */
  public playShutter() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = "square";
      click.frequency.setValueAtTime(1800, now);
      click.frequency.exponentialRampToValueAtTime(600, now + 0.02);
      clickGain.gain.setValueAtTime(0.025, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(now);
      click.stop(now + 0.03);

      const release = ctx.createOscillator();
      const releaseGain = ctx.createGain();
      const releaseStart = now + 0.07;
      release.type = "sine";
      release.frequency.setValueAtTime(220, releaseStart);
      release.frequency.exponentialRampToValueAtTime(140, releaseStart + 0.05);
      releaseGain.gain.setValueAtTime(0.018, releaseStart);
      releaseGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + 0.06);
      release.connect(releaseGain);
      releaseGain.connect(ctx.destination);
      release.start(releaseStart);
      release.stop(releaseStart + 0.07);
    } catch (_) {}
  }

  /**
   * Elegant dual-tone harmonic shimmer when opening the theatre
   */
  public playChime() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.035;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.028, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch (_) {}
  }
}

export const soundEngine = new SoundFXEngine();

// Declare globally for inline click handlers & components
declare global {
  interface Window {
    atittleAudio: SoundFXEngine;
  }
}
if (typeof window !== "undefined") {
  window.atittleAudio = soundEngine;
}

/**
 * 3D Perspective Tilt Engine
 */
function init3DTilt() {
  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isReduced || isTouch) return;

  const tiltCards = document.querySelectorAll<HTMLElement>("[data-kinetic-tilt]");
  if (tiltCards.length === 0) return;

  tiltCards.forEach((card) => {
    let bounds = card.getBoundingClientRect();
    let isHovered = false;

    const onMouseEnter = () => {
      bounds = card.getBoundingClientRect();
      isHovered = true;
      card.style.transition = "transform 150ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 250ms ease";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isHovered) return;
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;

      // Normalised coordinates (-1 to 1)
      const normX = (x - centerX) / centerX;
      const normY = (y - centerY) / centerY;

      const maxTilt = Number(card.dataset.tiltMax ?? 8);
      const rotateX = (-normY * maxTilt).toFixed(2);
      const rotateY = (normX * maxTilt).toFixed(2);

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;
    };

    const onMouseLeave = () => {
      isHovered = false;
      card.style.transition = "transform 400ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms ease";
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    };

    card.addEventListener("mouseenter", onMouseEnter, { passive: true });
    card.addEventListener("mousemove", onMouseMove, { passive: true });
    card.addEventListener("mouseleave", onMouseLeave, { passive: true });
  });
}

/**
 * Spotlight Dynamic Border & Radial Sheen Tracking
 */
function initSpotlightGlow() {
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isTouch) return;

  const glowElements = document.querySelectorAll<HTMLElement>("[data-kinetic-glow]");
  glowElements.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    }, { passive: true });
  });
}

/**
 * Magnetic Button Attraction Physics
 */
function initMagneticButtons() {
  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isReduced || isTouch) return;

  const magneticBtns = document.querySelectorAll<HTMLElement>("[data-magnetic]");
  magneticBtns.forEach((btn) => {
    const strength = Number(btn.dataset.magneticStrength ?? 0.28);

    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      btn.style.transform = `translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px, 0)`;
    }, { passive: true });

    btn.addEventListener("mouseleave", () => {
      btn.style.transition = "transform 350ms cubic-bezier(0.16, 1, 0.3, 1)";
      btn.style.transform = "translate3d(0, 0, 0)";
      setTimeout(() => {
        btn.style.transition = "";
      }, 350);
    }, { passive: true });
  });
}

/**
 * Volumetric Ambient Spotlight — cursor-following warm glow for dark
 * sections. Uses requestAnimationFrame + lerp for buttery smoothing and
 * pure translate3d (compositor-only) for zero layout cost. Skipped
 * entirely on touch devices and prefers-reduced-motion, leaving each
 * element's CSS default (a static, centered glow) as the fallback —
 * so there is no battery-draining tracking loop on mobile.
 */
function initAmbientSpotlight() {
  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isReduced || isTouch) return;

  const spots = document.querySelectorAll<HTMLElement>("[data-ambient-follow]");
  if (spots.length === 0) return;

  spots.forEach((spot) => {
    const container = spot.closest<HTMLElement>("[data-ambient-spotlight]") ?? (spot.parentElement as HTMLElement);
    if (!container) return;

    const half = (spot.offsetWidth || 600) / 2;
    let targetX = container.clientWidth * 0.45;
    let targetY = container.clientHeight * 0.45;
    let curX = targetX;
    let curY = targetY;
    let raf = 0;
    let running = false;

    const tick = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      spot.style.transform = `translate3d(${(curX - half).toFixed(1)}px, ${(curY - half).toFixed(1)}px, 0)`;

      if (Math.abs(targetX - curX) > 0.3 || Math.abs(targetY - curY) > 0.3) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    container.addEventListener(
      "mousemove",
      (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
        if (!running) {
          running = true;
          spot.classList.add("is-tracking");
          tick();
        }
      },
      { passive: true }
    );
  });
}

/**
 * Cursor-Follower Ring — a small ring that trails the real cursor with
 * RAF + lerp smoothing (same technique as initAmbientSpotlight, at a
 * tighter radius), and scales up slightly over interactive elements.
 * The native cursor is never hidden — this is a companion accent, not
 * a replacement, so it never risks the usability regressions a full
 * custom-cursor swap can cause. Desktop pointer devices only.
 */
function initCursorFollower() {
  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isReduced || isTouch) return;

  const ring = document.createElement("div");
  ring.className = "cursor-follower";
  ring.setAttribute("aria-hidden", "true");
  ring.innerHTML = '<span class="cursor-follower-ring"></span>';
  document.body.appendChild(ring);

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let curX = targetX;
  let curY = targetY;
  let visible = false;
  let running = false;
  let raf = 0;

  const tick = () => {
    curX += (targetX - curX) * 0.18;
    curY += (targetY - curY) * 0.18;
    ring.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0)`;

    if (Math.abs(targetX - curX) > 0.3 || Math.abs(targetY - curY) > 0.3) {
      raf = requestAnimationFrame(tick);
    } else {
      running = false;
      cancelAnimationFrame(raf);
    }
  };

  window.addEventListener(
    "mousemove",
    (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        visible = true;
        ring.classList.add("is-active");
      }
      if (!running) {
        running = true;
        tick();
      }
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest("a, button, [role='button'], input, select, textarea, summary");
      ring.classList.toggle("is-interactive", Boolean(interactive));
    },
    { passive: true }
  );

  document.addEventListener("mouseleave", () => {
    visible = false;
    ring.classList.remove("is-active");
  });
}

/**
 * Hover-driven inner-image parallax — the image inside a card shifts a
 * few px opposite the card's own movement as the cursor crosses it,
 * distinct from the whole-card 3D tilt: a second, independent motion
 * layer rather than one rigid rotation.
 */
function initImageParallax() {
  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isReduced || isTouch) return;

  document.querySelectorAll<HTMLElement>("[data-parallax-image]").forEach((card) => {
    const layer = card.querySelector<HTMLElement>("[data-parallax-layer]");
    if (!layer) return;
    const strength = Number(card.dataset.parallaxStrength ?? 10);

    card.addEventListener(
      "mousemove",
      (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        layer.style.transform = `translate3d(${(normX * strength).toFixed(1)}px, ${(normY * strength).toFixed(1)}px, 0) scale(1.03)`;
      },
      { passive: true }
    );

    card.addEventListener(
      "mouseleave",
      () => {
        layer.style.transition = "transform 450ms cubic-bezier(0.16, 1, 0.3, 1)";
        layer.style.transform = "translate3d(0, 0, 0) scale(1)";
        setTimeout(() => {
          layer.style.transition = "";
        }, 450);
      },
      { passive: true }
    );
  });
}

/**
 * Global Trigger Delegate for Cinematic Theatre and UI Audio
 */
function initGlobalTriggers() {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Gentle shutter tick on demo card selection
    const demoCard = target.closest<HTMLElement>("[data-demo-card]");
    if (demoCard && !demoCard.hasAttribute("data-no-sound")) {
      soundEngine.playShutter();
      return;
    }

    // Audio click for interactive tabs and buttons
    const interactive = target.closest<HTMLElement>("button, a.btn, [role='tab'], [data-picker], .segmented-btn");
    if (interactive && !interactive.hasAttribute("data-no-sound")) {
      soundEngine.playClick();
    }
  });
}

// Auto-boot on DOM ready
if (typeof document !== "undefined") {
  const boot = () => {
    init3DTilt();
    initSpotlightGlow();
    initMagneticButtons();
    initAmbientSpotlight();
    initCursorFollower();
    initImageParallax();
    initGlobalTriggers();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
