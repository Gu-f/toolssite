import { createContext, useContext } from 'react';
import type { Language } from './config';
import type { TranslationKey, TranslationValues } from './translations';

export type Translate = (key: TranslationKey, values?: TranslationValues) => string;

export type LanguageContextValue = {
  readonly language: Language;
  readonly setLanguage: (language: Language) => void;
  readonly t: Translate;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useTranslation(): LanguageContextValue {
  const value = useContext(LanguageContext);

  if (!value) {
    throw new Error('Components using translations must be rendered inside the language provider.');
  }

  return value;
}
