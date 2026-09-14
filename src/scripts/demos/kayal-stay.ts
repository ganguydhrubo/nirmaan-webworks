const form = document.querySelector<HTMLFormElement>('[data-stay-planner]');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const arrival = Date.parse(String(data.get('arrival')));
  const departure = Date.parse(String(data.get('departure')));
  const nights = Math.round((departure - arrival) / 86400000);
  const result = form.querySelector<HTMLElement>('[data-stay-result]');
  if (!result) return;
  if (!Number.isFinite(nights) || nights < 1 || nights > 30) {
    result.textContent = 'Choose a departure after arrival, with a stay of 1–30 nights.';
    return;
  }
  const total = nights * Number(data.get('room'));
  result.textContent = `${nights} night${nights === 1 ? '' : 's'} · ₹${total.toLocaleString('en-IN')} before tax. Sample estimate only; no room has been booked and nothing has been submitted.`;
});
export {};
