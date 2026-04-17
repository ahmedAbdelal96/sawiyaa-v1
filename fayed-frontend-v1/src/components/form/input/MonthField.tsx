"use client";

import { useEffect, useId, useRef } from "react";
import flatpickr from "flatpickr";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { useLocale } from "next-intl";
import { CalenderIcon } from "@/icons";
import Label from "../Label";

type MonthFieldProps = {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
};

export default function MonthField({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  id: externalId,
}: MonthFieldProps) {
  const locale = useLocale();
  const autoId = useId();
  const inputId = externalId ?? autoId;

  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const lastFpValueRef = useRef<string>("");

  useEffect(() => {
    if (!inputRef.current) return;

    const initFlatpickr = async () => {
      const input = inputRef.current;
      if (!input) return;

      let fpLocale: flatpickr.Options.Options["locale"] | undefined;
      if (locale.startsWith("ar")) {
        try {
          const { Arabic } = await import("flatpickr/dist/l10n/ar.js");
          fpLocale = Arabic;
        } catch {
          fpLocale = undefined;
        }
      }

      fpRef.current = flatpickr(input, {
        mode: "single",
        dateFormat: "Y-m",
        static: true,
        disableMobile: false,
        monthSelectorType: "static",
        ...(fpLocale ? { locale: fpLocale } : {}),
        plugins: [
          monthSelectPlugin({
            shorthand: true,
            dateFormat: "Y-m",
            altFormat: "F Y",
          }),
        ],
        onChange: (_selectedDates, dateStr) => {
          lastFpValueRef.current = dateStr;
          onChange(dateStr);
        },
        onReady: (_selectedDates, dateStr) => {
          lastFpValueRef.current = dateStr;
        },
      });

      if (value) {
        fpRef.current.setDate(value, false);
      }
    };

    initFlatpickr();

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (!fpRef.current) return;
    if ((value ?? "") === lastFpValueRef.current) return;
    lastFpValueRef.current = value ?? "";
    fpRef.current.setDate(value ?? "", false);
  }, [value]);

  const inputClasses = [
    "h-11 w-full rounded-xl border appearance-none bg-surface-secondary px-4 pe-10 py-2.5 text-sm",
    "shadow-theme-xs placeholder:text-text-muted",
    "focus:outline-hidden focus:ring-3",
    disabled
      ? "cursor-not-allowed border-border-light bg-surface-tertiary text-text-muted dark:border-border-light dark:bg-surface-tertiary dark:text-text-muted"
      : error
        ? "border-error-500 text-error-800 focus:ring-3 focus:ring-error-500/10 dark:border-error-500 dark:text-error-400"
        : "border-border-light text-text-primary focus:border-border-focus focus:ring-3 focus:ring-primary/10 dark:border-border-light dark:bg-surface-secondary dark:text-text-primary",
  ].join(" ");

  return (
    <div className="w-full">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          readOnly
          disabled={disabled}
          placeholder={placeholder}
          className={inputClasses}
        />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-secondary">
          <CalenderIcon className="size-5" />
        </span>
      </div>
      {error ? <p className="mt-1.5 text-xs text-error-500">{error}</p> : null}
    </div>
  );
}
