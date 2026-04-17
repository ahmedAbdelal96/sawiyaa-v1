"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Brain, ClipboardList, HeartHandshake, LifeBuoy, Sparkles } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { usePatientAssessmentsHistory } from "../hooks/use-assessments";
import type { AssessmentDefinition, AssessmentResultBand } from "../types/assessments.types";

type PatientAssessmentsHomeScreenProps = {
  items: AssessmentDefinition[];
  loadFailed?: boolean;
};

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function HistoryBandChip({ band }: { band: AssessmentResultBand | null }) {
  const t = useTranslations("assessments");

  if (!band) return null;

  return (
    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
      {t(`result.bands.${band}.title` as Parameters<typeof t>[0])}
    </span>
  );
}

export default function PatientAssessmentsHomeScreen({
  items,
  loadFailed = false,
}: PatientAssessmentsHomeScreenProps) {
  const t = useTranslations("assessments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const history = usePatientAssessmentsHistory({ page: 1, limit: 6, status: "COMPLETED" });
  const firstAvailableAssessment = items[0] ?? null;

  return (
    <div className="app-max-content mx-auto w-full space-y-5 sm:space-y-6">
      <SurfaceCard as="section" variant="page">
        <div className="flex flex-wrap items-start justify-between gap-4 lg:gap-6">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("home.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("home.title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
              {t("home.note")}
            </p>
          </div>

          <div className="app-panel-soft w-full rounded-2xl px-4 py-3 text-sm text-text-secondary sm:w-auto">
            <div className="flex items-center gap-2 text-text-primary dark:text-white/90">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">{t("home.trustTitle")}</span>
            </div>
            <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">
              {t("home.trustNote")}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard as="section" variant="page">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <Brain className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("home.availableHeading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("home.availableNote")}</p>
          </div>
        </div>

        {loadFailed ? (
          <StateCard
            className="mt-5"
            centered={false}
            title={t("states.catalogError.heading")}
            note={t("states.catalogError.note")}
          />
        ) : items.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <SurfaceCard key={item.slug} as="article" variant="compact" className="flex h-full flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                    {item.category}
                  </span>
                  {item.estimatedDurationMinutes !== null && (
                    <span className="text-xs font-medium text-text-muted">
                      {t("home.card.minutes", { value: item.estimatedDurationMinutes })}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary dark:text-white/95">
                  {item.title}
                </h3>
                <p className="mt-2 min-h-[3rem] text-sm leading-6 text-text-secondary">
                  {item.description ?? t("home.card.noDescription")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.estimatedDurationMinutes !== null && (
                    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                      {t("home.card.duration", { value: item.estimatedDurationMinutes })}
                    </span>
                  )}
                </div>
                <Link
                  href={`/patient/assessments/${item.slug}`}
                  className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium text-primary hover:underline"
                  >
                    {t("home.card.open")}
                  </Link>
              </SurfaceCard>
            ))}
          </div>
        ) : (
          <StateCard
            className="mt-5"
            centered={false}
            title={t("home.empty.heading")}
            note={t("home.empty.note")}
            action={{
              label: t("result.actions.guidedMatching"),
              href: (
                <Link
                  href="/patient/matching"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  {t("result.actions.guidedMatching")}
                </Link>
              ),
            }}
          />
        )}
      </SurfaceCard>

      <SurfaceCard as="section" variant="page">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("history.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("history.note")}</p>
          </div>
        </div>

        {history.isLoading ? (
          <div className="mt-5">
            <ListStateSkeleton items={3} heightClass="h-24" />
          </div>
        ) : history.isError ? (
          <StateCard
            className="mt-5"
            centered={false}
            title={t("states.historyError.heading")}
            note={t("states.historyError.note")}
            action={{
              label: t("states.resultError.retry"),
              onClick: () => history.refetch(),
            }}
          />
        ) : history.data && history.data.items.length > 0 ? (
          <div className="mt-5 space-y-3">
            {history.data.items.map((item) => (
              <SurfaceCard key={item.submissionId} as="article" variant="compact">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {item.assessmentTitle}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <HistoryBandChip band={item.resultBand} />
                      {item.totalScore !== null && (
                        <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                          {t("history.score", { value: item.totalScore })}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-text-muted">
                      {t("history.completedAt", {
                        date: formatDate(item.completedAt ?? item.createdAt, numLocale),
                      })}
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                    <Link
                      href={`/patient/assessments/submissions/${item.submissionId}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover sm:w-auto"
                    >
                      {t("history.viewResult")}
                    </Link>
                    <Link
                      href={`/patient/assessments/${item.assessmentSlug}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border-light px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/25 hover:text-primary sm:w-auto"
                    >
                      {t("history.retake")}
                    </Link>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        ) : (
          <StateCard
            className="mt-5"
            centered={false}
            title={t("history.empty.heading")}
            note={t("history.empty.note")}
            action={
              firstAvailableAssessment
                ? {
                    label: t("actions.start"),
                    href: (
                      <Link
                        href={`/patient/assessments/${firstAvailableAssessment.slug}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                      >
                        {t("actions.start")}
                      </Link>
                    ),
                  }
                : {
                    label: t("result.actions.guidedMatching"),
                    href: (
                      <Link
                        href="/patient/matching"
                        className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                      >
                        {t("result.actions.guidedMatching")}
                      </Link>
                    ),
                  }
            }
          />
        )}
      </SurfaceCard>

      <SurfaceCard as="section" variant="page">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {t("home.nextHeading")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("home.nextNote")}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link
            href="/patient/matching"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("home.nextMatching")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t("home.nextMatchingNote")}</p>
            </div>
            <HeartHandshake className="h-5 w-5 shrink-0 text-primary" />
          </Link>

          <Link
            href="/patient/support"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("home.nextSupport")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t("home.nextSupportNote")}</p>
            </div>
            <LifeBuoy className="h-5 w-5 shrink-0 text-primary" />
          </Link>
        </div>
      </SurfaceCard>
    </div>
  );
}
