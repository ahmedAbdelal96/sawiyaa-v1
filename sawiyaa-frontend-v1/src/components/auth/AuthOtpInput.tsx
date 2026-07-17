"use client";

import React, { useRef, useEffect } from "react";
import { useLocale } from "next-intl";

interface AuthOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export default function AuthOtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  error,
  autoFocus = true,
}: AuthOtpInputProps) {
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Split value into characters array
  const valueArray = value.split("");

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      // Small timeout to ensure it runs cleanly after mount
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const currentValue = valueArray[index] || "";
      if (currentValue === "") {
        if (index > 0) {
          // Focus previous box and clear its content
          const prevInput = inputRefs.current[index - 1];
          if (prevInput) {
            prevInput.focus();
            const newArray = [...valueArray];
            newArray[index - 1] = "";
            onChange(newArray.join(""));
          }
        }
      } else {
        // Just clear current box value
        const newArray = [...valueArray];
        newArray[index] = "";
        onChange(newArray.join(""));
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === "ArrowRight") {
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        e.preventDefault();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    const lastChar = val.slice(-1);

    if (lastChar === "" || /^[0-9]$/.test(lastChar)) {
      const newArray = [...valueArray];
      // Pad array if current value length is shorter than index
      for (let i = 0; i < length; i++) {
        if (newArray[i] === undefined) {
          newArray[i] = "";
        }
      }
      newArray[index] = lastChar;
      const newValue = newArray.join("");
      onChange(newValue);

      // Auto-advance if a digit was typed
      if (lastChar !== "" && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const cleanedData = pastedData.replace(/[^0-9]/g, "").slice(0, length);
    if (cleanedData) {
      onChange(cleanedData);
      const focusIndex = Math.min(cleanedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const baseClasses =
    "rounded-xl border bg-surface-tertiary text-center text-lg font-bold transition-all duration-200 outline-hidden focus:ring-3 focus:ring-primary/10";

  return (
    <div className="flex flex-col items-center select-none">
      {/* Container forced LTR for left-to-right digit sequence */}
      <div
        className="flex justify-center gap-2 sm:gap-2.5"
        dir="ltr"
        role="group"
        aria-label={isRtl ? "رمز التحقق الثنائي" : "Verification code input"}
      >
        {Array.from({ length }).map((_, index) => {
          const char = valueArray[index] || "";
          
          let inputClasses = `${baseClasses} w-11 h-11 sm:w-12 sm:h-12`;
          if (disabled) {
            inputClasses += " cursor-not-allowed opacity-50 text-text-muted bg-surface-tertiary/50";
          } else if (error) {
            inputClasses += " border-status-danger text-status-danger focus:border-status-danger focus:ring-status-danger/10";
          } else {
            inputClasses += " border-border-light text-text-primary focus:border-border-focus dark:border-white/10 dark:text-white";
          }

          const ariaLabel = isRtl
            ? `الرقم ${index + 1} من رمز التحقق`
            : `Digit ${index + 1} of verification code`;

          return (
            <input
              key={index}
              ref={(el) => {
                if (el) {
                  inputRefs.current[index] = el;
                }
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={char}
              onChange={(e) => handleInputChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              disabled={disabled}
              className={inputClasses}
              maxLength={1}
              autoComplete="one-time-code"
              aria-label={ariaLabel}
              aria-invalid={!!error}
            />
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-xs text-status-danger text-center w-full">
          {error}
        </p>
      )}
    </div>
  );
}
