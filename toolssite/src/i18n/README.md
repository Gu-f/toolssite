# i18n

This module provides the lightweight language context used by the app. It intentionally has no third-party runtime dependency because the site currently needs only English and Chinese.

## Public API

- `LanguageProvider`: owns the selected language, persists it to `localStorage`, and sets `html[lang]`.
- `useTranslation()`: reads `language`, `setLanguage`, and the `t(key, values?)` translator.
- `translations.ts`: defines type-safe English keys and the complete Chinese dictionary.
- `config.ts`: validates stored values and detects the initial browser language.

Only `en` and `zh` are supported. Add new user-visible copy to both dictionaries and reuse existing keys for shared actions such as copy, clear, loading, and retry.
