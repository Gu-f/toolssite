import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { TOOL_CATEGORIES, TOOLS } from './registry';
import type { Language } from '../../i18n/config';
import { useTranslation } from '../../i18n/LanguageContext';
import type { ToolId } from '../../types/tool';

type ToolCatalogProps = {
  activeToolId: ToolId;
  onSelect: (toolId: ToolId) => void;
};

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'devkit-theme';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

const readStoredTheme = (): Theme => {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return isTheme(storedTheme) ? storedTheme : 'dark';
  } catch {
    return 'dark';
  }
};

export default function ToolCatalog({ activeToolId, onSelect }: ToolCatalogProps) {
  const { language, setLanguage, t } = useTranslation();
  const readSearch = (): string => new URLSearchParams(window.location.search).get('q') ?? '';

  const [search, setSearch] = useState(readSearch);
  const [collapsedCategories, setCollapsedCategories] = useState<ReadonlySet<string>>(new Set());
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMobileCatalogOpen, setIsMobileCatalogOpen] = useState(false);
  const languageControlRef = useRef<HTMLDivElement | null>(null);
  const languageButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setSearch(readSearch());
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable in private browsing modes; theme still works for this visit.
    }
  }, [theme]);

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return;
    }

    const closeMenu = () => setIsLanguageMenuOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      if (!languageControlRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        languageButtonRef.current?.focus();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('blur', closeMenu);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('blur', closeMenu);
    };
  }, [isLanguageMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setIsMobileCatalogOpen(false);
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isMobileCatalogOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileCatalogOpen(false);
        mobileToggleRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileCatalogOpen]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const selectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setIsLanguageMenuOpen(false);
    languageButtonRef.current?.focus();
  };

  const handleLanguageMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    );
    const currentIndex = menuItems.findIndex((item) => item === document.activeElement);
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1 + menuItems.length) % menuItems.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = menuItems.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      menuItems[nextIndex]?.focus();
    }
  };

  const changeSearch = (nextSearch: string) => {
    const searchParams = new URLSearchParams(window.location.search);

    if (nextSearch) {
      searchParams.set('q', nextSearch);
    } else {
      searchParams.delete('q');
    }

    const query = searchParams.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
    setSearch(nextSearch);
  };

  const query = search.trim().toLowerCase();
  const localizedTools = TOOLS.map((tool) => ({
    ...tool,
    label: t(`tools.${tool.id}.label`),
    localizedCategory: t(`category.${tool.category}`),
    description: t(`tools.${tool.id}.description`),
  }));
  const filteredTools = query
    ? localizedTools.filter(
        (tool) =>
          tool.label.toLowerCase().includes(query) ||
          tool.localizedCategory.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query),
      )
    : localizedTools;

  const toggleCategory = (category: string) => {
    setCollapsedCategories((current) => {
      const next = new Set(current);

      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }

      return next;
    });
  };

  const handleToolSelect = (toolId: ToolId) => {
    onSelect(toolId);
    setIsMobileCatalogOpen(false);
  };

  return (
    <>
      <header className="catalog-brand catalog-mobile-header">
        <span
          className="brand-mark"
          aria-hidden="true"
        >
          <img
            src="/toolslogo.webp"
            alt=""
            width="28"
            height="28"
            decoding="async"
          />
        </span>
        <div>
          <strong>DevKit</strong>
          <small>{t('catalog.subtitle')}</small>
        </div>
      </header>
      <button
        ref={mobileToggleRef}
        type="button"
        className="catalog-mobile-toggle"
        aria-label={t('catalog.navLabel')}
        aria-expanded={isMobileCatalogOpen}
        aria-controls="tool-catalog"
        onClick={() => setIsMobileCatalogOpen((isOpen) => !isOpen)}
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div
        aria-hidden="true"
        className={`catalog-backdrop${isMobileCatalogOpen ? ' is-open' : ''}`}
        onClick={() => setIsMobileCatalogOpen(false)}
      />
      <aside
        id="tool-catalog"
        className={`tool-catalog${isMobileCatalogOpen ? ' is-mobile-open' : ''}`}
      >
      <div className="catalog-brand">
        <span
          className="brand-mark"
          aria-hidden="true"
        >
          <img
            src="/toolslogo.webp"
            alt=""
            width="28"
            height="28"
            decoding="async"
          />
        </span>
        <div>
          <strong>DevKit</strong>
          <small>{t('catalog.subtitle')}</small>
        </div>
      </div>
      <div className="catalog-search">
        <div>
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <circle
              cx="5"
              cy="5"
              r="3.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M8 8l2.5 2.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            aria-label={t('catalog.searchLabel')}
          />
        </div>
      </div>
      <nav
        className="catalog-nav"
        aria-label={t('catalog.navLabel')}
      >
        {TOOL_CATEGORIES.map((category) => {
          const categoryTools = filteredTools.filter((tool) => tool.category === category);

          if (categoryTools.length === 0) {
            return null;
          }

          const isCollapsed = collapsedCategories.has(category);

          return (
            <section key={category}>
              <button
                type="button"
                className="catalog-category"
                aria-expanded={!isCollapsed}
                onClick={() => toggleCategory(category)}
              >
                <svg
                  aria-hidden="true"
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  style={{
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <path
                    d="M1 2.5L4 5.5L7 2.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{t(`category.${category}`)}</span>
                <small>{categoryTools.length}</small>
              </button>
              {!isCollapsed && (
                <ul className="catalog-list">
                  {categoryTools.map((tool) => (
                    <li key={tool.id}>
                      <button
                        type="button"
                        className={`catalog-item${tool.id === activeToolId ? ' is-active' : ''}`}
                        aria-current={tool.id === activeToolId ? 'page' : undefined}
                        title={tool.label}
                        onClick={() => handleToolSelect(tool.id)}
                      >
                        <span>{tool.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </nav>
      <div className="catalog-footer">
        <span>{t('catalog.toolsAvailable', { count: TOOLS.length })}</span>
        <div className="catalog-actions">
          <div
            ref={languageControlRef}
            className="language-control"
          >
            <button
              ref={languageButtonRef}
              type="button"
              className="theme-toggle"
              aria-label={t('language.choose')}
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
              title={t('language.choose')}
              onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
            >
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M3 12h18M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {isLanguageMenuOpen && (
              <div
                className="language-menu"
                role="menu"
                aria-label={t('language.choose')}
                onKeyDown={handleLanguageMenuKeyDown}
              >
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={language === 'en'}
                  className={`language-menu-item${language === 'en' ? ' is-active' : ''}`}
                  onClick={() => selectLanguage('en')}
                >
                  <span>{t('language.english')}</span>
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                  >
                    <path
                      d="M1.5 5.2L4 7.7l4.5-5.4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={language === 'zh'}
                  className={`language-menu-item${language === 'zh' ? ' is-active' : ''}`}
                  onClick={() => selectLanguage('zh')}
                >
                  <span>{t('language.chinese')}</span>
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                  >
                    <path
                      d="M1.5 5.2L4 7.7l4.5-5.4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
            title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
          >
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
            >
              {theme === 'dark' ? (
                <path
                  d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66l1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14l-1.41-1.41M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M20.5 14.8A8.5 8.5 0 019.2 3.5 8.5 8.5 0 1020.5 14.8z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
