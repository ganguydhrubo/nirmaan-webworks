# AGENTS.md — Development Guidelines & System Invariants

## Motion & Performance Rules

1. **No Hiding LCP Candidates**:
   - The primary H1 headline, above-the-fold value proposition, and critical call-to-action elements MUST start with computed `opacity: 1`, full scale, and zero blur on the very first paint (0ms).
   - Never apply `opacity: 0`, CSS clip-path transitions, or blur filters to the primary heading or above-the-fold copy on initial load. Chrome does not count an element as painted while its opacity is 0, which would directly inflate Largest Contentful Paint (LCP) by the full duration of the animation.

2. **Strict Performance & Bundle Budgets**:
   - Above-the-fold interactive hooks and micro-interactions must not exceed **3 KB gzipped JavaScript** and **3 KB gzipped CSS**.
   - Zero heavyweight runtime animation libraries: no GSAP, no Motion One, no Framer Motion, no Lottie. Rely exclusively on CSS spring transitions, native Web Animations API (WAAPI), and passive event listeners.
   - All scroll, resize, and touch listeners must be marked `{ passive: true }`. Do not perform layout thrashing (reading `getBoundingClientRect` or `offsetHeight`) inside `requestAnimationFrame` loops after initial layout measurement.

3. **Accessibility & Reduced Motion Invariants**:
   - Every animation and transition must respect `@media (prefers-reduced-motion: reduce)`.
   - Under reduced motion: elements render immediately in their final state with zero delay, ambient loops are halted, and touch interactions degrade to immediate color/shadow state changes.
   - Dynamic cycling stacks and carousels must have `aria-live="off"` so screen readers are never spammed with background changes.
   - Interactive cards and panels must be keyboard-accessible via Enter/Space and Esc keys, properly exposing ARIA attributes (`aria-expanded`, `aria-controls`, `aria-modal`).

4. **Zero Fabrication / Truthful Metrics**:
   - Real-world performance indicators (such as the LCP speed chip) must strictly read real browser timings via `PerformanceObserver`.
   - Never hardcode or synthesize false metrics. If `PerformanceObserver` is unsupported, if `navigator.connection?.saveData` is active, or if measured LCP exceeds acceptable thresholds (> 2.5s), the metric badge must cleanly render nothing.
