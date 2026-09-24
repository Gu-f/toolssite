import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGUAGE_STORAGE_KEY, readInitialLanguage, type Language } from './config';
import { LanguageContext, type Translate } from './LanguageContext';
import { en, zh, type TranslationValues } from './translations';

type LanguageProviderProps = {
  children: ReactNode;
};

const TRANSLATIONS = {
  en,
  zh,
} as const;

function formatTemplate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{([^}]+)\}/gu, (match, key: string) => {
    const value = values[key];

    return value === undefined ? match : String(value);
  });
}

export default function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = TRANSLATIONS[language]['app.title'];

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable in private browsing modes; language still works for this visit.
    }
  }, [language]);

  const value = useMemo(() => {
    const t: Translate = (key, values) => formatTemplate(TRANSLATIONS[language][key], values);

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
