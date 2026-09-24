import ArrowRightIcon from '../../../components/ArrowRightIcon';
import OptionToggle from '../../../components/OptionToggle';
import TimezoneSelect from '../../../components/TimezoneSelect';
import ToolField from '../../../components/ToolField';
import { useTranslation } from '../../../i18n/LanguageContext';
import { translateMessage } from '../../../i18n/translations';
import ToolHeader from '../../../components/ToolHeader';
import {
  formatRelativeTime,
  formatTimestamp,
  formatTimeZoneTime,
  getUnixTimestamp,
  getDefaultTimeZone,
  getTimeZones,
  parseDateString,
  parseTimestamp,
} from '../../../lib/time';
import type { TimestampUnit } from '../../../lib/time';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

const TIME_ZONES = getTimeZones();
const CST_TIME_ZONE = 'Asia/Shanghai';

export default function TimestampTool() {
  const { language, t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.timestamp);
  const { timestamp, unit, dateString, timeZone, error, nowSeconds } = state;
  const parsedDate = parseTimestamp(timestamp, unit);
  const displayTimeZone = getDefaultTimeZone() === timeZone
    || TIME_ZONES.includes(timeZone) ? timeZone : getDefaultTimeZone();
  const unitOptions = [
    { value: 'seconds', label: t('tools.timestamp.seconds') },
    { value: 'milliseconds', label: t('tools.timestamp.milliseconds') },
  ] as const satisfies ReadonlyArray<{ value: TimestampUnit; label: string }>;

  const timestampToDate = () => {
    const date = parseTimestamp(timestamp, unit);

    if (!date) {
      setState((current) => ({ ...current, error: 'Invalid timestamp' }));
      return;
    }

    setState((current) => ({
      ...current,
      dateString: date.toISOString(),
      error: '',
      nowSeconds: getUnixTimestamp(),
    }));
  };

  const dateToTimestamp = () => {
    const date = parseDateString(dateString, displayTimeZone);

    if (!date) {
      setState((current) => ({ ...current, error: 'Invalid date string' }));
      return;
    }

    setState((current) => ({
      ...current,
      timestamp: formatTimestamp(date, current.unit),
      error: '',
      nowSeconds: getUnixTimestamp(),
    }));
  };

  const setNow = () => {
    const now = new Date();

    setState((current) => ({
      ...current,
      timestamp: formatTimestamp(now, current.unit),
      error: '',
      nowSeconds: getUnixTimestamp(now),
    }));
  };

  const localTimeZone = getDefaultTimeZone();
  const localTime = parsedDate ? formatTimeZoneTime(parsedDate, language, localTimeZone) : null;
  const selectedTime = parsedDate
    ? formatTimeZoneTime(parsedDate, language, displayTimeZone)
    : null;
  const cstTime = parsedDate
    ? formatTimeZoneTime(parsedDate, language, CST_TIME_ZONE)
    : null;
  const rows = parsedDate && localTime && cstTime
    ? [
        {
          label: t('tools.timestamp.unixSeconds'),
          value: String(Math.floor(parsedDate.getTime() / 1000)),
        },
        {
          label: t('tools.timestamp.unixMilliseconds'),
          value: String(parsedDate.getTime()),
        },
        { label: 'ISO 8601', value: parsedDate.toISOString() },
        { label: t('tools.timestamp.utc'), value: parsedDate.toUTCString() },
        {
          label: `${t('tools.timestamp.local')} · ${localTimeZone}`,
          value: `${localTime.date} ${localTime.time} · ${localTime.offset}`,
        },
        {
          label: t('tools.timestamp.cst'),
          value: `${cstTime.date} ${cstTime.time} · ${cstTime.offset}`,
        },
        {
          label: t('tools.timestamp.relative'),
          value: formatRelativeTime(parsedDate, new Date(nowSeconds * 1000), language),
        },
      ]
    : [];

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.timestamp.title')}
      />
      <div className="field-grid">
        <div>
          <ToolField
            id="timestamp-input"
            label={t('tools.timestamp.timestampInput')}
          >
            <div className="timestamp-input-group">
              <OptionToggle
                label={t('tools.timestamp.unit')}
                options={unitOptions}
                value={unit}
                onChange={(nextUnit) => setState((current) => ({
                  ...current,
                  unit: nextUnit,
                }))}
              />
              <input
                id="timestamp-input"
                type="text"
                className="code-input"
                value={timestamp}
                onChange={(event) => setState((current) => ({
                  ...current,
                  timestamp: event.target.value,
                }))}
                placeholder="1700000000 / 1700000000000"
              />
            </div>
          </ToolField>
          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              onClick={timestampToDate}
            >
              <ArrowRightIcon />
              {t('tools.timestamp.toDate')}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={setNow}
            >
              {t('tools.timestamp.now')}
            </button>
          </div>
        </div>
        <div>
          <ToolField id="date-input" label={t('tools.timestamp.dateInput')}>
            <input
              id="date-input"
              type="text"
              className="code-input"
              value={dateString}
              onChange={(event) => setState((current) => ({
                ...current,
                dateString: event.target.value,
              }))}
              placeholder="2024-01-15T10:30:00.000Z"
            />
          </ToolField>
          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              onClick={dateToTimestamp}
            >
              <ArrowRightIcon />
              {t('tools.timestamp.toTimestamp')}
            </button>
          </div>
        </div>
        <div className="field-grid-full timestamp-timezone-layout">
          <ToolField id="timestamp-timezone" label={t('tools.timestamp.timezone')}>
            <TimezoneSelect
              id="timestamp-timezone"
              value={displayTimeZone}
              options={TIME_ZONES.includes(displayTimeZone)
                ? TIME_ZONES
                : [displayTimeZone, ...TIME_ZONES]}
              noMatchesText={t('common.noMatches')}
              onChange={(timeZone) => setState((current) => ({
                ...current,
                timeZone,
              }))}
            />
          </ToolField>
          <div className="result-card timestamp-timezone-preview">
            <span>{`${t('tools.timestamp.timezone')} · ${displayTimeZone}`}</span>
            {selectedTime
              ? `${selectedTime.date} ${selectedTime.time} · ${selectedTime.offset}`
              : t('tools.timestamp.invalidTimestamp')}
          </div>
        </div>
      </div>
      {error && (
        <p
          className="status-message status-error"
          role="alert"
        >
          {translateMessage(error, t)}
        </p>
      )}
      {parsedDate && (
        <div className="timestamp-grid">
          {rows.map((row) => (
            <div
              key={row.label}
              className="result-card"
            >
              <span>{row.label}</span>
              {row.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
