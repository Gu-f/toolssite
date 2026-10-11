import { useTranslation } from '../../../i18n/LanguageContext';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

export default function NotepadTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.notepad);
  const { text } = state;

  return (
    <div className="tool-page tool-page-notepad">
      <ToolHeader title={t('tools.notepad.title')} />
      <ToolField
        id="notepad-text"
        label={t('tools.notepad.content')}
        extra={(
          <span className="notepad-count">
            {t('tools.notepad.charCount', { count: text.length })}
          </span>
        )}
      >
        <textarea
          id="notepad-text"
          className="code-area notepad-area"
          value={text}
          onChange={(event) => setState((current) => ({
            ...current,
            text: event.target.value,
          }))}
          placeholder={t('tools.notepad.placeholder')}
        />
      </ToolField>
    </div>
  );
}
