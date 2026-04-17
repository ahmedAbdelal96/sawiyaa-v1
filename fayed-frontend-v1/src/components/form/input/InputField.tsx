import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      className = "",
      disabled = false,
      success = false,
      error = false,
      hint,
      ...props
    },
    ref
  ) => {
    // Determine input styles based on state (disabled, success, error)
    let inputClasses = `app-control h-11 w-full appearance-none px-4 py-2.5 ${className}`;

    // Add styles for the different states
    if (disabled) {
      inputClasses += ` cursor-not-allowed bg-surface-tertiary text-text-muted dark:bg-surface-tertiary dark:text-text-muted`;
    } else if (error) {
      inputClasses += ` border-error-500 text-error-800 focus:ring-error-500/10 dark:border-error-500 dark:text-error-400`;
    } else if (success) {
      inputClasses += ` border-success-400 text-success-600 focus:border-success-300 focus:ring-success-500/10 dark:border-success-500 dark:text-success-400`;
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />

        {/* Optional Hint Text */}
        {hint && (
          <p
            className={`mt-1.5 text-xs ${
              error
                ? "text-error-500"
                : success
                  ? "text-success-500"
                  : "text-text-secondary"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
