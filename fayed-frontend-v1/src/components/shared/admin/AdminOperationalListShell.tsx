import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/shared/admin/AdminDashboardKit";

export type AdminSummaryCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning";
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
  return <AdminMetricCard label={label} value={value} hint={hint} icon={icon} tone={tone} className={className} />;
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

function AdminFiltersSurface({ children }: { children: ReactNode }) {
  return (
    <AdminSectionCard className="rounded-[28px] border-border-light/80 bg-white/96 shadow-[0_14px_34px_-28px_rgba(34,52,56,0.16)] dark:bg-surface-secondary/92">
      <div className="p-6">{children}</div>
    </AdminSectionCard>
  );
}

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
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      {notice ? <section>{notice}</section> : null}

      {summaryCards ? <AdminSummaryCardsRow>{summaryCards}</AdminSummaryCardsRow> : null}

      {filters ? <AdminFiltersSurface>{filters}</AdminFiltersSurface> : null}

      {children}
    </div>
  );
}
