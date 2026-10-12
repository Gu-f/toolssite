import type { ReactNode } from 'react';
import { Fragment, useState } from 'react';
import ChevronDownIcon from '../../../components/ChevronDownIcon';
import OptionToggle from '../../../components/OptionToggle';
import ToolField from '../../../components/ToolField';
import { useTranslation } from '../../../i18n/LanguageContext';
import ToolHeader from '../../../components/ToolHeader';
import {
  buildDiffFolds,
  buildSplitRows,
  compareLines,
  MAX_DIFF_LINES,
  type DifferenceFold,
  type DifferenceLine,
  type DifferenceSplitRow,
  type DiffViewMode,
} from '../../../lib/difference';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type UnifiedRenderItem =
  | { kind: 'line'; line: DifferenceLine; index: number }
  | { kind: 'fold'; start: number; end: number };

type SplitRenderItem =
  | { kind: 'row'; row: DifferenceSplitRow; index: number }
  | { kind: 'fold'; start: number; end: number };

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

function buildUnifiedItems(
  diff: readonly DifferenceLine[],
  folds: readonly DifferenceFold[],
  expandedFolds: ReadonlySet<number>,
): UnifiedRenderItem[] {
  const foldByStart = new Map(
    folds.filter((fold) => !expandedFolds.has(fold.start)).map((fold) => [fold.start, fold]),
  );
  const items: UnifiedRenderItem[] = [];
  let index = 0;

  while (index < diff.length) {
    const fold = foldByStart.get(index);

    if (fold) {
      items.push({ kind: 'fold', start: fold.start, end: fold.end });
      index = fold.end;
      continue;
    }

    items.push({ kind: 'line', line: diff[index], index });
    index += 1;
  }

  return items;
}

function buildSplitItems(
  rows: readonly DifferenceSplitRow[],
  folds: readonly DifferenceFold[],
  expandedFolds: ReadonlySet<number>,
): SplitRenderItem[] {
  const foldByStart = new Map(
    folds.filter((fold) => !expandedFolds.has(fold.start)).map((fold) => [fold.start, fold]),
  );
  const items: SplitRenderItem[] = [];
  let index = 0;

  while (index < rows.length) {
    const fold = foldByStart.get(rows[index].lineIndex);

    if (fold) {
      items.push({ kind: 'fold', start: fold.start, end: fold.end });
      // Folded lines are all "same" lines, so skip their rows 1:1.
      while (index < rows.length && rows[index].lineIndex < fold.end) {
        index += 1;
      }
      continue;
    }

    items.push({ kind: 'row', row: rows[index], index });
    index += 1;
  }

  return items;
}

function SplitRowCells({ row, emptyLabel }: { row: DifferenceSplitRow; emptyLabel: string }) {
  const leftClassName = row.left
    ? `diff-${row.left.type}`
    : 'diff-cell-empty';
  const rightClassName = row.right
    ? `diff-${row.right.type}`
    : 'diff-cell-empty';

  return (
    <>
      <div className={`diff-line diff-cell ${leftClassName}`}>
        {row.left ? (
          <>
            <span
              className="diff-marker"
            >
              {row.left.type === 'remove' ? '−' : ' '}
            </span>
            <span>{renderLineContent(row.left, emptyLabel)}</span>
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
            <span>{renderLineContent(row.right, emptyLabel)}</span>
          </>
        ) : null}
      </div>
    </>
  );
}

function FoldBar({ fold, onExpand }: { fold: DifferenceFold; onExpand: (start: number) => void }) {
  const { t } = useTranslation();
  const hiddenCount = fold.end - fold.start;

  return (
    <button
      type="button"
      className="diff-fold-bar"
      onClick={() => onExpand(fold.start)}
    >
      <span aria-hidden="true">⋯</span>
      {t('tools.diff.expandFold', { count: hiddenCount })}
      <span aria-hidden="true">⋯</span>
    </button>
  );
}

export default function DiffTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.diff);
  const { original, modified, diff, viewMode } = state;
  const [isInputsCollapsed, setIsInputsCollapsed] = useState(false);
  const [expandedFolds, setExpandedFolds] = useState<ReadonlySet<number>>(new Set());
  const splitRows = viewMode === 'split' ? buildSplitRows(diff) : [];
  const folds = buildDiffFolds(diff);
  const unifiedItems = viewMode === 'unified'
    ? buildUnifiedItems(diff, folds, expandedFolds)
    : [];
  const splitItems = viewMode === 'split'
    ? buildSplitItems(splitRows, folds, expandedFolds)
    : [];
  const viewOptions = [
    { value: 'unified', label: t('tools.diff.inline') },
    { value: 'split', label: t('tools.diff.split') },
  ] as const satisfies ReadonlyArray<{
    value: DiffViewMode;
    label: string;
  }>;
  const areAllFoldsExpanded = folds.every((fold) => expandedFolds.has(fold.start));

  const run = () => {
    setState((current) => ({ ...current, diff: compareLines(original, modified) }));
    // The result takes over the screen: hide the inputs and re-fold all hunks.
    setIsInputsCollapsed(true);
    setExpandedFolds(new Set());
  };

  const clear = () => {
    setState((current) => ({
      ...current,
      original: '',
      modified: '',
      diff: [],
      viewMode: current.viewMode,
    }));
    setIsInputsCollapsed(false);
    setExpandedFolds(new Set());
  };

  const expandFold = (start: number) => {
    setExpandedFolds((current) => new Set(current).add(start));
  };

  const toggleAllFolds = () => {
    setExpandedFolds(areAllFoldsExpanded
      ? new Set()
      : new Set(folds.map((fold) => fold.start)));
  };

  const addedCount = diff.filter((line) => line.type === 'add').length;
  const removedCount = diff.filter((line) => line.type === 'remove').length;
  const isTruncated = Math.max(
    original.split('\n').length,
    modified.split('\n').length,
  ) > MAX_DIFF_LINES;

  return (
    <div className="tool-page tool-page-diff">
      <ToolHeader
        title={t('tools.diff.title')}
      />
      <div className="diff-inputs">
        <button
          type="button"
          className="diff-inputs-toggle"
          aria-expanded={!isInputsCollapsed}
          onClick={() => setIsInputsCollapsed((current) => !current)}
        >
          <ChevronDownIcon />
          {t('tools.diff.inputs')}
        </button>
        {!isInputsCollapsed && (
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
        )}
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
          className="diff-output-field"
          extra={(
            <div className="diff-view-actions">
              {folds.length > 0 && (
                <button
                  type="button"
                  className="diff-fold-toggle"
                  onClick={toggleAllFolds}
                >
                  {areAllFoldsExpanded
                    ? t('tools.diff.collapseAll')
                    : t('tools.diff.expandAll')}
                </button>
              )}
              <OptionToggle
                label={t('tools.diff.viewMode')}
                options={viewOptions}
                value={viewMode}
                onChange={(mode) => setState((current) => ({
                  ...current,
                  viewMode: mode,
                }))}
              />
            </div>
          )}
          labelTarget="panel"
        >
          <div
            id="diff-output"
            className="diff-output-wrapper"
            aria-labelledby="diff-output"
          >
            {viewMode === 'unified' ? (
              <div className="code-area code-area-output diff-output">
                {unifiedItems.map((item) => item.kind === 'fold' ? (
                  <FoldBar
                    key={`fold-${item.start}`}
                    fold={item}
                    onExpand={expandFold}
                  />
                ) : (
                  <div
                    key={`${item.index}-${item.line.type}-${item.line.text}`}
                    className={`diff-line diff-${item.line.type}`}
                  >
                    <span
                      className="diff-marker"
                    >
                      {item.line.type === 'add' ? '+' : item.line.type === 'remove' ? '−' : ' '}
                    </span>
                    <span>
                      {renderLineContent(item.line, t('tools.diff.emptyLine'))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="code-area code-area-output diff-output diff-split">
                {splitItems.map((item) => item.kind === 'fold' ? (
                  <FoldBar
                    key={`fold-${item.start}`}
                    fold={item}
                    onExpand={expandFold}
                  />
                ) : (
                  <Fragment key={`${item.index}-${item.row.type}`}>
                    <SplitRowCells row={item.row} emptyLabel={t('tools.diff.emptyLine')} />
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </ToolField>
      )}
    </div>
  );
}
