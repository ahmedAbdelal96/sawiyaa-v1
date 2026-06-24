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
  view: "bg-surface-tertiary border-border-light text-text-secondary hover:text-text-brand hover:border-primary/30",
  manage: "bg-surface-tertiary border-border-light text-text-secondary hover:text-text-brand hover:border-primary/30",
  edit: "bg-status-warning-soft text-status-warning border-status-warning-border",
  publish: "bg-status-success-soft text-status-success border-status-success-border",
  archive: "bg-status-danger-soft text-status-danger border-status-danger-border",
  deactivate: "bg-status-danger-soft text-status-danger border-status-danger-border",
  delete: "bg-status-danger-soft text-status-danger border-status-danger-border",
  neutral: "bg-surface-tertiary border-border-light text-text-secondary hover:text-text-brand hover:border-primary/30",
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

