import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SurfaceCard, SurfaceHeader, SurfaceToolbar } from "@/components/shared/SurfaceShell";

type AdminSummaryTone = "neutral" | "primary" | "success" | "warning";

const SUMMARY_TONE_CLASSES: Record<
  AdminSummaryTone,
  { shell: string; accent: string; iconShell: string; icon: string }
> = {
  neutral: {
    shell: "border-border-light bg-surface-primary dark:bg-surface-secondary",
    accent: "bg-surface-tertiary dark:bg-white/8",
    iconShell: "bg-surface-secondary",
    icon: "text-text-secondary",
  },
  primary: {
    shell: "border-primary/18 bg-primary-light/60 dark:bg-primary/10",
    accent: "bg-primary/12 dark:bg-primary/18",
    iconShell: "bg-white/80 dark:bg-primary/15",
    icon: "text-text-brand dark:text-primary-light",
  },
  success: {
    shell: "border-success-500/16 bg-success-50/85 dark:bg-success-500/10",
    accent: "bg-success-500/12 dark:bg-success-500/18",
    iconShell: "bg-success-50",
    icon: "text-success-700",
  },
  warning: {
    shell: "border-warning-300/30 bg-warning-50/90 dark:bg-warning-500/10",
    accent: "bg-warning-300/35 dark:bg-warning-500/18",
    iconShell: "bg-warning-50",
    icon: "text-warning-700",
  },
};

export type AdminSummaryCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: AdminSummaryTone;
  className?: string;
};

export function AdminSummaryCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: AdminSummaryCardProps) {
  const toneStyles = SUMMARY_TONE_CLASSES[tone];

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[22px] border px-4 py-3 shadow-[0_12px_24px_-20px_rgba(34,52,56,0.18)] sm:px-5 sm:py-4",
        toneStyles.shell,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full", toneStyles.accent)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full opacity-70",
          toneStyles.accent,
        )}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-text-primary dark:text-white/95 sm:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs leading-5 text-text-secondary">{hint}</p>
          ) : null}
        </div>

        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
              toneStyles.iconShell,
              toneStyles.icon,
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AdminSummaryCardsRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export type AdminOperationalListShellProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  notice?: ReactNode;
  summaryCards?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function AdminOperationalListShell({
  title,
  eyebrow,
  description,
  actions,
  notice,
  summaryCards,
  filters,
  children,
  className,
}: AdminOperationalListShellProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <SurfaceCard as="section" variant="page">
        <SurfaceHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
        />
      </SurfaceCard>

      {notice ? <section>{notice}</section> : null}

      {summaryCards ? <AdminSummaryCardsRow>{summaryCards}</AdminSummaryCardsRow> : null}

      {filters ? <SurfaceToolbar>{filters}</SurfaceToolbar> : null}

      {children}
    </div>
  );
}
