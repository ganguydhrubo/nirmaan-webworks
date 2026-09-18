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
 * Global Trigger Delegate for Cinematic Theatre and UI Audio
 */
function initGlobalTriggers() {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Cinematic Theatre Open Trigger
    const theatreTrigger = target.closest<HTMLElement>("[data-open-theatre]");
    if (theatreTrigger) {
      e.preventDefault();
      const slug = theatreTrigger.dataset.openTheatre || "shivalik-homes";
      soundEngine.playChime();
      window.dispatchEvent(new CustomEvent("atittle:open-theatre", { detail: { slug } }));
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
    initGlobalTriggers();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
