// Standard reducing-balance EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
function calcEmi(principal: number, annualRatePct: number, tenureYears: number): number {
  const r = annualRatePct / 12 / 100;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function initCalculator(form: HTMLFormElement) {
  const principalInput = form.querySelector<HTMLInputElement>('[name="principal"]');
  const rateInput = form.querySelector<HTMLInputElement>('[name="rate"]');
  const tenureInput = form.querySelector<HTMLInputElement>('[name="tenure"]');
  const resultEl = form.querySelector<HTMLElement>("[data-emi-result]");
  const totalEl = form.querySelector<HTMLElement>("[data-emi-total]");
  const interestEl = form.querySelector<HTMLElement>("[data-emi-interest]");

  function update() {
    const principal = Number(principalInput?.value ?? 0);
    const rate = Number(rateInput?.value ?? 0);
    const tenure = Number(tenureInput?.value ?? 0);
    if (!principal || !rate || !tenure || !resultEl) return;

    const emi = calcEmi(principal, rate, tenure);
    const total = emi * tenure * 12;
    const interest = total - principal;

    resultEl.textContent = `${formatInr(emi)}/month`;
    if (totalEl) totalEl.textContent = formatInr(total);
    if (interestEl) interestEl.textContent = formatInr(interest);
  }

  [principalInput, rateInput, tenureInput].forEach((el) => {
    el?.addEventListener("input", update);
  });
  update();
}

document.querySelectorAll<HTMLFormElement>("[data-emi-calculator]").forEach(initCalculator);
