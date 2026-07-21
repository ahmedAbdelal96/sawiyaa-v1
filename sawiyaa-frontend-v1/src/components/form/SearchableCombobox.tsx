"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Search } from "lucide-react";

export type SearchableComboboxOption = {
  value: string;
  label: string;
  description?: string | null;
  searchText?: string | null;
};

export function filterSearchableComboboxOptions(
  options: SearchableComboboxOption[],
  search: string,
) {
  const query = search.trim().toLowerCase();
  if (!query) return options;

  return options.filter((option) => {
    const searchableText = [option.label, option.value, option.description ?? "", option.searchText ?? ""]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(query);
  });
}

interface SearchableComboboxProps {
  options: SearchableComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
  className?: string;
  clearable?: boolean;
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  disabled = false,
  error = false,
  hint,
  className = "",
  clearable = false,
}: SearchableComboboxProps) {
  const listboxId = useId();
  const labelId = useId();
  const hintId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    return filterSearchableComboboxOptions(options, search);
  }, [options, search]);

  const activeOption = filteredOptions[activeIndex] ?? null;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
      setSearch("");
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.focus();
  }, [isOpen]);

  const openCombobox = () => {
    if (disabled) return;
    setIsOpen(true);
    setActiveIndex(Math.max(filteredOptions.findIndex((option) => option.value === value), 0));
  };

  const closeCombobox = () => {
    setIsOpen(false);
    setSearch("");
  };

  const clearSelection = () => {
    onChange("");
    closeCombobox();
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    closeCombobox();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCombobox();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(filteredOptions.length, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + filteredOptions.length) % Math.max(filteredOptions.length, 1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(filteredOptions.length - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      if (activeOption) {
        event.preventDefault();
        handleSelect(activeOption.value);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCombobox();
    }
  };

  const inputValue = isOpen ? search : selectedOption?.label ?? "";

  return (
    <div ref={containerRef} className={`space-y-1.5 ${className}`.trim()}>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              closeCombobox();
            } else {
              openCombobox();
            }
          }}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={hint ? hintId : undefined}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`app-control flex h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-start ${error ? "border-error-500" : ""} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <span className={selectedOption ? "text-text-primary" : "text-text-muted"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {clearable && selectedOption && !disabled ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={clearSelection}
            className="absolute end-9 top-1/2 z-10 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-secondary hover:text-text-primary"
          >
            ×
          </button>
        ) : null}

        {isOpen && !disabled ? (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-border-light bg-white shadow-[0_18px_40px_-24px_rgba(25,52,57,0.18)] dark:border-border-light dark:bg-surface-secondary dark:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]">
            <div className="border-b border-border-light/60 p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={isOpen}
                  aria-controls={listboxId}
                  aria-activedescendant={activeOption ? `${listboxId}-option-${activeIndex}` : undefined}
                  value={inputValue}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setActiveIndex(0);
                    setIsOpen(true);
                  }}
                  onFocus={openCombobox}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="app-control h-9 w-full ps-9 pe-3 text-sm"
                />
              </label>
            </div>

            <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-text-muted">{emptyMessage}</li>
              ) : (
                filteredOptions.map((option, index) => {
                  const isActive = index === activeIndex;
                  const isSelected = option.value === value;

                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        id={`${listboxId}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelect(option.value)}
                        className={`flex w-full items-start justify-between gap-3 px-4 py-2.5 text-start text-sm outline-none transition-colors ${isActive ? "bg-primary-light/35" : "hover:bg-surface-secondary/70"}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block ${isSelected ? "font-semibold text-text-primary" : "text-text-primary"}`}>
                            {option.label}
                          </span>
                          {option.description ? (
                            <span className="mt-0.5 block text-xs text-text-muted">{option.description}</span>
                          ) : null}
                        </span>
                        {isSelected ? <span className="mt-0.5 text-primary">✓</span> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>

      <span id={labelId} className="sr-only">
        {placeholder}
      </span>
      {hint ? (
        <p id={hintId} className={`text-xs ${error ? "text-error-500" : "text-text-secondary"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
