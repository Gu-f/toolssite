import { useDeferredValue } from 'react';
import ToolField from '../../../components/ToolField';
import { useTranslation } from '../../../i18n/LanguageContext';
import { translateMessage } from '../../../i18n/translations';
import ToolHeader from '../../../components/ToolHeader';
import { findRegexMatches, MAX_REGEX_MATCHES } from '../../../lib/regex';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type HighlightSegment = {
  readonly key: string;
  readonly text: string;
  readonly isMatch: boolean;
};

function getHighlights(
  text: string,
  matches: readonly { value: string; index: number }[],
): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.index < cursor || match.value.length === 0) {
      return;
    }
    if (match.index > cursor) {
      segments.push({ key: `text-${cursor}`, text: text.slice(cursor, match.index), isMatch: false });
    }
    segments.push({ key: `match-${index}`, text: match.value, isMatch: true });
    cursor = match.index + match.value.length;
  });

  if (cursor < text.length) {
    segments.push({ key: `text-${cursor}`, text: text.slice(cursor), isMatch: false });
  }

  return segments;
}

export default function RegexTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.regex);
  const { pattern, flags, text } = state;
  const deferredText = useDeferredValue(text);
  const { matches, error } = findRegexMatches(pattern, flags, deferredText);
  const highlights = matches.length > 0 ? getHighlights(deferredText, matches) : [];
  const matchLabel = matches.length === MAX_REGEX_MATCHES
    ? t('tools.regex.manyMatches', { count: `${matches.length}+` })
    : matches.length === 1
      ? t('tools.regex.oneMatch', { count: matches.length })
      : t('tools.regex.manyMatches', { count: matches.length });

  const updateState = (patch: Partial<typeof state>) => {
    setState((current) => ({ ...current, ...patch }));
  };

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.regex.title')}
      />
      <div className="regex-header">
        <ToolField id="regex-pattern" label={t('tools.regex.pattern')}>
          <div className="regex-pattern-input">
            <span>/</span>
            <textarea
              id="regex-pattern"
              rows={1}
              value={pattern}
              onChange={(event) => updateState({ pattern: event.target.value })}
              placeholder="[a-z]+"
            />
            <span>/</span>
            <input
              className="regex-flags"
              type="text"
              value={flags}
              onChange={(event) => updateState({ flags: event.target.value })}
              placeholder="gim"
              aria-label={t('tools.regex.flags')}
            />
          </div>
        </ToolField>
        {error ? (
          <span className="status-message status-error">{translateMessage(error ?? '', t)}</span>
        ) : (
          <span className="match-count">{matchLabel}</span>
        )}
      </div>
        <ToolField id="regex-text" label={t('tools.regex.testString')}>
        <textarea
          id="regex-text"
          className="code-area code-area-medium"
          value={text}
          onChange={(event) => updateState({ text: event.target.value })}
          placeholder={t('tools.regex.testPlaceholder')}
        />
      </ToolField>
      {highlights.length > 0 && (
        <ToolField id="regex-highlights" label={t('tools.regex.highlighted')}>
          <output
            id="regex-highlights"
            className="code-area code-area-output regex-highlights"
          >
            {highlights.map((segment) =>
              segment.isMatch ? (
                <mark key={segment.key}>{segment.text}</mark>
              ) : (
                <span key={segment.key}>{segment.text}</span>
              ),
            )}
          </output>
        </ToolField>
      )}
      {matches.length > 0 && (
        <ToolField
          id="regex-match-list"
          label={t('tools.regex.matchList')}
          labelTarget="panel"
        >
          <div
            aria-labelledby="regex-match-list"
            className="code-area code-area-output match-list"
          >
            {matches.map((match, index) => (
              <div
                key={`${match.index}-${match.value}`}
                className="match-row"
              >
                <span>{index + 1}</span>
                <span className="match-value">&quot;{match.value}&quot;</span>
                <span>{t('tools.regex.atIndex', { index: match.index })}</span>
              </div>
            ))}
          </div>
        </ToolField>
      )}
    </div>
  );
}
