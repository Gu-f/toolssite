import CopyButton from '../../../components/CopyButton';
import { useTranslation } from '../../../i18n/LanguageContext';
import { translateMessage } from '../../../i18n/translations';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import { repairJson, type JsonIndent } from '../../../lib/json';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type Indent = JsonIndent;

const INDENTS: readonly Indent[] = [2, 4];

export default function JsonTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.json);
  const { input, output, status, indent } = state;

  const formatJson = (format: boolean) => {
    try {
      const parsed: unknown = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, format ? indent : undefined);

      setState((current) => ({
        ...current,
        output: formatted,
        status: 'ok',
      }));
    } catch (caught) {
      setState((current) => ({
        ...current,
        output: caught instanceof Error ? caught.message : 'Parse error',
        status: 'error',
      }));
    }
  };

  const repairAndFormatJson = () => {
    try {
      const { json, isRepaired } = repairJson(input, indent);

      setState((current) => ({
        ...current,
        output: json,
        status: isRepaired ? 'repaired' : 'ok',
      }));
    } catch (caught) {
      setState((current) => ({
        ...current,
        output: caught instanceof Error ? caught.message : 'Parse error',
        status: 'error',
      }));
    }
  };

  const clear = () => {
    setState((current) => ({
      ...current,
      input: '',
      output: '',
      status: '',
    }));
  };

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.json.title')}
      />
      <div className="inline-controls">
        <span
          className="control-label"
          id="json-indent-label"
        >
          {t('tools.json.indent')}
        </span>
        <div
          className="option-toggle"
          role="group"
          aria-labelledby="json-indent-label"
        >
          {INDENTS.map((value) => (
            <button
              key={value}
              type="button"
              className={`option-toggle-item${indent === value ? ' is-active tone-green' : ''}`}
              aria-pressed={indent === value}
              onClick={() => setState((current) => ({
                ...current,
                indent: value,
              }))}
            >
              {t('tools.json.spaces', { count: value })}
            </button>
          ))}
        </div>
        {status === 'ok' && <span className="status-message status-ok">{t('tools.json.valid')}</span>}
        {status === 'repaired' && (
          <span className="status-message status-ok">{t('tools.json.repaired')}</span>
        )}
        {status === 'error' && <span className="status-message status-error">{t('tools.json.invalid')}</span>}
      </div>
      <div className="field-grid">
        <ToolField id="json-input" label={t('common.input')}>
          <textarea
            id="json-input"
            className="code-area code-area-large"
            value={input}
            onChange={(event) => setState((current) => ({
              ...current,
              input: event.target.value,
            }))}
            placeholder='{"key": "value"}'
          />
        </ToolField>
        <ToolField
          id="json-output"
          label={t('common.output')}
          overlay={(status === 'ok' || status === 'repaired') && output ? (
            <CopyButton value={output} />
          ) : null}
        >
          <textarea
            id="json-output"
            className="code-area code-area-large code-area-output"
            readOnly
            value={translateMessage(output, t)}
            placeholder={t('tools.json.formatted')}
          />
        </ToolField>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          onClick={() => formatJson(true)}
        >
          {t('tools.json.format')}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={repairAndFormatJson}
        >
          {t('tools.json.repair')}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => formatJson(false)}
        >
          {t('tools.json.minify')}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={clear}
        >
          {t('common.clear')}
        </button>
      </div>
    </div>
  );
}
