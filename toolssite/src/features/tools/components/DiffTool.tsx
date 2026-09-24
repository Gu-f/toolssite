import type { ReactNode } from 'react';
import { Fragment } from 'react';
import OptionToggle from '../../../components/OptionToggle';
import ToolField from '../../../components/ToolField';
import { useTranslation } from '../../../i18n/LanguageContext';
import ToolHeader from '../../../components/ToolHeader';
import {
  buildSplitRows,
  compareLines,
  MAX_DIFF_LINES,
  type DifferenceLine,
  type DiffViewMode,
} from '../../../lib/difference';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

function renderLineContent(line: DifferenceLine, emptyLabel: string): ReactNode {
  if (line.text === '') {
    return <span className="empty-line">{emptyLabel}</span>;
  }

  const segments = line.segments ?? [{
    type: line.type,
    text: line.text,
  }];

  return segments.map((segment, index) => {
    if (segment.type === 'same') {
      return (
        <Fragment key={`${segment.type}-${index}`}>
          {segment.text}
        </Fragment>
      );
    }

    const CharMark = segment.type === 'add' ? 'ins' : 'del';

    return (
      <CharMark
        key={`${segment.type}-${index}`}
        className={segment.type === 'add' ? 'diff-char-add' : 'diff-char-remove'}
      >
        {segment.text}
      </CharMark>
    );
  });
}

export default function DiffTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.diff);
  const { original, modified, diff, viewMode } = state;
  const splitRows = viewMode === 'split' ? buildSplitRows(diff) : [];
  const viewOptions = [
    { value: 'unified', label: t('tools.diff.inline') },
    { value: 'split', label: t('tools.diff.split') },
  ] as const satisfies ReadonlyArray<{
    value: DiffViewMode;
    label: string;
  }>;

  const run = () => {
    setState((current) => ({ ...current, diff: compareLines(original, modified) }));
  };

  const clear = () => {
    setState((current) => ({
      ...current,
      original: '',
      modified: '',
      diff: [],
      viewMode: current.viewMode,
    }));
  };

  const addedCount = diff.filter((line) => line.type === 'add').length;
  const removedCount = diff.filter((line) => line.type === 'remove').length;
  const isTruncated = Math.max(
    original.split('\n').length,
    modified.split('\n').length,
  ) > MAX_DIFF_LINES;

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.diff.title')}
      />
      <div className="field-grid">
        <ToolField id="diff-original" label={t('tools.diff.original')}>
          <textarea
            id="diff-original"
            className="code-area"
            value={original}
            onChange={(event) => setState((current) => ({
              ...current,
              original: event.target.value,
            }))}
            placeholder={t('tools.diff.originalPlaceholder')}
          />
        </ToolField>
        <ToolField id="diff-modified" label={t('tools.diff.modified')}>
          <textarea
            id="diff-modified"
            className="code-area"
            value={modified}
            onChange={(event) => setState((current) => ({
              ...current,
              modified: event.target.value,
            }))}
            placeholder={t('tools.diff.modifiedPlaceholder')}
          />
        </ToolField>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          onClick={run}
        >
          {t('common.compare')}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={clear}
        >
          {t('common.clear')}
        </button>
        {diff.length > 0 && (
          <div className="diff-summary">
            <span className="status-ok">{t('tools.diff.added', { count: addedCount })}</span>
            <span className="status-error">{t('tools.diff.removed', { count: removedCount })}</span>
            {isTruncated && (
              <span className="status-warning">{t('tools.diff.firstLines', { count: MAX_DIFF_LINES })}</span>
            )}
          </div>
        )}
      </div>
      {diff.length > 0 && (
        <ToolField
          id="diff-output"
          label={t('tools.diff.output')}
          extra={(
            <OptionToggle
              label={t('tools.diff.viewMode')}
              options={viewOptions}
              value={viewMode}
              onChange={(mode) => setState((current) => ({
                ...current,
                viewMode: mode,
              }))}
            />
          )}
          labelTarget="panel"
        >
          <div
            id="diff-output"
            aria-labelledby="diff-output"
          >
            {viewMode === 'unified' ? (
              <div className="code-area code-area-output diff-output">
                {diff.map((line, index) => (
                  <div
                    key={`${index}-${line.type}-${line.text}`}
                    className={`diff-line diff-${line.type}`}
                  >
                    <span
                      className="diff-marker"
                    >
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                    </span>
                    <span>
                      {renderLineContent(line, t('tools.diff.emptyLine'))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="code-area code-area-output diff-output diff-split">
                {splitRows.map((row, index) => {
                  const leftClassName = row.left
                    ? `diff-${row.left.type}`
                    : 'diff-cell-empty';
                  const rightClassName = row.right
                    ? `diff-${row.right.type}`
                    : 'diff-cell-empty';

                  return (
                    <Fragment key={`${index}-${row.type}`}>
                      <div className={`diff-line diff-cell ${leftClassName}`}>
                        {row.left ? (
                          <>
                            <span
                              className="diff-marker"
                            >
                              {row.left.type === 'remove' ? '−' : ' '}
                            </span>
                            <span>{renderLineContent(row.left, t('tools.diff.emptyLine'))}</span>
                          </>
                        ) : null}
                      </div>
                      <div className={`diff-line diff-cell ${rightClassName}`}>
                        {row.right ? (
                          <>
                            <span
                              className="diff-marker"
                            >
                              {row.right.type === 'add' ? '+' : ' '}
                            </span>
                            <span>{renderLineContent(row.right, t('tools.diff.emptyLine'))}</span>
                          </>
                        ) : null}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </ToolField>
      )}
    </div>
  );
}
