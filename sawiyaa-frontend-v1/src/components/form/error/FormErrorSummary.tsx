"use client";

import { ReactNode } from "react";

type Props = {
  message?: string | null;
  details?: string | null;
  className?: string;
  children?: ReactNode;
};

export function FormErrorSummary({ message, details, className, children }: Props) {
  if (!message && !details && !children) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border border-status-danger-border bg-status-danger-soft px-4 py-3 text-sm text-status-danger ${className ?? ""}`}
      dir="auto"
    >
      {message ? <p className="font-medium">{message}</p> : null}
      {details ? <p className="mt-1 text-xs text-status-danger/80">{details}</p> : null}
      {children}
    </div>
  );
}

export default FormErrorSummary;
