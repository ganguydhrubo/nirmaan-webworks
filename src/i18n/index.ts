import { en } from './locales/en';
import { bn } from './locales/bn';
import { hi } from './locales/hi';
import type { SupportedLocale, TranslationDictionary } from './types';

export const locales: Record<SupportedLocale, TranslationDictionary> = {
  en,
  bn,
  hi,
};

export const defaultLocale: SupportedLocale = 'en';

export function getDictionary(locale: string = defaultLocale): TranslationDictionary {
  const norm = locale.toLowerCase().split('-')[0] as SupportedLocale;
  return locales[norm] || locales.en;
}

export function t(
  path: string,
  locale: string = defaultLocale,
  fallbackToEn = true
): string {
  const dict = getDictionary(locale);
  const parts = path.split('.');
  
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === 'string') {
    return current;
  }

  if (fallbackToEn && locale !== 'en') {
    return t(path, 'en', false);
  }

  return path;
}

export { en, bn, hi };
export type { SupportedLocale, TranslationDictionary };
