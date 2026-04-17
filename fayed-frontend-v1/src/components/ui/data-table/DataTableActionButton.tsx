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
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/20";

  const intentClasses =
    intent === "primary"
      ? "bg-[#4d81da] text-white shadow-[0_16px_32px_-24px_rgba(77,129,218,0.44)] hover:bg-[#4477cf] disabled:bg-[#4d81da]/60"
      : "border border-[#dbe5f4] bg-white text-text-primary shadow-[0_12px_28px_-22px_rgba(34,52,56,0.12)] hover:border-primary/30 hover:bg-[#f8fbff] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.07]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, intentClasses, disabled && "cursor-not-allowed opacity-50", className)}
    >
      {icon ? <span className="flex items-center">{icon}</span> : null}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
