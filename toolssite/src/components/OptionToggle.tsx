type Option<T extends string> = {
  readonly value: T;
  readonly label: string;
};

type OptionToggleProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

function OptionToggle<T extends string>({ label, options, value, onChange }: OptionToggleProps<T>) {
  return (
    <div
      className="option-toggle"
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            className={`option-toggle-item${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default OptionToggle;
