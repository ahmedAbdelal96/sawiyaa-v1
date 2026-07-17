"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthPasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const AuthPasswordField = forwardRef<HTMLInputElement, AuthPasswordFieldProps>(
  ({ className = "", disabled = false, error = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    let inputClasses = `app-control bg-surface-tertiary dark:bg-surface-tertiary focus:ring-ring-focus focus:border-border-focus h-11 w-full appearance-none pl-4 pr-12 py-2.5 ${className}`;

    if (disabled) {
      inputClasses += ` cursor-not-allowed bg-surface-tertiary text-text-muted dark:bg-surface-tertiary dark:text-text-muted`;
    } else if (error) {
      inputClasses += ` border-status-danger text-status-danger focus:ring-status-danger/10`;
    }

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          className={inputClasses}
          dir="ltr"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3.5 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary transition hover:bg-surface-secondary/50 dark:hover:bg-white/5 active:scale-95"
          disabled={disabled}
        >
          {showPassword ? (
            <Eye className="h-4.5 w-4.5 shrink-0" />
          ) : (
            <EyeOff className="h-4.5 w-4.5 shrink-0" />
          )}
        </button>
      </div>
    );
  }
);

AuthPasswordField.displayName = "AuthPasswordField";

export default AuthPasswordField;
