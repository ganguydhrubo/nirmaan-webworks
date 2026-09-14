const root = document.querySelector('[data-mh-planner]');
if (root) {
  const inputs = [...root.querySelectorAll<HTMLInputElement>('[data-mh-service]')];
  const list = root.querySelector('[data-mh-list]')!;
  const set = (name:string, text:string) => { const element = root.querySelector(`[data-mh-${name}]`); if (element) element.textContent = text; };
  const duration = (n:number) => n < 60 ? `${n} minutes` : `${Math.floor(n/60)} hr${n%60 ? ` ${n%60} min` : ''}`;
  const preset = new Set((new URLSearchParams(location.search).get('services') ?? '').split(','));
  inputs.forEach(input => { input.checked = preset.has(input.value); });
  const update = () => {
    const selected = inputs.filter(input=>input.checked);
    const price = selected.reduce((sum,input)=>sum+Number(input.dataset.price),0);
    const time = selected.reduce((sum,input)=>sum+Number(input.dataset.minutes),0);
    list.replaceChildren(...selected.map(input=>{ const li=document.createElement('li'); li.textContent=input.dataset.name ?? ''; return li; }));
    set('count',String(selected.length)); set('total',`₹${price.toLocaleString('en-IN')}`); set('time',duration(time));
    set('visit',selected.length ? duration(time+15) : '—');
    set('message',time>240 ? 'This is a long visit. Consider splitting these services across two days with your real provider.' : selected.length ? 'A sample itinerary only. No appointment is reserved.' : 'Choose a service to begin your sample visit.');
    const url = new URL(location.href);
    if (selected.length) url.searchParams.set('services',selected.map(i=>i.value).join(',')); else url.searchParams.delete('services');
    history.replaceState(null,'',url);
  };
  inputs.forEach(input=>input.addEventListener('change',update));
  root.querySelector('[data-mh-clear]')?.addEventListener('click',()=>{inputs.forEach(input=>{input.checked=false;});update();});
  update();
}
export {};
