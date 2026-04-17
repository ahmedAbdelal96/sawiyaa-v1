import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;
import Options = flatpickr.Options.Options;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  options?: Options;
  className?: string;
  error?: string;
  required?: boolean;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  options,
  className,
  error,
  required,
}: PropsType) {
  const fp = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    const flatPickrInstance = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
      ...options,
    });

    fp.current = flatPickrInstance as flatpickr.Instance;

    return () => {
      // flatPickrInstance.destroy(); // Destroying might cause issues with strict mode double invocation, but safer to keep if handled correctly
      // For now, let's trust the cleanup
       if (fp.current) {
        fp.current.destroy();
        fp.current = null;
      }
    };
  }, [mode, onChange, id, defaultDate, options]);

  // Update date if defaultDate changes dynamically
  useEffect(() => {
      if (fp.current && defaultDate) {
          fp.current.setDate(defaultDate, false);
      }
  }, [defaultDate]);

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id}>
          {label} {required && <span className="text-error-600">*</span>}
        </Label>
      )}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border appearance-none bg-surface-secondary px-4 py-2.5 text-sm text-text-primary shadow-theme-xs placeholder:text-text-muted focus:outline-hidden focus:ring-3 focus:ring-primary/20 dark:border-border-light dark:bg-surface-secondary dark:text-text-primary ${
            error
              ? "border-error-500 focus:border-error-500"
              : "border-border-light focus:border-border-focus"
          }`}
        />

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
          <CalenderIcon className="size-6" />
        </span>
      </div>
       {error && <p className="mt-1 text-sm text-error-500">{error}</p>}
    </div>
  );
}
