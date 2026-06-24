import React, { ReactNode } from "react";

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline" | "secondary" | "ghost" | "danger";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  "data-testid"?: string;
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
      "bg-primary text-white shadow-[0_12px_24px_-16px_rgba(68,161,148,0.34)] hover:bg-primary-hover hover:shadow-[0_14px_28px_-18px_rgba(68,161,148,0.4)]",
    outline:
      "border border-border-light bg-surface-secondary text-text-primary hover:bg-surface-tertiary",
    secondary:
      "border border-border-light bg-surface-secondary text-text-primary hover:bg-surface-tertiary",
    ghost:
      "bg-transparent text-text-primary hover:bg-surface-tertiary",
    danger:
      "bg-error-500 text-white shadow-[0_12px_24px_-16px_rgba(240,68,56,0.32)] hover:bg-error-600",
  };

  return (
    <button
      type={type}
      className={`app-lift inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-colors ${className} ${
        sizeClasses[size]
      } ${
        disabled
          ? "bg-surface-tertiary/60 text-text-muted border border-border-light opacity-60 cursor-not-allowed"
          : `${variantClasses[variant]} hover:-translate-y-0.5`
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
