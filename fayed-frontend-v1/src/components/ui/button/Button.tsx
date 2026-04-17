import React, { ReactNode } from "react";

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline" | "secondary" | "ghost" | "danger";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  ...props
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-2.5 text-sm",
    md: "px-5 py-3 text-sm",
  };

  // Variant Classes - Using semantic theme classes
  const variantClasses = {
    primary:
      "bg-primary text-white shadow-[0_12px_24px_-16px_rgba(63,125,207,0.34)] hover:bg-primary-hover hover:shadow-[0_14px_28px_-18px_rgba(63,125,207,0.4)] disabled:opacity-50",
    outline:
      "border border-border-light bg-white text-text-primary shadow-[0_10px_20px_-16px_rgba(34,52,56,0.08)] hover:border-primary/30 hover:bg-brand-25 dark:bg-surface-secondary dark:text-text-primary dark:hover:bg-surface-tertiary",
    secondary:
      "bg-brand-50 text-text-brand hover:bg-brand-100 dark:bg-primary/15 dark:text-primary-light disabled:opacity-50",
    ghost:
      "bg-transparent text-text-primary hover:bg-primary-light dark:text-text-primary dark:hover:bg-surface-tertiary disabled:opacity-50",
    danger:
      "bg-error-500 text-white shadow-[0_12px_24px_-16px_rgba(240,68,56,0.32)] hover:bg-error-600 disabled:opacity-50",
  };

  return (
    <button
      type={type}
      className={`app-lift inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-colors ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:-translate-y-0.5"
      }`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
