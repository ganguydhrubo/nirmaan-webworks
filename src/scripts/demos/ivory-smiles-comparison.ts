// Before/after illustration comparison slider (Ivory Smiles demo).
// Native <input type="range"> drives it, so it's keyboard-accessible by
// default (arrow keys, Home/End) with zero extra work.
document.querySelectorAll<HTMLElement>("[data-comparison-widget]").forEach((widget) => {
  const slider = widget.querySelector<HTMLInputElement>("[data-comparison-slider]");
  const after = widget.querySelector<HTMLElement>("[data-comparison-after]");
  const handle = widget.querySelector<HTMLElement>("[data-comparison-handle]");
  if (!slider || !after || !handle) return;

  function update() {
    const value = Number(slider!.value);
    after!.style.width = `${value}%`;
    handle!.style.left = `${value}%`;
  }

  slider.addEventListener("input", update);
  update();
});
