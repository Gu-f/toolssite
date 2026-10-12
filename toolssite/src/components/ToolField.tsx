import type { ReactNode } from 'react';

type ToolFieldProps = {
  id: string;
  label: string;
  extra?: ReactNode;
  /** Compact actions rendered inside the control and revealed on hover. */
  overlay?: ReactNode;
  /**
   * Most controls are labelable. Panel output uses a visible title with
   * `aria-labelledby` instead of an invalid `label[for]` association.
   */
  labelTarget?: 'control' | 'panel';
  className?: string;
  children: ReactNode;
};

export default function ToolField({
  id,
  label,
  extra,
  overlay,
  labelTarget = 'control',
  className,
  children,
}: ToolFieldProps) {
  return (
    <div className={className ? `field ${className}` : 'field'}>
      <div className="field-header">
        {labelTarget === 'control' ? (
          <label
            className="field-label"
            htmlFor={id}
          >
            {label}
          </label>
        ) : (
          <span
            className="field-label"
            id={id}
          >
            {label}
          </span>
        )}
        {extra}
      </div>
      <div className={`field-control${overlay ? ' has-overlay' : ''}`}>
        {children}
        {overlay ? (
          <div className="field-overlay">
            {overlay}
          </div>
        ) : null}
      </div>
    </div>
  );
}
