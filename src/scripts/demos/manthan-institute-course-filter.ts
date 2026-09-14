// Client-side course filter for the Manthan Institute demo. Degrades
// gracefully: without JS every course stays visible (no `hidden` attribute
// is ever applied server-side), so this only ever narrows what's shown.
const buttons = document.querySelectorAll<HTMLButtonElement>("[data-filter-btn]");
const cards = document.querySelectorAll<HTMLElement>("[data-course-card]");
const noResults = document.querySelector<HTMLElement>("[data-no-results]");

function applyFilter(value: string) {
  let visibleCount = 0;
  cards.forEach((card) => {
    const matches = value === "All" || card.dataset.exam === value;
    card.hidden = !matches;
    if (matches) visibleCount++;
  });
  if (noResults) noResults.hidden = visibleCount > 0;
}

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    buttons.forEach((b) => {
      const active = b === btn;
      b.setAttribute("aria-pressed", String(active));
      b.classList.toggle("border-manthan-600", active);
      b.classList.toggle("bg-manthan-600", active);
      b.classList.toggle("text-white", active);
      b.classList.toggle("border-manthan-200", !active);
      b.classList.toggle("text-manthan-700", !active);
    });
    applyFilter(btn.dataset.filterValue ?? "All");
  });
});
