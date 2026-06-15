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
        "border bg-status-success-soft text-status-success border-status-success-border",
      error:
        "border bg-status-danger-soft text-status-danger border-status-danger-border",
      warning:
        "border bg-status-warning-soft text-status-warning border-status-warning-border",
      info: "border bg-status-info-soft text-status-info border-status-info-border",
      light: "border bg-surface-tertiary text-text-secondary border-border-light",
      dark: "bg-text-primary text-white shadow-[0_10px_22px_-14px_rgba(15,23,38,0.24)] dark:bg-text-primary dark:text-white",
    },
    solid: {
      primary: "bg-primary text-white shadow-[0_12px_24px_-14px_rgba(68,161,148,0.34)]",
      success: "bg-status-success text-white dark:text-white",
      error: "bg-status-danger text-white dark:text-white",
      warning: "bg-status-warning text-white dark:text-white",
      info: "bg-status-info text-white dark:text-white",
      light: "border bg-surface-tertiary text-text-primary border-border-light",
      dark: "bg-text-primary text-white dark:text-white",
    },
  };
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
