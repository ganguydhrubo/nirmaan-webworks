const root = document.querySelector('[data-af-projects]');
if (root) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-af-filter]')];
  const rows = [...root.querySelectorAll<HTMLElement>('[data-af-project]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    rows.forEach(row => { row.hidden = button.dataset.afFilter !== 'All' && row.dataset.type !== button.dataset.afFilter; });
    const count = rows.filter(row => !row.hidden).length;
    const status = root.querySelector('[data-af-count]');
    if (status) status.textContent = `${count} ${count === 1 ? 'study' : 'studies'}`;
  }));
}
export {};
