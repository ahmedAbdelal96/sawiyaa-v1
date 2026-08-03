"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  CircleAlert,
  Info,
  Package,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import {
  formatRuntimeViewerDateTime,
  useRuntimeViewerTimeZone,
} from "../lib/runtime-time";
import type {
  AdminSessionInspectorExtendedSummary,
  AdminSessionRuntimeInspectionItem,
} from "../types/admin-session-runtime.types";

export default function AdminSessionRuntimeSummary({
  item,
  extended,
  patientName,
  practitionerName,
}: {
  item: AdminSessionRuntimeInspectionItem;
  extended: AdminSessionInspectorExtendedSummary | null;
  patientName: string | null;
  practitionerName: string | null;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  const viewerTimeZone = useRuntimeViewerTimeZone();
  const relatedSupportTickets = item.relatedSupportTickets ?? [];
  const durationMinutes =
    extended?.session.durationMinutes ??
    getDurationMinutes(item.scheduledStartAt, item.scheduledEndAt);
  const attendanceState = extended
    ? extended.patient.noShowCandidate && extended.practitioner.noShowCandidate
      ? t("inspector.statusStrip.attendance.none")
      : extended.patient.noShowCandidate
        ? t("inspector.statusStrip.attendance.patientMissing")
        : extended.practitioner.noShowCandidate
          ? t("inspector.statusStrip.attendance.practitionerMissing")
          : extended.overlap.hasMeaningfulOverlap
            ? t("inspector.statusStrip.attendance.sufficient")
            : t("inspector.statusStrip.attendance.review")
    : t("inspector.statusStrip.unknown");
  const technicalState = extended?.evidence.hasTechnicalRisk
    ? t("inspector.statusStrip.technical.review")
    : t("inspector.statusStrip.technical.clear");
  const actionState = extended?.recommendation.requiresAdminReview
    ? t("inspector.statusStrip.action.required")
    : t("inspector.statusStrip.action.none");
  const blocked = !item.canJoin;
  const statusLabel = t(`statuses.${item.status}` as Parameters<typeof t>[0]);
  const outcome = extended
    ? t(
        `inspector.outcomes.${extended.recommendation.recommendedOutcome}` as Parameters<
          typeof t
        >[0],
      )
    : t("inspector.notAvailable");

  return (
    <section
      className="app-panel rounded-[28px] p-5 sm:p-6"
      data-testid="runtime-summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
            {t("inspector.summary.eyebrow")}
          </p>
          <h2 className="text-text-primary mt-1 text-xl font-semibold dark:text-white/95">
            {t("inspector.summary.title")}
          </h2>
        </div>
        <span className="bg-surface-tertiary text-text-secondary rounded-full px-3 py-1 text-xs font-semibold dark:bg-white/10 dark:text-white/80">
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric
          icon={<CalendarClock className="h-4 w-4" />}
          label={t("inspector.summary.scheduledStart")}
          value={
            item.scheduledStartAt
              ? formatRuntimeViewerDateTime(
                  item.scheduledStartAt,
                  locale,
                  viewerTimeZone,
                )
              : t("inspector.notAvailable")
          }
        />
        <SummaryMetric
          icon={<CalendarClock className="h-4 w-4" />}
          label={t("inspector.summary.scheduledEnd")}
          value={
            item.scheduledEndAt
              ? formatRuntimeViewerDateTime(
                  item.scheduledEndAt,
                  locale,
                  viewerTimeZone,
                )
              : t("inspector.notAvailable")
          }
        />
        <SummaryMetric
          icon={<ShieldCheck className="h-4 w-4" />}
          label={t("inspector.summary.readiness")}
          value={
            blocked
              ? t("inspector.summary.blocked")
              : t("inspector.summary.ready")
          }
          tone={blocked ? "warning" : "success"}
        />
        <SummaryMetric
          icon={<Info className="h-4 w-4" />}
          label={t("inspector.summary.modeDuration")}
          value={`${t(`modes.${item.sessionMode}` as Parameters<typeof t>[0])} · ${durationMinutes != null ? t("inspector.summary.minutes", { minutes: durationMinutes }) : t("inspector.notAvailable")}`}
        />
        <SummaryMetric
          icon={<CircleAlert className="h-4 w-4" />}
          label={t("inspector.summary.recommendation")}
          value={outcome}
        />
      </div>

      <div
        className="mt-4 grid gap-2 sm:grid-cols-4"
        aria-label={t("inspector.statusStrip.label")}
      >
        <StatusCell
          label={t("inspector.statusStrip.attendance.label")}
          value={attendanceState}
        />
        <StatusCell
          label={t("inspector.statusStrip.technical.label")}
          value={technicalState}
        />
        <StatusCell
          label={t("inspector.statusStrip.package.label")}
          value={
            item.paymentCoverageType === "PACKAGE"
              ? t("inspector.statusStrip.package.linked")
              : t("inspector.statusStrip.package.none")
          }
        />
        <StatusCell
          label={t("inspector.statusStrip.action.label")}
          value={actionState}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryLine
          label={t("inspector.summary.patient")}
          value={patientName || t("inspector.notAvailable")}
        />
        <SummaryLine
          label={t("inspector.summary.practitioner")}
          value={practitionerName || t("inspector.notAvailable")}
        />
        <SummaryLine
          label={t("inspector.summary.viewerTime")}
          value={viewerTimeZone}
          mono
        />
      </div>

      <div className="text-text-secondary mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="bg-surface-tertiary inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 dark:bg-white/10">
          <Package className="h-3.5 w-3.5" />
          {item.packagePurchase
            ? t("inspector.summary.package")
            : t("inspector.summary.noPackage")}
        </span>
        <span className="bg-surface-tertiary inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 dark:bg-white/10">
          <Ticket className="h-3.5 w-3.5" />
          {relatedSupportTickets.length > 0
            ? t("inspector.summary.support")
            : t("inspector.summary.noSupport")}
        </span>
      </div>
    </section>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-text-primary dark:text-white/95";
  return (
    <div className="border-border-light rounded-2xl border p-3 dark:border-white/8">
      <div className="text-text-muted flex items-center gap-2 text-xs">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-border-light rounded-2xl border px-3 py-2.5 dark:border-white/8">
      <p className="text-text-muted text-[11px] font-semibold tracking-[0.14em] uppercase">
        {label}
      </p>
      <p
        className={`text-text-primary mt-1 text-sm dark:text-white/90 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border-light rounded-xl border px-3 py-2 dark:border-white/8">
      <p className="text-text-muted text-[10px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className="text-text-primary mt-1 text-xs font-semibold dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function getDurationMinutes(
  start: string | null,
  end: string | null,
): number | null {
  if (!start || !end) return null;
  const duration = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}
