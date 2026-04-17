"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, ClipboardList, HeartHandshake, Loader2, Stethoscope } from "lucide-react";
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

function BandChip({ band }: { band: AssessmentResultBand }) {
  const t = useTranslations("assessments");

  return (
    <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
      {t(`result.bands.${band}.title` as Parameters<typeof t>[0])}
    </span>
  );
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

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <SurfaceCard as="section" variant="page">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("result.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {submission.data.assessment.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
              {t("result.note")}
            </p>
          </div>
          <div className="app-panel-soft rounded-2xl px-4 py-3 text-sm text-text-secondary">
            <p className="font-medium text-text-primary dark:text-white/90">
              {t("result.submissionId", { id: submission.data.submissionId })}
            </p>
            {submission.data.completedAt && (
              <p className="mt-1 text-xs text-text-muted">
                {t("result.completedAt", {
                  date: formatDate(submission.data.completedAt, numberLocale),
                })}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <BandChip band={result.band} />
          <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
            {t("result.score", { value: result.score })}
          </span>
        </div>
      </SurfaceCard>

      <SurfaceCard as="section" variant="page">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
          {t("result.summaryHeading")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
          {result.summary}
        </p>
        <div className="app-panel-soft mt-5 rounded-[24px] p-4">
          <p className="text-sm font-medium text-text-primary dark:text-white/95">
            {t("result.nonDiagnosticTitle")}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("result.nonDiagnosticNote")}
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard as="section" variant="page">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
          {t("result.nextStepsHeading")}
        </h2>
        <div className="mt-4 space-y-3">
          {result.nextSteps.map((step) => (
            <div key={step} className="app-panel-soft rounded-[24px] p-4">
              <p className="text-sm leading-6 text-text-secondary">{step}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/patient/assessments"
          className="app-panel-soft flex items-center justify-between rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
        >
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("result.actions.moreAssessments")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("result.actions.moreAssessmentsNote")}
            </p>
          </div>
          <ClipboardList className="h-5 w-5 text-primary" />
        </Link>

        <Link
          href="/patient/matching"
          className="app-panel-soft flex items-center justify-between rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
        >
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("result.actions.guidedMatching")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("result.actions.guidedMatchingNote")}
            </p>
          </div>
          <HeartHandshake className="h-5 w-5 text-primary" />
        </Link>

        <Link
          href="/patient/practitioners"
          className="app-panel-soft flex items-center justify-between rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
        >
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("result.actions.browsePractitioners")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("result.actions.browsePractitionersNote")}
            </p>
          </div>
          <Stethoscope className="h-5 w-5 text-primary" />
        </Link>
      </section>
    </div>
  );
}
