import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  AdminFilterCard,
  AdminMetricCard,
  AdminPageHeader,
  AdminStatsGrid,
  AdminTableSection,
} from "@/components/shared/admin/AdminDashboardKit";

// ─── AdminSummaryCard ─────────────────────────────────────────────────────────
// Convenience alias kept for backward-compat with existing pages.

export type AdminSummaryCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "finance";
  className?: string;
  metricKey?: string;
  semantic?: string;
};

export function AdminSummaryCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
  metricKey,
  semantic,
}: AdminSummaryCardProps) {
  return (
    <AdminMetricCard
      label={label}
      value={value}
      hint={hint}
      icon={icon}
      tone={tone}
      className={className}
      metricKey={metricKey}
      semantic={semantic}
    />
  );
}

// ─── AdminSummaryCardsRow ─────────────────────────────────────────────────────
// Convenience alias — wraps AdminStatsGrid so existing consumers don't break.

export function AdminSummaryCardsRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <AdminStatsGrid className={className}>{children}</AdminStatsGrid>;
}

// ─── AdminOperationalListShell ────────────────────────────────────────────────

export type AdminOperationalListShellProps = {
  // Header
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;

  // Optional notice/banner above stats
  notice?: ReactNode;

  // Stats cards (passed as children of AdminStatsGrid)
  summaryCards?: ReactNode;

  // Filters block (wrapped in AdminFilterCard)
  filters?: ReactNode;
  filtersTitle?: ReactNode;

  // Table section header (wraps children in AdminTableSection when provided)
  tableTitle?: ReactNode;
  tableSubtitle?: ReactNode;
  tableActions?: ReactNode;

  // The main content (DataTable or custom table)
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
  filtersTitle,
  tableTitle,
  tableSubtitle,
  tableActions,
  children,
  className,
}: AdminOperationalListShellProps) {
  const hasTableHeader = Boolean(tableTitle || tableSubtitle || tableActions);

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      {/* ── Notice / Banner ── */}
      {notice ? <section>{notice}</section> : null}

      {/* ── Stats Grid ── */}
      {summaryCards ? (
        <AdminStatsGrid>{summaryCards}</AdminStatsGrid>
      ) : null}

      {/* ── Filters Card ── */}
      {filters ? (
        <AdminFilterCard title={filtersTitle}>{filters}</AdminFilterCard>
      ) : null}

      {/* ── Table Section ── */}
      {hasTableHeader ? (
        <AdminTableSection
          title={tableTitle}
          subtitle={tableSubtitle}
          actions={tableActions}
          flushContent
        >
          {children}
        </AdminTableSection>
      ) : (
        children
      )}
    </div>
  );
}
