// Category tab filter for the Anaar menu page. Keyboard accessible (uses
// native <button> elements + aria-selected), degrades to "show everything"
// if JS never runs since every section is visible by default in markup.
const tabs = document.querySelectorAll<HTMLButtonElement>("[data-menu-tab]");
const sections = document.querySelectorAll<HTMLElement>("[data-menu-section]");

function activate(categoryId: string) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.menuTab === categoryId;
    tab.setAttribute("aria-selected", String(isActive));
    tab.classList.toggle("bg-anaar-600", isActive);
    tab.classList.toggle("text-white", isActive);
    tab.classList.toggle("bg-white", !isActive);
    tab.classList.toggle("text-anaar-700", !isActive);
  });
  sections.forEach((section) => {
    section.hidden = categoryId !== "all" && section.dataset.menuSection !== categoryId;
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => activate(tab.dataset.menuTab!));
});

// Veg/non-veg toggle
const vegToggle = document.querySelector<HTMLInputElement>("[data-veg-only]");
vegToggle?.addEventListener("change", () => {
  document.querySelectorAll<HTMLElement>("[data-menu-item]").forEach((item) => {
    item.hidden = vegToggle.checked && item.dataset.veg !== "true";
  });
});
