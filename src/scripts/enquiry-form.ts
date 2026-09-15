const INDIAN_MOBILE_RE = /^(?:\+91|91|0)?([6-9]\d{9})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initEnquiryForm(wrapper: HTMLElement) {
  const form = wrapper.querySelector<HTMLFormElement>("[data-enquiry-form]");
  if (!form) return;

  const successPanel = wrapper.querySelector<HTMLElement>("[data-enquiry-success]");
  const errorBanner = form.querySelector<HTMLElement>("[data-form-error]");
  const submitBtn = form.querySelector<HTMLButtonElement>("[data-submit-btn]");
  const btnLabel = form.querySelector<HTMLElement>("[data-btn-label]");
  const waNumber = wrapper.dataset.whatsappNumber ?? "";

  // Populate provenance hidden fields — only knowable client-side.
  const setField = (name: string, value: string) => {
    const el = form.querySelector<HTMLInputElement>(`[data-field="${name}"]`);
    if (el) el.value = value;
  };
  setField("formRenderedAt", String(Date.now()));
  setField("referrer", document.referrer.slice(0, 500));
  const params = new URLSearchParams(location.search);
  setField("utmSource", params.get("utm_source") ?? "");
  setField("utmMedium", params.get("utm_medium") ?? "");
  setField("utmCampaign", params.get("utm_campaign") ?? "");
  setField("utmTerm", params.get("utm_term") ?? "");
  setField("utmContent", params.get("utm_content") ?? "");

  // Pre-fill category from ?category= on the page URL (industry/demo pages link here).
  const categoryFromUrl = params.get("category");
  const categorySelect = form.querySelector<HTMLSelectElement>('select[name="category"]');
  if (categoryFromUrl && categorySelect) {
    const match = Array.from(categorySelect.options).find((o) => o.value.toLowerCase() === categoryFromUrl.toLowerCase());
    if (match) categorySelect.value = match.value;
  }

  // Pre-fill business name + a context note from the AI evaluator's
  // "Request Custom Build Quote" link (?business=&score=), so a visitor who
  // just typed this in doesn't have to retype it here.
  const businessFromUrl = params.get("business");
  const businessInput = form.querySelector<HTMLInputElement>('input[name="businessName"]');
  if (businessFromUrl && businessInput && !businessInput.value) {
    businessInput.value = businessFromUrl;
  }
  const scoreFromUrl = params.get("score");
  const packageFromUrl = params.get("package");
  const messageFromUrl = params.get("message");
  const messageInput = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  if (messageFromUrl && messageInput && !messageInput.value) {
    messageInput.value = messageFromUrl;
  } else if (scoreFromUrl && messageInput && !messageInput.value) {
    messageInput.value = `I ran the AI Website Evaluator${businessFromUrl ? ` for ${businessFromUrl}` : ""} and scored ${scoreFromUrl}/100 — I'd like to talk about a redesign.`;
  } else if (packageFromUrl && messageInput && !messageInput.value) {
    messageInput.value = `I'm interested in the "${packageFromUrl}" package — please send me a quote.`;
  }

  // Turnstile: load only if a widget placeholder exists on this form.
  const turnstileEl = form.querySelector<HTMLElement>(".cf-turnstile");
  if (turnstileEl && !document.querySelector('script[data-turnstile]')) {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    document.head.appendChild(script);
  }
  (window as unknown as Record<string, unknown>).onTurnstileSuccess = (token: string) => setField("turnstileToken", token);
  (window as unknown as Record<string, unknown>).onTurnstileError = () => setField("turnstileToken", "");

  type FieldName = "name" | "phone" | "email" | "category" | "needs" | "consent";

  function showFieldError(field: FieldName, message: string) {
    const input = form!.querySelector<HTMLElement>(`[name="${field}"]`);
    const errorEl = document.getElementById(`${input?.id}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    input?.setAttribute("aria-invalid", "true");
  }

  function clearFieldError(field: FieldName) {
    const input = form!.querySelector<HTMLElement>(`[name="${field}"]`);
    const errorEl = document.getElementById(`${input?.id}-error`);
    if (errorEl) {
      errorEl.hidden = true;
    }
    input?.removeAttribute("aria-invalid");
  }

  function validate(): { valid: boolean; firstInvalid?: HTMLElement } {
    const data = new FormData(form!);
    let valid = true;
    let firstInvalid: HTMLElement | undefined;

    const name = String(data.get("name") ?? "").trim();
    if (name.length < 2) {
      showFieldError("name", "Please enter your name");
      valid = false;
      firstInvalid ??= form!.querySelector('[name="name"]') as HTMLElement;
    } else clearFieldError("name");

    const phone = String(data.get("phone") ?? "").trim();
    if (!INDIAN_MOBILE_RE.test(phone.replace(/\s|-/g, ""))) {
      showFieldError("phone", "Enter a valid 10-digit Indian mobile number");
      valid = false;
      firstInvalid ??= form!.querySelector('[name="phone"]') as HTMLElement;
    } else clearFieldError("phone");

    const email = String(data.get("email") ?? "").trim();
    if (email && !EMAIL_RE.test(email)) {
      showFieldError("email", "Enter a valid email address");
      valid = false;
      firstInvalid ??= form!.querySelector('[name="email"]') as HTMLElement;
    } else clearFieldError("email");

    if (!data.get("category")) {
      valid = false;
      firstInvalid ??= form!.querySelector('[name="category"]') as HTMLElement;
    }
    if (!data.get("needs")) {
      valid = false;
      firstInvalid ??= form!.querySelector('[name="needs"]') as HTMLElement;
    }
    if (data.get("consent") !== "on") {
      valid = false;
      firstInvalid ??= form!.querySelector('[name="consent"]') as HTMLElement;
    }

    return { valid, firstInvalid };
  }

  for (const field of ["name", "phone", "email"] as const) {
    form.querySelector(`[name="${field}"]`)?.addEventListener("blur", () => validate());
  }

  function setBusy(busy: boolean) {
    if (submitBtn) submitBtn.disabled = busy;
    if (btnLabel) btnLabel.textContent = busy ? "Sending…" : "Send enquiry";
  }

  function showError(message: string) {
    if (!errorBanner) return;
    errorBanner.textContent = message;
    errorBanner.classList.remove("hidden");
    errorBanner.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function hideError() {
    errorBanner?.classList.add("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    const { valid, firstInvalid } = validate();
    if (!valid) {
      firstInvalid?.focus();
      return;
    }

    setBusy(true);
    const formData = new FormData(form);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });
    payload.consent = formData.get("consent") === "on";

    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; message?: string } | null;

      if (res.ok && json?.ok) {
        form.hidden = true;
        if (successPanel) {
          successPanel.hidden = false;
          const waLink = successPanel.querySelector<HTMLAnchorElement>("[data-success-wa-link]");
          if (waLink && waNumber) {
            const name = String(payload.name ?? "");
            const category = String(payload.category ?? "");
            const text = `Hi, this is ${name}. I just submitted an enquiry about a ${category} website on your site — following up here.`;
            waLink.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
          }
        }
        try {
          navigator.sendBeacon?.("/api/analytics", new Blob([JSON.stringify({ event: "enquiry_success", path: location.pathname })], { type: "application/json" }));
        } catch {
          /* non-critical */
        }
      } else {
        showError(json?.message ?? "Something went wrong on our side. Please message us on WhatsApp or call us and we'll pick it up straight away.");
      }
    } catch {
      showError("We couldn't reach our server. Please check your connection, or message us on WhatsApp or call us directly.");
    } finally {
      setBusy(false);
    }
  });
}

document.querySelectorAll<HTMLElement>("[data-enquiry-wrapper]").forEach(initEnquiryForm);

// Never let the mobile sticky action bar cover the enquiry form's submit
// button: hide the bar whenever a form is on-screen.
const stickyBar = document.querySelector<HTMLElement>("[data-mobile-sticky-bar]");
const enquiryWrappers = document.querySelectorAll<HTMLElement>("[data-enquiry-wrapper]");
if (stickyBar && enquiryWrappers.length > 0 && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      const anyVisible = entries.some((e) => e.isIntersecting);
      stickyBar.classList.toggle("opacity-0", anyVisible);
      stickyBar.classList.toggle("pointer-events-none", anyVisible);
    },
    { threshold: 0.15 },
  );
  enquiryWrappers.forEach((el) => io.observe(el));
}
