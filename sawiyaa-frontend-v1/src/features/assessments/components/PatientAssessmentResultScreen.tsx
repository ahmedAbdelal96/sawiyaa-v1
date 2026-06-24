"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, ClipboardList, HeartHandshake, Loader2, Stethoscope, Calendar, Hash, ArrowLeft, ArrowRight } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
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

function getBandStyles(band: AssessmentResultBand) {
  switch (band) {
    case "LOW":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-100 dark:border-emerald-500/20",
      };
    case "MILD":
      return {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-100 dark:border-amber-500/20",
      };
    case "MODERATE":
      return {
        bg: "bg-orange-50 dark:bg-orange-500/10",
        text: "text-orange-700 dark:text-orange-400",
        border: "border-orange-100 dark:border-orange-500/20",
      };
    case "HIGH":
      return {
        bg: "bg-rose-50 dark:bg-rose-500/10",
        text: "text-rose-700 dark:text-rose-400",
        border: "border-rose-100 dark:border-rose-500/20",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-white/5",
        text: "text-gray-700 dark:text-gray-300",
        border: "border-gray-100 dark:border-white/10",
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
      <div className="mx-auto max-w-3xl">
        <ListStateSkeleton items={2} heightClass="h-40" />
      </div>
    );
  }

  if (submission.isError || !submission.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<AlertCircle className="h-10 w-10 text-primary" />}
          title={t("states.resultError.heading")}
          note={t("states.resultError.note")}
          action={{
            label: t("states.resultError.retry"),
            href: (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => submission.refetch()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  {submission.isFetching && <Loader2 size={14} className="animate-spin" />}
                  {t("states.resultError.retry")}
                </button>
                <Link
                  href="/patient/assessments"
                  className="inline-flex items-center justify-center rounded-full border border-border-light px-5 py-2.5 text-sm font-semibold text-text-primary hover:border-primary hover:text-primary"
                >
                  {t("actions.backToList")}
                </Link>
              </div>
            ),
          }}
          className="rounded-[32px] p-6 sm:p-8"
        />
      </div>
    );
  }

  const result = submission.data.result;

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<AlertCircle className="h-10 w-10 text-primary" />}
          title={t("result.unavailable.heading")}
          note={t("result.unavailable.note")}
          action={{
            label: t("actions.backToList"),
            href: (
              <Link
                href="/patient/assessments"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t("actions.backToList")}
              </Link>
            ),
          }}
          className="rounded-[32px] p-6 sm:p-7"
        />
      </div>
    );
  }

  const isRtl = locale === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      {/* Back Link */}
      <div className="flex items-center">
        <Link
          href="/patient/assessments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary transition-colors group"
        >
          <BackIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
          {t("actions.backToList")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Title, Metadata, Summary, Next Steps */}
        <div className="space-y-5 sm:space-y-6 lg:col-span-2">
          {/* Main Assessment Header and Summary Card */}
          <SurfaceCard as="section" variant="page" className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                {t("result.eyebrow")}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
                {submission.data.assessment.title}
              </h1>

              {/* Metadata row (non-card style) */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-text-secondary border-t border-border-light/60 pt-4">
                {submission.data.completedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-text-muted shrink-0" />
                    <span>
                      {t("result.completedAt", {
                        date: formatDate(submission.data.completedAt, numberLocale),
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-text-muted shrink-0" />
                  <span>
                    {t("result.submissionId", { id: "" })}
                  </span>
                  <code className="font-mono text-xs bg-surface-tertiary/80 dark:bg-white/5 px-2 py-0.5 rounded text-text-muted select-all">
                    {submission.data.submissionId}
                  </code>
                </div>
              </div>
            </div>

            <hr className="border-border-light/60" />

            {/* Summary */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("result.summaryHeading")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
                {result.summary}
              </p>
            </div>
          </SurfaceCard>

          {/* Suggested Next Steps Card */}
          <SurfaceCard as="section" variant="page" className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("result.nextStepsHeading")}
            </h2>
            <ul className="space-y-4">
              {result.nextSteps.map((step, idx) => (
                <li key={step} className="flex gap-3.5 items-start">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base text-text-secondary leading-relaxed pt-0.5">
                    {step}
                  </p>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        </div>

        {/* Right Column: Score Display, Sidebar Actions, Important Reminder */}
        <div className="space-y-5 sm:space-y-6 lg:col-span-1">
          {/* Score Circle Card */}
          <div className="rounded-[28px] border border-border-light bg-white dark:bg-card p-5 shadow-sm text-center space-y-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {t("result.score", { value: "" }).replace(":", "").trim()}
            </p>

            {/* Visual circle score */}
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/5 dark:bg-primary/10 border-2 border-primary/20">
              <span className="text-4xl font-extrabold text-primary">
                {result.score}
              </span>
            </div>

            {/* Severity level indicators */}
            <div className={`mx-auto max-w-[200px] rounded-2xl border p-3 ${getBandStyles(result.band).bg} ${getBandStyles(result.band).border}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {locale === "ar" ? "مستوى الشدة" : "Severity Level"}
              </p>
              <p className={`text-base font-bold mt-0.5 ${getBandStyles(result.band).text}`}>
                {t(`result.bands.${result.band}.title` as Parameters<typeof t>[0])}
              </p>
            </div>
          </div>

          {/* Direct Platform Actions Panel */}
          <div className="rounded-[28px] border border-border-light bg-white dark:bg-card p-4 shadow-sm space-y-3">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider px-2 pt-1">
              {locale === "ar" ? "الخطوات التالية الموصى بها" : "Recommended Next Steps"}
            </p>

            {/* Guided Matching */}
            <Link
              href="/patient/matching"
              className="flex items-center justify-between w-full rounded-2xl bg-primary text-white p-4 hover:bg-primary-hover transition-colors font-semibold group"
            >
              <div className="text-start">
                <span className="block text-sm">{t("result.actions.guidedMatching")}</span>
                <span className="block text-xs font-normal opacity-90 mt-0.5 leading-relaxed">{t("result.actions.guidedMatchingNote")}</span>
              </div>
              <HeartHandshake className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            </Link>

            {/* Browse Practitioners */}
            <Link
              href="/patient/practitioners"
              className="flex items-center justify-between w-full rounded-2xl border border-border-light hover:border-primary/30 hover:bg-primary-light/10 dark:hover:bg-white/5 bg-white dark:bg-white/5 p-4 transition-colors font-semibold group"
            >
              <div className="text-start">
                <span className="block text-sm text-text-primary dark:text-white/95">{t("result.actions.browsePractitioners")}</span>
                <span className="block text-xs font-normal text-text-secondary mt-0.5 leading-relaxed">{t("result.actions.browsePractitionersNote")}</span>
              </div>
              <Stethoscope className="h-5 w-5 text-primary shrink-0 transition-transform group-hover:scale-110" />
            </Link>

            {/* More Assessments */}
            <Link
              href="/patient/assessments"
              className="flex items-center justify-between w-full rounded-2xl border border-border-light hover:border-primary/30 hover:bg-primary-light/10 dark:hover:bg-white/5 bg-white dark:bg-white/5 p-4 transition-colors font-semibold group"
            >
              <div className="text-start">
                <span className="block text-sm text-text-primary dark:text-white/95">{t("result.actions.moreAssessments")}</span>
                <span className="block text-xs font-normal text-text-secondary mt-0.5 leading-relaxed">{t("result.actions.moreAssessmentsNote")}</span>
              </div>
              <ClipboardList className="h-5 w-5 text-primary shrink-0 transition-transform group-hover:scale-110" />
            </Link>
          </div>

          {/* Important Warning Banner */}
          <div className="rounded-[24px] bg-amber-500/5 border border-amber-500/10 dark:bg-amber-500/10 dark:border-amber-500/20 p-4">
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400">
                  {t("result.nonDiagnosticTitle")}
                </h4>
                <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                  {t("result.nonDiagnosticNote")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

