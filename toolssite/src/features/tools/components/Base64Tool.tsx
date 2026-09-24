import CopyButton from '../../../components/CopyButton';
import { useTranslation } from '../../../i18n/LanguageContext';
import { translateMessage } from '../../../i18n/translations';
import OptionToggle from '../../../components/OptionToggle';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import { decodeBase64, encodeBase64, type Base64Encoding } from '../../../lib/encoding';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type Mode = 'encode' | 'decode';

export default function Base64Tool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.base64);
  const { input, output, mode, encoding, error } = state;

  const run = () => {
    setState((current) => ({ ...current, error: '' }));

    try {
      const result = mode === 'encode'
        ? encodeBase64(input, encoding)
        : decodeBase64(input);

      setState((current) => ({ ...current, output: result }));
    } catch {
      setState((current) => ({
        ...current,
        output: '',
        error: 'Invalid input for decoding',
      }));
    }
  };

  const clear = () => {
    setState((current) => ({ ...current, input: '', output: '', error: '' }));
  };

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.base64.title')}
      />
      <div className="inline-controls">
        <OptionToggle<Mode>
          label={t('tools.base64.mode')}
          value={mode}
          onChange={(nextMode) => setState((current) => ({
            ...current,
            mode: nextMode,
          }))}
          options={[
            { value: 'encode', label: t('tools.base64.encode') },
            { value: 'decode', label: t('tools.base64.decode') },
          ]}
        />
        {mode === 'encode' && (
          <OptionToggle<Base64Encoding>
            label={t('tools.base64.encoding')}
            value={encoding}
            onChange={(nextEncoding) => setState((current) => ({
              ...current,
              encoding: nextEncoding,
            }))}
            options={[
              { value: 'standard', label: t('tools.base64.standard') },
              { value: 'urlsafe', label: t('tools.base64.urlsafe') },
            ]}
          />
        )}
      </div>
      {mode === 'encode' && (
        <p className="encoding-hint">
          {encoding === 'standard'
            ? t('tools.base64.standardHint')
            : t('tools.base64.urlsafeHint')}
        </p>
      )}
      <div className="field-grid">
        <ToolField id="base64-input" label={t('common.input')}>
          <textarea
            id="base64-input"
            className="code-area"
            value={input}
            onChange={(event) => setState((current) => ({
              ...current,
              input: event.target.value,
            }))}
            placeholder={mode === 'encode' ? t('tools.base64.plainText') : t('tools.base64.encodedText')}
          />
        </ToolField>
        <ToolField
          id="base64-output"
          label={t('common.output')}
          overlay={output ? <CopyButton value={output} /> : null}
        >
          <textarea
            id="base64-output"
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
