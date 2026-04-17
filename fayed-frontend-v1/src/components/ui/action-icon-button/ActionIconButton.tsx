"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionIntent =
  | "view"
  | "edit"
  | "publish"
  | "archive"
  | "deactivate"
  | "delete"
  | "manage"
  | "neutral";

interface ActionIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  icon: ReactNode;
  intent?: ActionIntent;
}

const INTENT_STYLES: Record<ActionIntent, string> = {
  view: "text-primary border-primary/30 bg-primary/10 hover:bg-primary/15",
  manage: "text-primary border-primary/30 bg-primary/10 hover:bg-primary/15",
  edit: "text-amber-700 border-amber-300/70 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-500/30 dark:bg-amber-500/12",
  publish:
    "text-emerald-700 border-emerald-300/70 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/12",
  archive:
    "text-rose-700 border-rose-300/70 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:border-rose-500/30 dark:bg-rose-500/12",
  deactivate:
    "text-rose-700 border-rose-300/70 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:border-rose-500/30 dark:bg-rose-500/12",
  delete:
    "text-rose-700 border-rose-300/70 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:border-rose-500/30 dark:bg-rose-500/12",
  neutral:
    "text-text-secondary border-border-light bg-surface-secondary hover:bg-surface-tertiary dark:bg-white/5",
};

export default function ActionIconButton({
  label,
  icon,
  intent = "neutral",
  className = "",
  type = "button",
  disabled = false,
  ...props
}: ActionIconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        INTENT_STYLES[intent]
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
      {...props}
    >
      <span className="h-4 w-4">{icon}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

