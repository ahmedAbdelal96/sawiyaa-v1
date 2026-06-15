"use client";

/**
 * DateField — Flatpickr-backed date input for react-hook-form.
 *
 * Usage with react-hook-form Controller:
 *
 *   <Controller
 *     control={control}
 *     name="dateOfBirth"
 *     render={({ field }) => (
 *       <DateField
 *         label={t("fields.dateOfBirth.label")}
 *         placeholder={t("fields.dateOfBirth.placeholder")}
 *         value={field.value ?? ""}
 *         onChange={field.onChange}
 *         error={errors.dateOfBirth?.message}
 *       />
 *     )}
 *   />
 *
 * Outputs YYYY-MM-DD strings — safe for direct API submission.
 * Supports label, error, disabled, RTL/LTR via logical CSS.
 */

import { useEffect, useId, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useLocale } from "next-intl";
import { CalendarDays } from "lucide-react";
import Label from "../Label";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateFieldProps = {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DateField({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  id: externalId,
}: DateFieldProps) {
  const locale = useLocale();
  const autoId = useId();
  const inputId = externalId ?? autoId;

  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  // Track last value set by flatpickr to avoid re-triggering onChange
  const lastFpValueRef = useRef<string>("");

  useEffect(() => {
    if (!inputRef.current) return;

    const initFlatpickr = async () => {
      const input = inputRef.current;
      if (!input) return;

      // Load Arabic locale on demand
      let fpLocale: flatpickr.Options.Options["locale"] | undefined;
      if (locale === "ar") {
        try {
          const { Arabic } = await import("flatpickr/dist/l10n/ar.js");
          fpLocale = Arabic;
        } catch {
          // fallback: no locale override
        }
      }

      fpRef.current = flatpickr(input, {
        mode: "single",
        dateFormat: "Y-m-d",
        static: true,
        monthSelectorType: "static",
        disableMobile: false,
        ...(fpLocale ? { locale: fpLocale } : {}),
        onChange: (selectedDates, dateStr) => {
          lastFpValueRef.current = dateStr;
          onChange(dateStr);
        },
        onReady: (_dates, dateStr) => {
          lastFpValueRef.current = dateStr;
        },
      });

      // Set initial value
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
  }, [locale]); // Re-init only when locale changes

  // Sync controlled value changes into flatpickr
  useEffect(() => {
    if (!fpRef.current) return;
    if (value === lastFpValueRef.current) return;
    lastFpValueRef.current = value ?? "";
    fpRef.current.setDate(value ?? "", false);
  }, [value]);

  const inputClasses = [
    "h-11 w-full rounded-xl border appearance-none bg-surface-tertiary dark:bg-surface-tertiary px-4 pe-10 py-2.5 text-sm",
    "shadow-theme-xs placeholder:text-text-muted",
    "focus:outline-hidden focus:ring-3",
    disabled
      ? "cursor-not-allowed border-border-light bg-surface-tertiary text-text-muted dark:border-border-light dark:bg-surface-tertiary dark:text-text-muted"
      : error
        ? "border-status-danger text-status-danger focus:ring-3 focus:ring-status-danger/10"
        : "border-border-light text-text-primary focus:border-border-focus focus:ring-3 focus:ring-ring-focus",
  ].join(" ");

  return (
    <div>
      {label && <Label htmlFor={inputId}>{label}</Label>}
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
          <CalendarDays className="size-5" />
        </span>
      </div>
      {error && <p className="mt-1.5 text-xs text-status-danger">{error}</p>}
    </div>
  );
}
