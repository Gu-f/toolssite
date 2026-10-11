import type { ReactNode } from 'react';
import { useTranslation } from '../../../i18n/LanguageContext';
import { TOOL_CATEGORIES, TOOLS } from '../registry';
import type { ToolCategory, ToolId } from '../../../types/tool';

type WorkspaceHomeProps = {
  onSelectTool: (toolId: ToolId) => void;
};

type HomeFeatureKey = 'local' | 'tabs' | 'autosave';

// Category badges reuse the existing tag palette; several categories share a
// color because the tag set is intentionally small.
const CATEGORY_TAG_CLASS: Record<ToolCategory, 'tag-cyan' | 'tag-green' | 'tag-purple' | 'tag-orange'> = {
  Encoding: 'tag-cyan',
  Format: 'tag-green',
  Crypto: 'tag-green',
  Generator: 'tag-purple',
  Color: 'tag-cyan',
  Text: 'tag-orange',
  Time: 'tag-purple',
};

const FEATURE_ICONS: Record<HomeFeatureKey, ReactNode> = {
  local: (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 3l7 2.7v5.5c0 4.3-2.9 7.5-7 9.3-4.1-1.8-7-5-7-9.3V5.7L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.2l2 2 3.6-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  tabs: (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="3.5"
        y="13"
        width="17"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.5 7.75h5M6.5 16.25h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  autosave: (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const HOME_FEATURES: readonly HomeFeatureKey[] = ['local', 'tabs', 'autosave'];

export default function WorkspaceHome({ onSelectTool }: WorkspaceHomeProps) {
  const { t } = useTranslation();

  return (
    <div className="workspace-home">
      <section className="home-hero">
        <h1>{t('app.title')}</h1>
        <p className="home-hero-lede">{t('home.lede')}</p>
        <div className="home-hero-stats">
          <span className="home-stat">
            <strong>{TOOLS.length}</strong> {t('home.statTools')}
          </span>
          <span className="home-stat">
            <strong>{TOOL_CATEGORIES.length}</strong> {t('home.statCategories')}
          </span>
          <span className="home-stat">
            <strong>100%</strong> {t('home.statLocal')}
          </span>
        </div>
      </section>
      <section
        className="home-section"
        aria-labelledby="home-features-title"
      >
        <div className="home-section-header">
          <h2 id="home-features-title">{t('home.featuresTitle')}</h2>
        </div>
        <div className="home-features">
          {HOME_FEATURES.map((feature) => (
            <article
              key={feature}
              className="home-feature-card"
            >
              <span
                className="home-feature-icon"
                aria-hidden="true"
              >
                {FEATURE_ICONS[feature]}
              </span>
              <h3>{t(`home.feature.${feature}.title`)}</h3>
              <p>{t(`home.feature.${feature}.text`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        className="home-section"
        aria-labelledby="home-tools-title"
      >
        <div className="home-section-header">
          <h2 id="home-tools-title">{t('home.toolsTitle')}</h2>
          <p>{t('home.toolsHint')}</p>
        </div>
        <ul className="home-tool-grid">
          {TOOLS.map((tool) => (
            <li key={tool.id}>
              <button
                type="button"
                className="home-tool-card"
                onClick={() => onSelectTool(tool.id)}
              >
                <span className={`tag ${CATEGORY_TAG_CLASS[tool.category]}`}>
                  {t(`category.${tool.category}`)}
                </span>
                <strong>{t(`tools.${tool.id}.label`)}</strong>
                <span className="home-tool-description">
                  {t(`tools.${tool.id}.description`)}
                </span>
                <span className="home-tool-open">{t('home.openTool')}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
