import { Locale } from '../types';
import { TranslationSchema } from './types';
import { en } from './en';
import { tr } from './tr';

export * from './types';
export { en } from './en';
export { tr } from './tr';

export const translations: Record<Locale, TranslationSchema> = {
  en,
  tr,
};

export function getTranslation(locale: Locale): TranslationSchema {
  return translations[locale] || translations.en;
}

export function detectSystemLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }
  return 'en';
}

export function formatLocalizedDate(
  date: Date | number,
  locale: Locale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Intl.DateTimeFormat(
    localeTag,
    options || {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }
  ).format(d);
}
