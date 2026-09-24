export type Language = 'en' | 'zh';

export const LANGUAGE_STORAGE_KEY = 'devkit-language';
export const DEFAULT_LANGUAGE: Language = 'en';

const CHINESE_LANGUAGE_PATTERN = /^zh(?:[-_]|$)/iu;

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'zh';
}

export function readInitialLanguage(): Language {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (isLanguage(storedLanguage)) {
      return storedLanguage;
    }
  } catch {
    // Storage may be unavailable in private browsing modes; detect from the browser instead.
  }

  const browserLanguages = window.navigator.languages ?? [window.navigator.language];

  return browserLanguages.some((language) => CHINESE_LANGUAGE_PATTERN.test(language))
    ? 'zh'
    : DEFAULT_LANGUAGE;
}
