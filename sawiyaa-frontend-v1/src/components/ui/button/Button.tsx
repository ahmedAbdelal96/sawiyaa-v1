import React, { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "secondary" | "ghost" | "danger";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
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
  loading = false,
  type = "button",
  ...props
}) => {
  // Size Classes
  const sizeClasses = {
    xs: "px-3 py-1 text-xs font-semibold gap-1.5 h-8 min-h-[32px]",
    sm: "px-3.5 py-1.5 text-xs font-semibold gap-1.5 h-9 min-h-[36px]",
    md: "px-4 py-2 text-xs md:text-sm font-semibold gap-2 h-10 min-h-[40px]",
    lg: "px-5 py-2.5 text-sm font-semibold gap-2 h-11 min-h-[44px]",
  };

  // Variant Classes - Sawiyaa Design System
  const variantClasses = {
    primary:
      "bg-primary text-white border border-transparent shadow-xs hover:bg-primary-hover active:bg-primary-active focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-primary dark:text-white dark:hover:bg-primary-hover",
    outline:
      "border border-border-light bg-white text-text-primary shadow-xs hover:border-primary/50 hover:bg-primary-light/40 hover:text-text-brand dark:bg-slate-800 dark:border-white/10 dark:text-white dark:hover:bg-slate-800",
    secondary:
      "border border-border-light bg-surface-secondary text-text-primary shadow-xs hover:border-primary/40 hover:bg-surface-tertiary dark:bg-slate-800 dark:border-white/10 dark:text-white",
    ghost:
      "bg-transparent text-text-secondary hover:bg-primary-light/30 hover:text-text-brand dark:hover:bg-white/5 dark:hover:text-white",
    danger:
      "bg-status-danger text-white border border-transparent shadow-xs hover:bg-status-danger/90 active:bg-status-danger/95 focus-visible:ring-2 focus-visible:ring-status-danger/30",
  };

  const isBtnDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 select-none outline-none focus-visible:outline-none",
        sizeClasses[size],
        isBtnDisabled
          ? "bg-surface-tertiary/70 text-text-muted/60 border border-border-light/60 opacity-60 cursor-not-allowed shadow-none"
          : cn(variantClasses[variant], "active:scale-[0.98] cursor-pointer"),
        className
      )}
      onClick={onClick}
      disabled={isBtnDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : startIcon ? (
        <span className="flex items-center shrink-0">{startIcon}</span>
      ) : null}
      {children ? <span>{children}</span> : null}
      {!loading && endIcon ? <span className="flex items-center shrink-0">{endIcon}</span> : null}
    </button>
  );
};

export default Button;
