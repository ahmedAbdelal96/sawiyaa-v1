"use client";

import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  PractitionerFilterCard,
  PractitionerPageHeader,
  PractitionerStatsGrid,
  PractitionerTableSection,
  PractitionerStatCard,
} from "./PractitionerWorkspaceKit";

// ─── PractitionerSummaryCard ──────────────────────────────────────────────────
// Convenience alias for backward compatibility.

export type PractitionerSummaryCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "finance" | "session" | "support";
  className?: string;
  metricKey?: string;
  semantic?: string;
};

export function PractitionerSummaryCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
  metricKey,
  semantic,
}: PractitionerSummaryCardProps) {
  return (
    <PractitionerStatCard
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

// ─── PractitionerOperationalListShell ─────────────────────────────────────────

export type PractitionerOperationalListShellProps = {
  // Header
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;

  // Optional notice/banner above stats
  notice?: ReactNode;

  // Stats cards (passed as children of PractitionerStatsGrid)
  summaryCards?: ReactNode;

  // Filters block (wrapped in PractitionerFilterCard)
  filters?: ReactNode;
  filtersTitle?: ReactNode;

  // Table section header (wraps children in PractitionerTableSection when provided)
  tableTitle?: ReactNode;
  tableSubtitle?: ReactNode;
  tableActions?: ReactNode;

  // The main content (DataTable or custom table)
  children: ReactNode;

  className?: string;
};

export default function PractitionerOperationalListShell({
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
}: PractitionerOperationalListShellProps) {
  const hasTableHeader = Boolean(tableTitle || tableSubtitle || tableActions);

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Page Header ── */}
      <PractitionerPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      {/* ── Notice / Banner ── */}
      {notice ? <section>{notice}</section> : null}

      {/* ── Stats Grid ── */}
      {summaryCards ? (
        <PractitionerStatsGrid>{summaryCards}</PractitionerStatsGrid>
      ) : null}

      {/* ── Filters Card ── */}
      {filters ? (
        <PractitionerFilterCard title={filtersTitle}>{filters}</PractitionerFilterCard>
      ) : null}

      {/* ── Table Section ── */}
      {hasTableHeader ? (
        <PractitionerTableSection
          title={tableTitle}
          subtitle={tableSubtitle}
          actions={tableActions}
          flushContent
        >
          {children}
        </PractitionerTableSection>
      ) : (
        children
      )}
    </div>
  );
}
