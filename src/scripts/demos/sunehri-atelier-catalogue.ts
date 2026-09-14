const catalogue = document.querySelector<HTMLElement>('[data-sun-catalogue]');
if (catalogue) {
  const filters = [...catalogue.querySelectorAll<HTMLButtonElement>('[data-sun-filter]')];
  const cards = [...catalogue.querySelectorAll<HTMLElement>('[data-sun-card]')];
  const budget = catalogue.querySelector<HTMLSelectElement>('[data-sun-budget]');
  const sort = catalogue.querySelector<HTMLSelectElement>('[data-sun-sort]');
  const list = catalogue.querySelector('[data-sun-list]');
  let category = 'All';
  const update = () => {
    const maximum = Number(budget?.value ?? 0);
    const ordered = [...cards].sort((a,b) => sort?.value === 'low' ? Number(a.dataset.price)-Number(b.dataset.price) : sort?.value === 'high' ? Number(b.dataset.price)-Number(a.dataset.price) : Number(a.dataset.order)-Number(b.dataset.order));
    let count = 0;
    ordered.forEach(card => {
      card.hidden = !(category === 'All' || card.dataset.category === category) || (maximum > 0 && Number(card.dataset.price) > maximum);
      if (!card.hidden) count++;
      list?.append(card);
    });
    const status = catalogue.querySelector('[data-sun-count]');
    if (status) status.textContent = `${count} ${count === 1 ? 'piece' : 'pieces'} in this selection`;
    const empty = catalogue.querySelector<HTMLElement>('[data-sun-empty]');
    if (empty) empty.hidden = count > 0;
  };
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.sunFilter ?? 'All';
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    update();
  }));
  budget?.addEventListener('change', update);
  sort?.addEventListener('change', update);
}
export {};
