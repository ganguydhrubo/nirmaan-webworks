const form = document.querySelector<HTMLFormElement>('[data-reservation-form]');
form?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const result = form.querySelector('[data-reservation-result]');
  if (result) result.textContent = data.get('guests') + ' guests on ' + data.get('date') + ' at ' + data.get('time') + ' IST. A real restaurant would confirm availability next. Demo only: no table reserved and no information sent.';
});
export {};
