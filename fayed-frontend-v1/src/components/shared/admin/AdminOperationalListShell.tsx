import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SurfaceCard, SurfaceHeader, SurfaceToolbar } from "@/components/shared/SurfaceShell";

type AdminSummaryTone = "neutral" | "primary" | "success" | "warning";

const SUMMARY_TONE_CLASSES: Record<
  AdminSummaryTone,
  { shellAccent: string; iconShell: string; icon: string }
> = {
  neutral: {
    shellAccent: "border-s-border-light",
    iconShell: "bg-surface-secondary",
    icon: "text-text-secondary",
  },
  primary: {
    shellAccent: "border-s-primary/60",
    iconShell: "bg-primary-light",
    icon: "text-primary",
  },
  success: {
    shellAccent: "border-s-success-500/50",
    iconShell: "bg-success-50",
    icon: "text-success-700",
  },
  warning: {
    shellAccent: "border-s-warning-500/40",
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
        "rounded-[22px] border border-border-light bg-surface-primary px-4 py-3 shadow-[0_12px_24px_-20px_rgba(34,52,56,0.18)] sm:px-5 sm:py-4",
        "border-s-4",
        toneStyles.shellAccent,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
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
