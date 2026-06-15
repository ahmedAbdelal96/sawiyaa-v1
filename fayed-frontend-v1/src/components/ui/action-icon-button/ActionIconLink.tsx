"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type ActionIntent =
  | "view"
  | "edit"
  | "publish"
  | "archive"
  | "deactivate"
  | "delete"
  | "manage"
  | "neutral";

interface ActionIconLinkProps {
  href: string;
  label: string;
  icon: ReactNode;
  intent?: ActionIntent;
  className?: string;
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

export default function ActionIconLink({
  href,
  label,
  icon,
  intent = "neutral",
  className = "",
}: ActionIconLinkProps) {
  return (
    <Link
      href={href as never}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${INTENT_STYLES[intent]} ${className}`}
    >
      <span className="h-4 w-4">{icon}</span>
      <span className="sr-only">{label}</span>
    </Link>
  );
}

