"use client";

import { Loader2, PlusCircle } from "lucide-react";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

export default function NewSupportMessageAction({
  role,
  locale,
  disabled = false,
  pending = false,
  error = null,
  onClick,
}: {
  role: UnifiedMessagingRole;
  locale: string;
  disabled?: boolean;
  pending?: boolean;
  error?: string | null;
  onClick: () => void;
}) {
  if (role === "admin") return null;

  const label = locale.startsWith("ar") ? "رسالة جديدة للدعم" : "New support message";

  return (
    <div className="shrink-0 border-b border-border-light/60 bg-white/70 px-3 py-2 dark:border-white/8 dark:bg-transparent">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-xs font-bold text-primary transition hover:border-primary/40 hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary/25 dark:bg-primary/10 dark:text-primary-light"
        aria-label={label}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5 shrink-0" />}
        <span>{pending ? (locale.startsWith("ar") ? "جاري فتح الدعم..." : "Starting support...") : label}</span>
      </button>
      {error ? <p role="alert" className="mt-1.5 text-center text-[11px] font-semibold text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
