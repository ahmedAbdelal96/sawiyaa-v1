"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info } from "lucide-react";
import type {
  AdminSessionInspectorExtendedSummary,
  AdminSessionRuntimeInspectionItem,
} from "../types/admin-session-runtime.types";

type EvidenceKind =
  "sufficient" | "insufficient" | "absence" | "technical" | "review";

export default function AdminSessionEvidenceSummary({
  item,
  extended,
}: {
  item: AdminSessionRuntimeInspectionItem;
  extended: AdminSessionInspectorExtendedSummary | null;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  if (!extended) return null;

  const evidence = extended.evidence;
  let kind: EvidenceKind | null = null;
  let reason: string | null = null;

  if (evidence.hasTechnicalRisk) {
    kind = "technical";
    reason = t("inspector.evidenceSummary.technical");
  } else if (evidence.hasOnlyPatientJoined) {
    kind = "absence";
    reason = t("inspector.evidenceSummary.practitionerAbsent");
  } else if (evidence.hasOnlyPractitionerJoined) {
    kind = "absence";
    reason = t("inspector.evidenceSummary.patientAbsent");
  } else if (
    evidence.hasNoParticipants ||
    extended.recommendation.recommendedOutcome === "INSUFFICIENT_EVIDENCE"
  ) {
    kind = "insufficient";
    reason = t("inspector.evidenceSummary.insufficient");
  } else if (extended.overlap.hasMeaningfulOverlap) {
    kind = "sufficient";
    reason = t("inspector.evidenceSummary.meaningfulOverlap", {
      minutes: extended.overlap.overlapMinutes,
    });
  } else if (
    extended.recommendation.requiresAdminReview ||
    evidence.hasOutOfOrderEvents
  ) {
    kind = "review";
    reason = t("inspector.evidenceSummary.review");
  }

  if (!kind || !reason) return null;
  const labels = {
    sufficient: t("inspector.evidenceSummary.status.sufficient"),
    insufficient: t("inspector.evidenceSummary.status.insufficient"),
    absence: t("inspector.evidenceSummary.status.absence"),
    technical: t("inspector.evidenceSummary.status.technical"),
    review: t("inspector.evidenceSummary.status.review"),
  };
  const tone =
    kind === "sufficient"
      ? "success"
      : kind === "technical" || kind === "absence"
        ? "warning"
        : "neutral";
  const Icon =
    kind === "sufficient"
      ? CheckCircle2
      : kind === "technical" || kind === "absence"
        ? AlertTriangle
        : Info;

  return (
    <section
      className="app-panel rounded-[24px] p-4 sm:p-5"
      aria-labelledby="evidence-summary-title"
      data-testid="evidence-summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "success" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "text-primary"}`}
            aria-hidden="true"
          />
          <div>
            <h2
              id="evidence-summary-title"
              className="text-text-primary text-sm font-semibold dark:text-white/95"
            >
              {t("inspector.evidenceSummary.title")}
            </h2>
            <p className="text-text-secondary mt-1 text-sm leading-6">
              {reason}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : tone === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/80"}`}
        >
          {labels[kind]}
        </span>
      </div>
      <Link
        href={{
          pathname: "/admin/sessions/runtime-inspector",
          query: { sessionId: item.id, tab: "attendance" },
        }}
        className="text-primary mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
        aria-label={t("inspector.evidenceSummary.openAttendance")}
      >
        {t("inspector.evidenceSummary.openAttendance")}
        <ArrowUpRight
          className="h-3.5 w-3.5 rtl:rotate-[-90deg]"
          aria-hidden="true"
        />
      </Link>
    </section>
  );
}
