"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartHandshake,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePatientAssessmentSubmission } from "../hooks/use-assessments";
import type { AssessmentResultBand } from "../types/assessments.types";

type PatientAssessmentResultScreenProps = {
  submissionId: string;
};

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const severityBands: Array<{
  key: AssessmentResultBand;
  labelAr: string;
  color: string;
  activeBg: string;
  activeText: string;
}> = [
  { key: "LOW", labelAr: "منخفض", color: "bg-emerald-400", activeBg: "bg-emerald-500 text-white", activeText: "text-emerald-700 dark:text-emerald-300" },
  { key: "MILD", labelAr: "بسيط", color: "bg-amber-400", activeBg: "bg-amber-500 text-white", activeText: "text-amber-700 dark:text-amber-300" },
  { key: "MODERATE", labelAr: "متوسط", color: "bg-orange-400", activeBg: "bg-orange-500 text-white", activeText: "text-orange-700 dark:text-orange-300" },
  { key: "HIGH", labelAr: "مرتفع", color: "bg-rose-400", activeBg: "bg-rose-500 text-white", activeText: "text-rose-700 dark:text-rose-300" },
];

function getBandConfig(band: AssessmentResultBand) {
  switch (band) {
    case "LOW":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-800",
        ring: "ring-emerald-500/20",
        badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
        pill: "bg-emerald-500 text-white",
      };
    case "MILD":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
        ring: "ring-amber-500/20",
        badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
        pill: "bg-amber-500 text-white",
      };
    case "MODERATE":
      return {
        bg: "bg-orange-50 dark:bg-orange-950/40",
        text: "text-orange-700 dark:text-orange-300",
        border: "border-orange-200 dark:border-orange-800",
        ring: "ring-orange-500/20",
        badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200",
        pill: "bg-orange-500 text-white",
      };
    case "HIGH":
      return {
        bg: "bg-rose-50 dark:bg-rose-950/40",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-200 dark:border-rose-800",
        ring: "ring-rose-500/20",
        badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
        pill: "bg-rose-500 text-white",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-white/5",
        text: "text-gray-700 dark:text-gray-300",
        border: "border-gray-200 dark:border-white/10",
        ring: "ring-gray-500/20",
        badge: "bg-gray-100 text-gray-800",
        pill: "bg-gray-500 text-white",
      };
  }
}

export default function PatientAssessmentResultScreen({
  submissionId,
}: PatientAssessmentResultScreenProps) {
  const t = useTranslations("assessments");
  const locale = useLocale();
  const numberLocale = locale === "ar" ? "ar-SA" : "en-US";
  const submission = usePatientAssessmentSubmission(submissionId);

  if (submission.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <ListStateSkeleton items={2} heightClass="h-40" />
      </div>
    );
  }

  if (submission.isError || !submission.data) {
    return (
      <div className="mx-auto max-w-xl text-start">
        <StateCard
          icon={<AlertCircle className="h-10 w-10 text-primary" />}
          title={t("states.resultError.heading")}
          note={t("states.resultError.note")}
          action={{
            label: t("states.resultError.retry"),
            href: (
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => submission.refetch()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-hover shadow-xs cursor-pointer"
                >
                  {submission.isFetching && <Loader2 size={14} className="animate-spin" />}
                  <span>{t("states.resultError.retry")}</span>
                </button>
                <Link
                  href="/patient/assessments"
                  className="inline-flex items-center justify-center rounded-xl border border-border-light px-5 py-2.5 text-xs font-semibold text-text-primary hover:border-primary hover:text-primary dark:bg-surface-secondary dark:border-border-dark"
                >
                  {t("actions.backToList")}
                </Link>
              </div>
            ),
          }}
          className="rounded-3xl p-6 sm:p-8"
        />
      </div>
    );
  }

  const result = submission.data.result;

  if (!result) {
    return (
      <div className="mx-auto max-w-xl text-start">
        <StateCard
          icon={<AlertCircle className="h-10 w-10 text-primary" />}
          title={t("result.unavailable.heading")}
          note={t("result.unavailable.note")}
          action={{
            label: t("actions.backToList"),
            href: (
              <Link
                href="/patient/assessments"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>{t("actions.backToList")}</span>
              </Link>
            ),
          }}
          className="rounded-3xl p-6 sm:p-7"
        />
      </div>
    );
  }

  const bandConfig = getBandConfig(result.band);

  return (
    <div className="mx-auto max-w-4xl space-y-5 text-start">
      {/* Top Breadcrumb & Retake Actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/patient/assessments"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
          <span>{t("actions.backToList")}</span>
        </Link>

        <Link
          href={`/patient/assessments/${submission.data.assessment.slug}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3.5 py-1.5 text-xs font-bold text-text-secondary hover:border-primary/40 hover:text-primary transition dark:bg-surface-secondary dark:border-border-dark cursor-pointer shadow-2xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>إعادة الاختبار</span>
        </Link>
      </div>

      {/* Unified Master Result Card */}
      <section className="relative overflow-hidden rounded-3xl border border-border-light/80 bg-white p-5 sm:p-8 shadow-xs dark:bg-surface-secondary dark:border-border-dark space-y-6">
        {/* HERO: Assessment Info + Dynamic Score Gauge */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-border-light/60">
          <div className="space-y-2 max-w-lg">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t("result.eyebrow")}</span>
              </span>
              {submission.data.completedAt && (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(submission.data.completedAt, numberLocale)}
                </span>
              )}
            </div>

            <h1
              dir="auto"
              className="text-2xl sm:text-3xl font-extrabold text-text-primary dark:text-white tracking-tight"
            >
              {submission.data.assessment.title}
            </h1>

            <p className="text-xs sm:text-sm text-text-secondary dark:text-text-muted leading-relaxed">
              {t("result.note")}
            </p>
          </div>

          {/* Integrated Score & Severity Visual Gauge Box */}
          <div
            className={`flex flex-col sm:flex-row items-center gap-4 rounded-3xl border p-4 sm:p-5 shadow-xs ${bandConfig.bg} ${bandConfig.border}`}
          >
            {/* Numeric Score Circle */}
            <div className="flex flex-col items-center justify-center h-20 w-20 rounded-2xl bg-white shadow-xs dark:bg-surface-secondary">
              <span className="text-3xl font-black text-text-primary dark:text-white font-mono leading-none">
                {result.score}
              </span>
              <span className="text-[10px] font-bold text-text-muted mt-1 uppercase">النتيجة</span>
            </div>

            {/* Severity Band & Spectrum */}
            <div className="space-y-2 text-center sm:text-start">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  {t("result.severityLevel")}
                </p>
                <p className={`text-lg font-black ${bandConfig.text}`}>
                  {t(`result.bands.${result.band}.title` as Parameters<typeof t>[0])}
                </p>
              </div>

              {/* Spectrum Indicator Bar */}
              <div className="flex items-center gap-1 pt-0.5">
                {severityBands.map((b) => {
                  const isActive = b.key === result.band;
                  return (
                    <div
                      key={b.key}
                      className={`h-2 rounded-full transition-all ${
                        isActive ? `w-8 ${b.color} shadow-xs ring-2 ring-primary/30` : "w-4 bg-border-light dark:bg-white/10 opacity-50"
                      }`}
                      title={b.labelAr}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Summary Box */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light">
              <Brain className="h-4 w-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-text-primary dark:text-white">
              {t("result.summaryHeading")}
            </h2>
          </div>

          <div className="rounded-2xl bg-surface-tertiary/50 p-4 sm:p-5 border border-border-light/70 dark:bg-surface-secondary/60">
            <p
              dir="auto"
              className="text-sm sm:text-base leading-relaxed font-semibold text-text-primary dark:text-white/95"
            >
              {result.summary}
            </p>
          </div>
        </div>

        {/* Actionable Two-Column Grid: Suggestions & Platform CTAs */}
        <div className="grid gap-6 md:grid-cols-2 pt-2">
          {/* Left Column: Suggested Practical Steps */}
          {result.nextSteps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300">
                  <Target className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-text-primary dark:text-white">
                  {t("result.nextStepsHeading")}
                </h3>
              </div>

              <div className="space-y-2.5">
                {result.nextSteps.map((step, idx) => (
                  <div
                    key={step}
                    className="flex items-start gap-3 rounded-2xl border border-border-light bg-white p-3.5 shadow-2xs dark:bg-surface-secondary dark:border-border-dark"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary font-mono mt-0.5">
                      {idx + 1}
                    </span>
                    <p
                      dir="auto"
                      className="text-xs sm:text-sm font-medium text-text-primary dark:text-white/90 leading-relaxed"
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Column: Platform Next Steps CTAs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-text-primary dark:text-white">
                {t("result.recommendedNextSteps")}
              </h3>
            </div>

            <div className="space-y-3">
              {/* Guided Matching CTA */}
              <Link
                href="/patient/matching"
                className="group flex flex-col justify-between rounded-2xl bg-linear-to-r from-primary to-teal-700 p-4 text-white shadow-xs transition hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{t("result.actions.guidedMatching")}</span>
                    </span>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">
                      موصى به
                    </span>
                  </div>
                  <p className="text-xs text-white/85 leading-relaxed">
                    {t("result.actions.guidedMatchingNote")}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-amber-200">
                  <span>بدء المطابقة الآن</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Browse Practitioners CTA */}
              <Link
                href="/patient/practitioners"
                className="group flex items-center justify-between rounded-2xl border border-border-light bg-surface-tertiary/40 p-3.5 transition hover:border-primary/40 hover:bg-surface-tertiary/70 dark:bg-surface-secondary dark:border-border-dark"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                      {t("result.actions.browsePractitioners")}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                      {t("result.actions.browsePractitionersNote")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted shrink-0 rtl:rotate-180 transition group-hover:text-primary group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Disclaimer / Non-Diagnostic Warning */}
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4 dark:bg-amber-950/30 dark:border-amber-800/60">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                {t("result.nonDiagnosticTitle")}
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-400/90 leading-relaxed">
                {t("result.nonDiagnosticNote")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

