import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-1 rounded-full font-medium";

  // Define size styles
  const sizeStyles = {
    sm: "px-2.5 py-1 text-theme-xs",
    md: "px-3 py-1.5 text-sm",
  };

  // Define color styles for variants - Using semantic theme classes
  const variants = {
    light: {
      primary:
        "app-chip",
      success:
        "border border-success-200/70 bg-success-50 text-success-700 shadow-[0_8px_18px_-14px_rgba(16,185,129,0.28)] dark:bg-success-500/15 dark:text-success-300 dark:border-success-500/20",
      error:
        "border border-error-200/70 bg-error-50 text-error-700 shadow-[0_8px_18px_-14px_rgba(240,68,56,0.28)] dark:bg-error-500/15 dark:text-error-300 dark:border-error-500/20",
      warning:
        "border border-warning-200/70 bg-warning-50 text-warning-700 shadow-[0_8px_18px_-14px_rgba(247,144,9,0.28)] dark:bg-warning-500/15 dark:text-warning-300 dark:border-warning-500/20",
      info: "border border-primary/15 bg-primary-light text-text-brand shadow-[0_8px_18px_-14px_rgba(63,125,207,0.28)] dark:bg-primary/15 dark:text-primary-light dark:border-primary/20",
      light: "app-panel-soft text-text-secondary dark:text-text-secondary",
      dark: "bg-text-primary text-white shadow-[0_10px_22px_-14px_rgba(15,23,38,0.24)] dark:bg-text-primary dark:text-white",
    },
    solid: {
      primary: "bg-primary text-white shadow-[0_12px_24px_-14px_rgba(63,125,207,0.34)]",
      success: "bg-success-500 text-white shadow-[0_12px_24px_-14px_rgba(16,185,129,0.28)] dark:text-white",
      error: "bg-error-500 text-white shadow-[0_12px_24px_-14px_rgba(240,68,56,0.28)] dark:text-white",
      warning: "bg-warning-500 text-white shadow-[0_12px_24px_-14px_rgba(247,144,9,0.3)] dark:text-white",
      info: "bg-primary text-white shadow-[0_12px_24px_-14px_rgba(63,125,207,0.34)] dark:text-white",
      light: "app-panel-soft text-text-primary dark:text-text-primary",
      dark: "bg-text-primary text-white dark:text-white",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
