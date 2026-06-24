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
    let inputClasses = `app-control bg-surface-tertiary dark:bg-surface-tertiary focus:ring-ring-focus focus:border-border-focus h-11 w-full appearance-none px-4 py-2.5 ${className}`;

    // Add styles for the different states
    if (disabled) {
      inputClasses += ` cursor-not-allowed bg-surface-tertiary text-text-muted dark:bg-surface-tertiary dark:text-text-muted`;
    } else if (error) {
      inputClasses += ` border-status-danger text-status-danger focus:ring-status-danger/10`;
    } else if (success) {
      inputClasses += ` border-status-success text-status-success focus:ring-status-success/10`;
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
                ? "text-status-danger"
                : success
                  ? "text-status-success"
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
