import CopyButton from '../../../components/CopyButton';
import { useTranslation } from '../../../i18n/LanguageContext';
import OptionToggle from '../../../components/OptionToggle';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import { generateUuidV4, generateUuidV7 } from '../../../lib/uuid';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type UuidVersion = 'v4' | 'v7';

const COUNTS: readonly number[] = [1, 5, 10, 20];

export default function UuidTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.uuid);
  const { count, version, uuids } = state;

  const generate = () => {
    const generateUuid = version === 'v4' ? generateUuidV4 : generateUuidV7;

    setState((current) => ({
      ...current,
      uuids: Array.from({ length: count }, generateUuid),
    }));
  };

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.uuid.title')}
      />
      <div className="inline-controls">
        <OptionToggle<UuidVersion>
          label={t('tools.uuid.version')}
          value={version}
          onChange={(nextVersion) => setState((current) => ({
            ...current,
            version: nextVersion,
          }))}
          options={[
            { value: 'v4', label: 'V4' },
            { value: 'v7', label: 'V7' },
          ]}
        />
        <div
          className="option-toggle"
          role="group"
          aria-label={t('tools.uuid.count')}
        >
          {COUNTS.map((value) => (
            <button
              key={value}
              type="button"
              className={`option-toggle-item${count === value ? ' is-active tone-green' : ''}`}
              aria-pressed={count === value}
              onClick={() => setState((current) => ({
                ...current,
                count: value,
              }))}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          onClick={generate}
        >
          {t('common.generate')}
        </button>
      </div>
      {uuids.length > 0 && (
        <ToolField
          id="uuid-results"
          label={t('tools.uuid.results', { version: version.toUpperCase() })}
          labelTarget="panel"
          overlay={<CopyButton value={uuids.join('\n')} />}
        >
          <div
            id="uuid-results"
            aria-labelledby="uuid-results"
            className="code-area code-area-output uuid-list"
          >
            {uuids.map((uuid) => (
              <div
                key={uuid}
                className="uuid-row"
              >
                <span>{uuid}</span>
                <CopyButton value={uuid} />
              </div>
            ))}
          </div>
        </ToolField>
      )}
    </div>
  );
}
