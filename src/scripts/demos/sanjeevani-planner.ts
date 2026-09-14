const filter = document.querySelector<HTMLSelectElement>('[data-doctor-filter]');
filter?.addEventListener('change', () => {
  let count = 0;
  document.querySelectorAll<HTMLElement>('[data-specialty]').forEach(card => {
    card.hidden = filter.value !== 'all' && card.dataset.specialty !== filter.value;
    if (!card.hidden) count++;
  });
  const result = document.querySelector('[data-doctor-count]');
  if (result) result.textContent = `${count} example doctor schedule${count === 1 ? '' : 's'}`;
});
const form = document.querySelector<HTMLFormElement>('[data-clinic-planner]');
form?.addEventListener('submit', event => {
  event.preventDefault();
  const select = form.querySelector<HTMLSelectElement>('select');
  const option = select?.selectedOptions[0];
  const result = form.querySelector('[data-clinic-result]');
  if (result && option) result.textContent = `In a real booking flow, the clinic would check your preferred day against ${option.dataset.days}, ${option.dataset.time} IST, and contact you to confirm. This is a preview; nothing has been booked or submitted.`;
});
export {};
