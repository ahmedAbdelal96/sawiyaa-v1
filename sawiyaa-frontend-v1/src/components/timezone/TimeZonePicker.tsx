"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import Input from "@/components/form/input/InputField";
import {
  buildTimeZoneOptions,
  getTimeZoneSnapshot,
  type TimeZoneLocale,
} from "@/features/timezone/timezone-options";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  detectedTimeZone?: string | null;
};

export function TimeZonePicker({
  id,
  value,
  onChange,
  label,
  placeholder,
  disabled,
  error,
  helperText,
  detectedTimeZone,
}: Props) {
  const locale = useLocale() as TimeZoneLocale;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const browserTimeZone =
    typeof Intl === "undefined"
      ? null
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const preferredDetectedTimeZone = detectedTimeZone ?? browserTimeZone;
  const options = useMemo(
    () =>
      buildTimeZoneOptions({
        locale,
        selectedTimeZone: value,
        detectedTimeZone: preferredDetectedTimeZone,
        query: deferredQuery,
      }),
    [deferredQuery, locale, preferredDetectedTimeZone, value],
  );
  const selected = useMemo(
    () =>
      buildTimeZoneOptions({ locale, selectedTimeZone: value }).find(
        (option) => option.value === value,
      ),
    [locale, value],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setQuery("");
    setOpen(false);
  };

  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(options.length - 1, 0),
  );

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <label
          htmlFor={id}
          className="text-text-secondary mb-2 block text-sm font-medium"
        >
          {label}
        </label>
      ) : null}
      {open ? (
        <Input
          id={id}
          role="combobox"
          aria-controls={`${id}-options`}
          aria-expanded="true"
          aria-autocomplete="list"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) =>
                Math.min(index + 1, Math.max(options.length - 1, 0)),
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && options[safeActiveIndex])
              selectOption(options[safeActiveIndex].value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          error={error}
        />
      ) : (
        <button
          id={id}
          type="button"
          role="combobox"
          aria-controls={`${id}-options`}
          aria-expanded="false"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`app-control flex h-11 w-full items-center justify-between px-4 py-2.5 text-start text-sm ${error ? "border-status-danger" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <span className={selected ? "text-text-primary" : "text-text-muted"}>
            {selected?.label ?? placeholder}
          </span>
          <span aria-hidden="true" className="text-text-muted">
            ⌄
          </span>
        </button>
      )}
      {helperText ? (
        <p className="text-text-secondary mt-1.5 text-xs">{helperText}</p>
      ) : null}
      {open ? (
        <div
          id={`${id}-options`}
          role="listbox"
          className="border-border-light absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border bg-white p-1 shadow-xl dark:bg-gray-900"
        >
          {options.length === 0 ? (
            <p className="text-text-secondary px-3 py-4 text-sm">
              {locale === "ar"
                ? "لا توجد مناطق زمنية مطابقة"
                : "No matching timezones"}
            </p>
          ) : null}
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              data-active={index === safeActiveIndex ? "true" : undefined}
              onClick={() => selectOption(option.value)}
              className={`hover:bg-surface-tertiary block w-full rounded-lg px-3 py-2 text-start text-sm ${option.value === value ? "bg-surface-tertiary" : ""}`}
            >
              <span className="text-text-primary block font-medium">
                {option.label}
              </span>
              <span className="text-text-muted block text-xs">
                {option.value}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {selected ? (
        <p className="text-text-muted mt-1 text-xs">
          {getTimeZoneSnapshot(selected.value, locale) ?? ""}
        </p>
      ) : null}
    </div>
  );
}

export default TimeZonePicker;
