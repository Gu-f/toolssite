import CopyButton from '../../../components/CopyButton';
import { useTranslation } from '../../../i18n/LanguageContext';
import { translateMessage } from '../../../i18n/translations';
import OptionToggle from '../../../components/OptionToggle';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import { decodeUrl, encodeUrl } from '../../../lib/encoding';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type Mode = 'encode' | 'decode';

export default function UrlTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.url);
  const { input, output, mode, error } = state;

  const run = () => {
    setState((current) => ({ ...current, error: '' }));

    try {
      const result = mode === 'encode'
        ? encodeUrl(input)
        : decodeUrl(input);

      setState((current) => ({ ...current, output: result }));
    } catch {
      setState((current) => ({
        ...current,
        output: '',
        error: 'Invalid URL-encoded string',
      }));
    }
  };

  const clear = () => {
    setState((current) => ({ ...current, input: '', output: '', error: '' }));
  };

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.url.title')}
      />
      <div className="inline-controls url-controls">
        <OptionToggle<Mode>
          label={t('tools.url.mode')}
          value={mode}
          onChange={(nextMode) => setState((current) => ({
            ...current,
            mode: nextMode,
          }))}
          options={[
            { value: 'encode', label: t('tools.url.encode') },
            { value: 'decode', label: t('tools.url.decode') },
          ]}
        />
      </div>
      {mode === 'encode' && (
        <p className="encoding-hint">
          {t('tools.url.queryHint')}
        </p>
      )}
      <div className="field-grid">
        <ToolField id="url-input" label={t('common.input')}>
          <textarea
            id="url-input"
            className="code-area code-area-medium"
            value={input}
            onChange={(event) => setState((current) => ({
              ...current,
              input: event.target.value,
            }))}
            placeholder={
              mode === 'encode'
                ? 'https://example.com/path?q=hello world'
                : t('tools.url.encodedText')
            }
          />
        </ToolField>
        <ToolField
          id="url-output"
          label={t('common.output')}
          overlay={output ? <CopyButton value={output} /> : null}
        >
          <textarea
            id="url-output"
            className="code-area code-area-medium code-area-output"
            readOnly
            value={output}
            placeholder={t('common.result')}
          />
        </ToolField>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          onClick={run}
        >
          {t('common.run')}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={clear}
        >
          {t('common.clear')}
        </button>
      </div>
      {error && (
        <p
          className="status-message status-error"
          role="alert"
        >
          {translateMessage(error, t)}
        </p>
      )}
    </div>
  );
}
