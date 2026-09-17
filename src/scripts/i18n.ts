import { locales, defaultLocale, t } from '../i18n';
import type { SupportedLocale } from '../i18n/types';

(function () {
  let currentLocale: SupportedLocale = defaultLocale;

  function getStoredLocale(): SupportedLocale {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang')?.toLowerCase();
      if (urlLang === 'bn' || urlLang === 'hi' || urlLang === 'en') {
        return urlLang as SupportedLocale;
      }
      const local = localStorage.getItem('atittle_lang')?.toLowerCase();
      if (local === 'bn' || local === 'hi' || local === 'en') {
        return local as SupportedLocale;
      }
      const cookieMatch = document.cookie.match(/atittle_lang=([a-z]+)/i);
      if (cookieMatch && (cookieMatch[1] === 'bn' || cookieMatch[1] === 'hi' || cookieMatch[1] === 'en')) {
        return cookieMatch[1] as SupportedLocale;
      }
    } catch (_) {}
    return defaultLocale;
  }

  function setLanguage(lang: SupportedLocale, pushHistory = true) {
    currentLocale = lang;
    try {
      localStorage.setItem('atittle_lang', lang);
      document.cookie = 'atittle_lang=' + lang + ';path=/;max-age=31536000;SameSite=Lax';
    } catch (_) {}

    // Update document lang
    const htmlLang = lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    document.documentElement.lang = htmlLang;

    // Update URL param without page reload
    if (pushHistory && typeof history.replaceState === 'function') {
      const url = new URL(window.location.href);
      if (lang === 'en') {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', lang);
      }
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    // Apply translations to data-i18n elements
    const i18nElements = document.querySelectorAll<HTMLElement>('[data-i18n]');
    i18nElements.forEach((el) => {
      const key = el.dataset.i18n;
      if (!key) return;
      const translated = t(key, lang);
      if (translated && translated !== key) {
        if (el.dataset.i18nHtml === 'true') {
          el.innerHTML = translated;
        } else {
          el.textContent = translated;
        }
      }
    });

    // Apply translations to attributes
    const attrElements = document.querySelectorAll<HTMLElement>('[data-i18n-attr]');
    attrElements.forEach((el) => {
      const pairs = (el.dataset.i18nAttr || '').split(',');
      pairs.forEach((pair) => {
        const [attr, key] = pair.split(':');
        if (attr && key) {
          const translated = t(key.trim(), lang);
          if (translated && translated !== key.trim()) {
            el.setAttribute(attr.trim(), translated);
          }
        }
      });
    });

    // Update WhatsApp links that have data-wa-template
    const waLinks = document.querySelectorAll<HTMLAnchorElement>('a[data-wa-template]');
    waLinks.forEach((a) => {
      const templateKey = a.dataset.waTemplate;
      if (!templateKey) return;
      const msg = t('whatsappMessages.' + templateKey, lang);
      if (msg) {
        const currentHref = a.href;
        const phoneMatch = currentHref.match(/wa\.me\/(\d+)/);
        const phone = phoneMatch ? phoneMatch[1] : '919330393298';
        a.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
      }
    });

    // Update mobile navigation labels for character typing animation
    const mobileNavTyped = document.querySelectorAll<HTMLElement>('.mobile-nav-typed');
    mobileNavTyped.forEach((container) => {
      const key = container.dataset.navKey;
      if (key) {
        const translated = t('nav.' + key, lang);
        if (translated) {
          container.dataset.navLabel = translated;
          const textEl = container.querySelector<HTMLElement>('.typed-text');
          if (textEl && container.classList.contains('is-stable')) {
            textEl.textContent = translated;
          }
        }
      }
    });

    // Update selector UI buttons active states
    const selectorButtons = document.querySelectorAll<HTMLElement>('[data-set-lang]');
    selectorButtons.forEach((btn) => {
      const btnLang = btn.dataset.setLang;
      const isActive = btnLang === lang;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update selector trigger pill labels
    const currentLabels = document.querySelectorAll<HTMLElement>('[data-lang-current-label]');
    currentLabels.forEach((el) => {
      if (lang === 'bn') {
        el.textContent = 'বাংলা';
      } else if (lang === 'hi') {
        el.textContent = 'हिंदी';
      } else {
        el.textContent = 'English';
      }
    });

    const shortLabels = document.querySelectorAll<HTMLElement>('[data-lang-short-label]');
    shortLabels.forEach((el) => {
      if (lang === 'bn') {
        el.textContent = 'বাং';
      } else if (lang === 'hi') {
        el.textContent = 'हिं';
      } else {
        el.textContent = 'EN';
      }
    });

    // Broadcast event for custom dynamic components
    window.dispatchEvent(
      new CustomEvent('atittle:langchange', {
        detail: { lang, dictionary: locales[lang] },
      })
    );
  }

  function initSelectorEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const langBtn = target.closest<HTMLElement>('[data-set-lang]');
      if (langBtn) {
        e.preventDefault();
        const selectedLang = langBtn.dataset.setLang as SupportedLocale;
        if (selectedLang && selectedLang !== currentLocale) {
          setLanguage(selectedLang, true);
        }
        document.querySelectorAll<HTMLElement>('.lang-dropdown.is-open').forEach((dropdown) => {
          dropdown.classList.remove('is-open');
          const trigger = dropdown.parentElement?.querySelector<HTMLButtonElement>('[data-lang-trigger]');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
        return;
      }

      const trigger = target.closest<HTMLButtonElement>('[data-lang-trigger]');
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        const container = trigger.closest<HTMLElement>('.lang-selector-container');
        const dropdown = container?.querySelector<HTMLElement>('.lang-dropdown');
        if (dropdown) {
          const isOpen = dropdown.classList.contains('is-open');
          document.querySelectorAll<HTMLElement>('.lang-dropdown.is-open').forEach((d) => {
            if (d !== dropdown) {
              d.classList.remove('is-open');
              d.parentElement?.querySelector<HTMLButtonElement>('[data-lang-trigger]')?.setAttribute('aria-expanded', 'false');
            }
          });
          dropdown.classList.toggle('is-open', !isOpen);
          trigger.setAttribute('aria-expanded', String(!isOpen));
        }
        return;
      }

      if (!target.closest('.lang-selector-container')) {
        document.querySelectorAll<HTMLElement>('.lang-dropdown.is-open').forEach((dropdown) => {
          dropdown.classList.remove('is-open');
          const tEl = dropdown.parentElement?.querySelector<HTMLButtonElement>('[data-lang-trigger]');
          if (tEl) tEl.setAttribute('aria-expanded', 'false');
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll<HTMLElement>('.lang-dropdown.is-open').forEach((dropdown) => {
          dropdown.classList.remove('is-open');
          const trigger = dropdown.parentElement?.querySelector<HTMLButtonElement>('[data-lang-trigger]');
          if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
            trigger.focus();
          }
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSelectorEvents();
      const initialLocale = getStoredLocale();
      if (initialLocale !== defaultLocale) {
        setLanguage(initialLocale, false);
      }
    });
  } else {
    initSelectorEvents();
    const initialLocale = getStoredLocale();
    if (initialLocale !== defaultLocale) {
      setLanguage(initialLocale, false);
    }
  }

  window.addEventListener('popstate', () => {
    const poppedLocale = getStoredLocale();
    if (poppedLocale !== currentLocale) {
      setLanguage(poppedLocale, false);
    }
  });
})();
