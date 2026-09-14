// Progressive enhancement: without JS every project card is already visible
// (no display:none in the server-rendered HTML). With JS, this narrows the
// list based on the filter controls. Fully keyboard-operable — it's plain
// <select>/<button> elements, no custom widgets.
function initFilters(root: HTMLElement) {
  const statusSelect = root.querySelector<HTMLSelectElement>('[name="filter-status"]');
  const budgetSelect = root.querySelector<HTMLSelectElement>('[name="filter-budget"]');
  const configSelect = root.querySelector<HTMLSelectElement>('[name="filter-config"]');
  const resetBtns = root.querySelectorAll<HTMLButtonElement>("[data-filter-reset]");
  const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-project-card]"));
  const emptyState = root.querySelector<HTMLElement>("[data-filter-empty]");
  const countEl = root.querySelector<HTMLElement>("[data-filter-count]");

  function apply() {
    const status = statusSelect?.value ?? "";
    const budget = budgetSelect?.value ?? "";
    const config = configSelect?.value ?? "";
    let visible = 0;

    for (const card of cards) {
      const matchesStatus = !status || card.dataset.status === status;
      const matchesBudget = !budget || card.dataset.budget === budget;
      const matchesConfig = !config || card.dataset.configs?.includes(config);
      const show = matchesStatus && matchesBudget && matchesConfig;
      card.hidden = !show;
      if (show) visible++;
    }

    if (emptyState) emptyState.hidden = visible !== 0;
    if (countEl) countEl.textContent = `${visible} project${visible === 1 ? "" : "s"}`;
  }

  [statusSelect, budgetSelect, configSelect].forEach((el) => el?.addEventListener("change", apply));
  resetBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (statusSelect) statusSelect.value = "";
      if (budgetSelect) budgetSelect.value = "";
      if (configSelect) configSelect.value = "";
      apply();
    }),
  );

  apply();
}

document.querySelectorAll<HTMLElement>("[data-project-filters]").forEach(initFilters);
