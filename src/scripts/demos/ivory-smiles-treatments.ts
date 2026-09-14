// Client-side category filter for the treatments catalogue (Ivory Smiles demo).
// Degrades gracefully: without JS, every treatment card is already visible
// and the filter buttons simply don't do anything (no broken UI).
//
// `export {}` makes this a module instead of a global script — without it,
// top-level `const` names collide across every other demo's non-module
// script file when the whole src/scripts tree is type-checked together.
export {};

const buttons = document.querySelectorAll<HTMLButtonElement>("[data-treatment-filters] button");
const cards = document.querySelectorAll<HTMLElement>("[data-treatment-card]");
const noResults = document.querySelector<HTMLElement>("[data-no-results]");

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter!;
    buttons.forEach((b) => {
      const active = b === btn;
      b.setAttribute("aria-pressed", String(active));
      b.classList.toggle("bg-ivory-500", active);
      b.classList.toggle("text-white", active);
      b.classList.toggle("bg-white", !active);
      b.classList.toggle("text-ivory-ink/70", !active);
    });

    let visibleCount = 0;
    cards.forEach((card) => {
      const matches = filter === "All" || card.dataset.category === filter;
      card.hidden = !matches;
      if (matches) visibleCount++;
    });
    if (noResults) noResults.hidden = visibleCount > 0;
  });
});
