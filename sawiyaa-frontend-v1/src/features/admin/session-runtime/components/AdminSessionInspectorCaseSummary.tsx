"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AdminSessionStatus } from "../types/admin-session-runtime.types";
import { formatInspectorDateTime } from "../lib/inspector-utils";
import { OUTCOME_TONE_CLASS, type OutcomeTone } from "../lib/inspector-utils";

const STATUS_STYLES: Partial<Record<AdminSessionStatus, string>> = {
  PENDING_PAYMENT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CONFIRMED:
    "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  UPCOMING:
    "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  READY_TO_JOIN:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  IN_PROGRESS:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  COMPLETED:
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  NO_SHOW: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  REFUND_PENDING:
    "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white/70",
  REFUNDED: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white/70",
};

const CONFIDENCE_TONE: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  LOW: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

type CaseSummaryProps = {
  item: {
    id: string;
    sessionCode: string;
    status: AdminSessionStatus;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    provider: string;
  };
  recommendedOutcomeLabel: string;
  recommendedOutcomeTone: OutcomeTone;
  evidenceConfidence: "HIGH" | "MEDIUM" | "LOW";
  totalRiskFlags: number;
  patientName?: string | null;
  practitionerName?: string | null;
};

export default function AdminSessionInspectorCaseSummary({
  item,
  recommendedOutcomeLabel,
  recommendedOutcomeTone,
  evidenceConfidence,
  totalRiskFlags,
  patientName,
  practitionerName,
}: CaseSummaryProps) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();

  const notAvailable = t("inspector.notAvailable");
  const patientDisplay = patientName?.trim() || notAvailable;
  const practitionerDisplay = practitionerName?.trim() || notAvailable;

  const scheduledLabel = formatInspectorDateTime(
    item.scheduledStartAt,
    locale,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: !locale.startsWith("ar"),
    },
  );

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.caseSummary.title")}
          </p>
          <p className="mt-2 font-mono text-xs text-text-secondary">
            {item.sessionCode || item.id}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_STYLES[item.status] ??
            "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/70"
          }`}
        >
          {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-light p-4 dark:border-white/8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.caseSummary.patient")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {patientDisplay}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light p-4 dark:border-white/8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.caseSummary.practitioner")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {practitionerDisplay}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light p-4 dark:border-white/8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.caseSummary.scheduledAt")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {scheduledLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light p-4 dark:border-white/8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.caseSummary.outcome")}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${OUTCOME_TONE_CLASS[recommendedOutcomeTone]}`}
            >
              {recommendedOutcomeLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${CONFIDENCE_TONE[evidenceConfidence]}`}
            >
              {t(
                `inspector.caseSummary.confidence${evidenceConfidence.charAt(0)}${evidenceConfidence.slice(1).toLowerCase()}` as Parameters<typeof t>[0],
              )}
            </span>
            {totalRiskFlags > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {t("inspector.caseSummary.riskCount")}: {totalRiskFlags}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}
