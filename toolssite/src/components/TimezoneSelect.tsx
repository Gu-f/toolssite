import { useState } from 'react';
import type { KeyboardEvent } from 'react';

type TimezoneSelectProps = {
  id: string;
  value: string;
  options: readonly string[];
  noMatchesText: string;
  onChange: (value: string) => void;
};

const MAX_VISIBLE_OPTIONS = 80;

/** Searchable ARIA combobox for the large IANA time-zone list. */
export default function TimezoneSelect({
  id,
  value,
  options,
  noMatchesText,
  onChange,
}: TimezoneSelectProps) {
  const [search, setSearch] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = (search ?? '').trim().toLowerCase();
  const filteredOptions = query
    ? options.filter((option) => option.toLowerCase().includes(query))
    : options;
  const visibleOptions = filteredOptions.slice(0, MAX_VISIBLE_OPTIONS);
  const activeOptionId =
    isOpen && visibleOptions[activeIndex]
      ? `${id}-option-${activeIndex}`
      : undefined;
  const listboxId = `${id}-listbox`;

  const open = () => {
    setIsOpen(true);
    setActiveIndex(Math.max(0, visibleOptions.indexOf(value)));
  };

  const close = () => {
    setIsOpen(false);
    setSearch(null);
    setActiveIndex(0);
  };

  const selectOption = (option: string) => {
    onChange(option);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = visibleOptions.length;

    if (event.key === 'Escape') {
      close();
      return;
    }

    if (!count) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => {
        if (!isOpen) {
          return 0;
        }

        const direction = event.key === 'ArrowDown' ? 1 : -1;
        return (current + direction + count) % count;
      });
      return;
    }

    if (event.key === 'Enter' && isOpen) {
      const option = visibleOptions[activeIndex];

      if (option) {
        event.preventDefault();
        selectOption(option);
      }
    }
  };

  return (
    <div className="timezone-select">
      <input
        id={id}
        type="text"
        className="code-input timestamp-timezone-input"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        value={search ?? value}
        onChange={(event) => {
          setSearch(event.target.value);
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onFocus={open}
        onClick={open}
        onBlur={close}
        onKeyDown={handleKeyDown}
      />
      <svg
        className="timezone-select-chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
      {isOpen && (
        visibleOptions.length > 0 ? (
          <ul
            id={listboxId}
            className="timezone-select-list"
            role="listbox"
          >
            {visibleOptions.map((option, index) => (
              <li
                key={option}
                id={`${id}-option-${index}`}
                className={`timezone-select-option${index === activeIndex ? ' is-active' : ''}`}
                role="option"
                aria-selected={option === value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option}
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="timezone-select-list timezone-select-empty"
            role="status"
          >
            {noMatchesText}
          </div>
        )
      )}
    </div>
  );
}
