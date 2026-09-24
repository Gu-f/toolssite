import CopyButton from '../../../components/CopyButton';
import { useTranslation } from '../../../i18n/LanguageContext';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import { hexToRgb, rgbToHsl } from '../../../lib/color';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

const ALPHA_PERCENT_SCALE = 100;

export default function ColorTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.color);
  const { hex, alpha } = state;
  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(rgb) : null;
  const normalizedHex = `#${hex.replace(/^#/, '').toUpperCase()}`;
  const alphaPercent = Math.round(alpha * ALPHA_PERCENT_SCALE);

  const rows = rgb && hsl
    ? [
        { label: 'HEX', value: normalizedHex, tone: 'cyan' },
        { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, tone: 'green' },
        { label: 'RGBA', value: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`, tone: 'green' },
        { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, tone: 'purple' },
        { label: 'CSS VAR', value: `--color: ${normalizedHex};`, tone: 'orange' },
      ]
    : [];

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.color.title')}
      />
      <div className="color-layout">
        <div>
          <ToolField id="color-hex" label={t('tools.color.input')}>
            <div className="color-inputs">
              <input
                type="color"
                value={rgb ? normalizedHex.toLowerCase() : '#000000'}
                onChange={(event) => setState((current) => ({
                  ...current,
                  hex: event.target.value,
                }))}
                aria-label={t('tools.color.pick')}
              />
              <input
                id="color-hex"
                type="text"
                className="code-input"
                value={hex}
                onChange={(event) => setState((current) => ({
                  ...current,
                  hex: event.target.value,
                }))}
                placeholder="#00d4ff"
              />
            </div>
          </ToolField>
          {rgb && (
            <>
              <div
                className="color-preview"
                role="presentation"
              >
                <div
                  className="color-preview-fill"
                  style={{ backgroundColor: normalizedHex, opacity: alpha }}
                />
              </div>
              <ToolField
                id="color-alpha"
                label={t('tools.color.alpha')}
                extra={<output className="color-alpha-value">{alphaPercent}%</output>}
              >
                <input
                  id="color-alpha"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={alphaPercent}
                  aria-valuetext={`${alphaPercent}%`}
                  onChange={(event) => setState((current) => ({
                    ...current,
                    alpha: Number(event.target.value) / ALPHA_PERCENT_SCALE,
                  }))}
                />
              </ToolField>
            </>
          )}
        </div>
        <div className="color-results">
          {rows.map((row) => (
            <ToolField
              key={row.label}
              id={`color-${row.label.toLowerCase()}`}
              label={row.label}
              overlay={<CopyButton value={row.value} />}
            >
              <output
                id={`color-${row.label.toLowerCase()}`}
                className={`code-area code-area-minimal color-${row.tone}`}
              >
                {row.value}
              </output>
            </ToolField>
          ))}
          {!rgb && (
            <p
              className="status-message status-error"
              role="alert"
            >
              {t('tools.color.invalid')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
