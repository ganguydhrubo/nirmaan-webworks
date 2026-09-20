// Marks <html class="js"> so CSS can hide .reveal elements only when JS
// actually runs; without this the content must stay visible (progressive
// enhancement — see global.css `html:not(.js) .reveal`).
document.documentElement.classList.add("js");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Measure each sketch-draw shape's real path length so the CSS
// stroke-dashoffset draw-in animates the exact outline, not a guess.
document.querySelectorAll(".sketch-draw path, .sketch-draw line, .sketch-draw polyline, .sketch-draw circle, .sketch-draw rect").forEach((el) => {
  try {
    const geo = el as unknown as { getTotalLength?: () => number };
    const len = typeof geo.getTotalLength === "function" ? geo.getTotalLength() : 300;
    (el as HTMLElement | SVGElement).style.setProperty("--sketch-len", String(len));
  } catch (_) {}
});

const revealSelector = ".reveal, .motion-timeline-node, .sketch-draw";

if (!prefersReduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
  );
  document.querySelectorAll(revealSelector).forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(revealSelector).forEach((el) => el.classList.add("is-visible"));
}
