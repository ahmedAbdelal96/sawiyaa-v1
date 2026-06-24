"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DataTableActionButtonProps = {
  label: string;
  icon?: ReactNode;
  intent?: "primary" | "outline";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export default function DataTableActionButton({
  label,
  icon,
  intent = "outline",
  onClick,
  disabled = false,
  className = "",
}: DataTableActionButtonProps) {
  const baseClasses =
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

  const intentClasses =
    intent === "primary"
      ? "border border-transparent bg-primary text-white shadow-theme-xs hover:bg-primary-hover"
      : "border border-border-light bg-surface-secondary text-text-primary shadow-theme-xs hover:border-border-strong hover:bg-surface-tertiary dark:border-border-light dark:bg-surface-secondary dark:text-text-primary dark:hover:bg-surface-tertiary";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, intentClasses, disabled && "cursor-not-allowed opacity-50", className)}
    >
      {icon ? <span className="flex shrink-0 items-center justify-center">{icon}</span> : null}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
