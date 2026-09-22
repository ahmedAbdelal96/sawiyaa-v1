import React, { useMemo, useState } from "react";

interface Option {
  value: string;
  text: string;
  selected?: boolean;
}

interface MultiSelectProps {
  label?: string;
  options: Option[];
  placeholder?: string;
  defaultSelected?: string[];
  value?: string[];
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
}

const EMPTY_ARRAY: string[] = [];

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  placeholder = "Select option",
  defaultSelected = EMPTY_ARRAY,
  value,
  onChange,
  disabled = false,
  error = false,
  hint,
}) => {
  const [internalSelected, setInternalSelected] = useState<string[]>(() => {
    if (value !== undefined) return value;
    if (defaultSelected.length > 0) return defaultSelected;
    return options.filter((o) => o.selected).map((o) => o.value);
  });
  const [isOpen, setIsOpen] = useState(false);

  // If `value` prop is provided, treat as controlled, otherwise fallback to internal selection or derived from options
  const activeSelected = useMemo(() => {
    if (value !== undefined) return value;
    if (defaultSelected.length > 0) return internalSelected;
    // Check if any option has explicit `selected: true`
    const optionsWithSelected = options.filter((o) => o.selected).map((o) => o.value);
    if (optionsWithSelected.length > 0 && internalSelected.length === 0) {
      return optionsWithSelected;
    }
    return internalSelected;
  }, [value, defaultSelected, internalSelected, options]);

  const selectedItems = useMemo(
    () =>
      activeSelected
        .map((val) => options.find((option) => option.value === val))
        .filter((option): option is Option => Boolean(option)),
    [options, activeSelected]
  );

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    const nextSelected = activeSelected.includes(optionValue)
      ? activeSelected.filter((val) => val !== optionValue)
      : [...activeSelected, optionValue];

    setInternalSelected(nextSelected);
    onChange?.(nextSelected);
  };

  const removeOption = (val: string) => {
    if (disabled) return;
    const nextSelected = activeSelected.filter((option) => option !== val);
    setInternalSelected(nextSelected);
    onChange?.(nextSelected);
  };

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1 block text-xs font-bold text-text-secondary">
          {label}
        </label>
      ) : null}

      <div className="relative z-20 w-full">
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          className={`app-control flex min-h-10 w-full items-center gap-2 rounded-xl border bg-[#FCFAF6] px-3 py-2 text-start transition-colors dark:bg-white/5 dark:border-white/10 ${
            error
              ? "border-status-danger focus-visible:border-status-danger"
              : "border-border-light/80 focus-visible:border-[#24564F]"
          } ${
            disabled
              ? "cursor-not-allowed border-border-light bg-[#FCFAF6]/60 text-text-muted opacity-60"
              : "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#24564F]/20"
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <span
                  key={item.value}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF4EF] border border-[#24564F]/15 px-2 py-0.5 text-xs font-semibold text-[#24564F] dark:bg-white/10 dark:text-[#A7BFAE]"
                >
                  <span className="truncate max-w-[120px]">{item.text}</span>
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
                    className={disabled ? "text-text-muted" : "cursor-pointer hover:opacity-75"}
                  >
                    ×
                  </span>
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">{placeholder}</span>
            )}
          </div>

          <span
            className={`shrink-0 text-text-muted transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <svg
              className="stroke-current"
              width="16"
              height="16"
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
          <p className={`mt-1 text-xs ${error ? "text-status-danger" : "text-text-secondary"}`}>
            {hint}
          </p>
        ) : null}

        {isOpen ? (
          <div className="absolute start-0 top-full z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border-light bg-white shadow-md dark:bg-surface-secondary dark:border-white/10">
            <div className="flex flex-col p-1">
              {options.map((option) => {
                const checked = activeSelected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-start text-xs transition-colors ${
                      checked
                        ? "bg-[#EEF4EF] font-bold text-[#24564F] dark:bg-white/10 dark:text-[#A7BFAE]"
                        : "text-[#1C2F2B] hover:bg-[#FCFAF6] dark:text-white/80 dark:hover:bg-white/5"
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
