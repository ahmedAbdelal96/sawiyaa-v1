import React, { useEffect, useMemo, useState } from "react";

interface Option {
  value: string;
  text: string;
  selected: boolean;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  placeholder?: string;
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  placeholder = "Select option",
  defaultSelected = [],
  onChange,
  disabled = false,
  error = false,
  hint,
}) => {
  const [selectedOptions, setSelectedOptions] =
    useState<string[]>(defaultSelected);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedOptions(defaultSelected);
  }, [defaultSelected]);

  const selectedItems = useMemo(
    () =>
      selectedOptions
        .map((value) => options.find((option) => option.value === value))
        .filter((option): option is Option => Boolean(option)),
    [options, selectedOptions]
  );

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    const nextSelected = selectedOptions.includes(optionValue)
      ? selectedOptions.filter((value) => value !== optionValue)
      : [...selectedOptions, optionValue];

    setSelectedOptions(nextSelected);
    onChange?.(nextSelected);
  };

  const removeOption = (value: string) => {
    if (disabled) return;
    const nextSelected = selectedOptions.filter((option) => option !== value);
    setSelectedOptions(nextSelected);
    onChange?.(nextSelected);
  };

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}

      <div className="relative z-20 w-full">
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          className={`app-control flex min-h-11 w-full items-center gap-2 rounded-xl border bg-surface-tertiary px-3 py-2 text-start transition-colors ${
            error
              ? "border-status-danger focus-visible:border-status-danger"
              : "border-border-light focus-visible:border-border-focus"
          } ${
            disabled
              ? "cursor-not-allowed border-border-light bg-surface-tertiary/60 text-text-muted opacity-60"
              : "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring-focus"
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <span
                  key={item.value}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-light px-2.5 py-1 text-sm text-text-brand"
                >
                  <span className="truncate">{item.text}</span>
                  <span
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeOption(item.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        removeOption(item.value);
                      }
                    }}
                    className={disabled ? "text-text-muted" : "cursor-pointer"}
                  >
                    ×
                  </span>
                </span>
              ))
            ) : (
              <span className="text-sm text-text-muted">{placeholder}</span>
            )}
          </div>

          <span
            className={`shrink-0 text-text-muted transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        {hint ? (
          <p className={`mt-1.5 text-xs ${error ? "text-status-danger" : "text-text-secondary"}`}>
            {hint}
          </p>
        ) : null}

        {isOpen ? (
          <div className="absolute start-0 top-full z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-border-light bg-surface-secondary shadow-theme-sm">
            <div className="flex flex-col p-1.5">
              {options.map((option) => {
                const checked = selectedOptions.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                      checked
                        ? "bg-primary-light text-text-brand"
                        : "text-text-primary hover:bg-surface-tertiary"
                    }`}
                  >
                    <span>{option.text}</span>
                    {checked ? <span>✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MultiSelect;
