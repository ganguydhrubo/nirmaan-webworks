const root = document.querySelector('[data-af-planner]');
if (root) {
  const area = root.querySelector<HTMLInputElement>('[data-af-area]')!;
  const finish = root.querySelector<HTMLSelectElement>('[data-af-finish]')!;
  const execution = root.querySelector<HTMLOutputElement>('[data-af-execution]')!;
  const fees = root.querySelector<HTMLOutputElement>('[data-af-fees]')!;
  const assumption = root.querySelector('[data-af-assumption]')!;
  const rates: Record<string, [number, number]> = {essential:[1600,2200],considered:[2300,3200],crafted:[3300,4600]};
  const range = (a:number,b:number) => `₹${(a/100000).toFixed(1)}–${(b/100000).toFixed(1)} lakh`;
  const update = () => {
    const valid = area.value !== '' && area.validity.valid;
    area.setAttribute('aria-invalid', String(!valid));
    if (!valid) { execution.value = '—'; fees.value = '—'; assumption.textContent = 'Enter an area from 300 to 10,000 sq ft, in steps of 50.'; return; }
    const n = area.valueAsNumber;
    const [low, high] = rates[finish.value] ?? rates.considered!;
    execution.value = range(n*low,n*high);
    fees.value = range(n*150,n*250);
    assumption.textContent = `${n.toLocaleString('en-IN')} sq ft · ${finish.selectedOptions[0]?.textContent?.split(' — ')[0]} finish`;
  };
  area.addEventListener('input', update);
  finish.addEventListener('change', update);
  update();
}
export {};
