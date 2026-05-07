"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Brain,
  ClipboardList,
  HeartHandshake,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import { usePatientAssessmentsHistory } from "../hooks/use-assessments";
import type { AssessmentDefinition, AssessmentResultBand } from "../types/assessments.types";

type PatientAssessmentsHomeScreenProps = {
  items: AssessmentDefinition[];
  loadFailed?: boolean;
};

const assessmentIcons = [Brain, ShieldCheck, Sparkles, Target];
const assessmentIconShells = [
  "bg-primary-light text-primary",
  "bg-sky-100 text-sky-600",
  "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-600",
];

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function hashToken(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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

function InsightPill({
  icon: Icon,
  title,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border-light bg-white px-4 py-3 shadow-[0_10px_22px_-20px_rgba(34,52,56,0.16)] dark:bg-surface-secondary">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary dark:text-white/95">{title}</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{note}</p>
      </div>
    </div>
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
  const featuredAssessment = firstAvailableAssessment ?? null;
  const categoryCount = new Set(items.map((item) => item.category)).size;
  const historyCount = history.data?.items.length ?? 0;

  return (
    <div className="app-max-content mx-auto w-full space-y-5 sm:space-y-6">
      <SurfaceCard
        as="section"
        variant="page"
        className="relative overflow-hidden border-primary/10 bg-surface-secondary dark:bg-surface-secondary"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-primary/8 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-primary/8 blur-3xl dark:bg-primary/5"
        />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-center">
          <div className="space-y-6">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t("home.eyebrow")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-4xl">
                {t("home.title")}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
                {t("home.note")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SurfaceStatCard
                label={t("home.heroStats.assessmentsLabel")}
                value={`${items.length}`}
                hint={t("home.heroStats.assessmentsHint")}
                tone="primary"
                icon={<Sparkles className="h-5 w-5" />}
              />
              <SurfaceStatCard
                label={t("home.heroStats.categoriesLabel")}
                value={`${categoryCount}`}
                hint={t("home.heroStats.categoriesHint")}
                tone="neutral"
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <SurfaceStatCard
                label={t("home.heroStats.resultsLabel")}
                value={`${historyCount}`}
                hint={t("home.heroStats.resultsHint")}
                tone="primary"
                icon={<Target className="h-5 w-5" />}
              />
            </div>
          </div>

          <aside className="relative">
            <div className="app-panel-soft relative overflow-hidden rounded-[30px] p-5 sm:p-6">
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {t("home.trustTitle")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/95">
                      {t("home.availableHeading")}
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary shadow-[0_12px_24px_-18px_rgba(68,161,148,0.35)]">
                    <Brain className="h-6 w-6" />
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InsightPill
                    icon={ShieldCheck}
                    title={t("home.trustTitle")}
                    note={t("home.trustNote")}
                  />
                  <InsightPill
                    icon={LifeBuoy}
                    title={t("home.nextSupport")}
                    note={t("home.nextSupportNote")}
                  />
                </div>

                {featuredAssessment ? (
                  <div className="rounded-[24px] border border-border-light bg-white p-4 shadow-[0_16px_28px_-26px_rgba(34,52,56,0.22)] dark:bg-surface-secondary">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {t("home.availableHeading")}
                    </p>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                          {featuredAssessment.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-text-secondary">
                          {featuredAssessment.description ?? t("home.card.noDescription")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                        {featuredAssessment.category}
                      </span>
                      {featuredAssessment.estimatedDurationMinutes !== null && (
                        <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                          {t("home.card.minutes", {
                            value: featuredAssessment.estimatedDurationMinutes,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
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
            {items.map((item, index) => {
              const Icon = assessmentIcons[hashToken(`${item.slug}-${index}`) % assessmentIcons.length];
              const isAlt = index % 3 === 1;
              const iconShell =
                assessmentIconShells[
                  hashToken(`${item.slug}-icon-${index}`) % assessmentIconShells.length
                ];

              return (
                <SurfaceCard
                  key={item.slug}
                  as="article"
                  variant="compact"
                  className={`group relative flex h-full flex-col overflow-hidden border border-border-light bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_40px_-28px_rgba(34,52,56,0.18)] dark:bg-surface-secondary ${
                    isAlt ? "bg-primary-light/35 dark:bg-primary/10" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/8 blur-2xl"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-10 bottom-0 h-20 w-20 rounded-full bg-primary/6 blur-2xl"
                  />

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_10px_22px_-18px_rgba(68,161,148,0.12)] ${iconShell}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
                            {item.category}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold leading-7 text-text-primary dark:text-white/95">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      {item.estimatedDurationMinutes !== null ? (
                        <span className="app-chip rounded-full px-3 py-1 text-xs font-semibold text-primary">
                          {t("home.card.minutes", { value: item.estimatedDurationMinutes })}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 min-h-[3.5rem] text-sm leading-6 text-text-secondary">
                      {item.description ?? t("home.card.noDescription")}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.estimatedDurationMinutes !== null && (
                        <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                          {t("home.card.duration", { value: item.estimatedDurationMinutes })}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 border-t border-border-light/60 pt-4">
                      <Link
                        href={`/patient/assessments/${item.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3"
                      >
                        {t("home.card.open")}
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      </Link>
                    </div>
                  </div>
                </SurfaceCard>
              );
            })}
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
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {history.data.items.map((item, index) => {
              return (
                <SurfaceCard
                  key={item.submissionId}
                  as="article"
                  variant="compact"
                  className="overflow-hidden border border-border-light bg-white transition hover:border-primary/25 dark:bg-surface-secondary"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                          <ClipboardList className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                            {item.assessmentTitle}
                          </h3>
                          <p className="mt-1 text-xs text-text-muted">
                            {t("history.completedAt", {
                              date: formatDate(item.completedAt ?? item.createdAt, numLocale),
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <HistoryBandChip band={item.resultBand} />
                        {item.totalScore !== null && (
                          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                            {t("history.score", { value: item.totalScore })}
                          </span>
                        )}
                      </div>
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
              );
            })}
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

      <SurfaceCard as="section" variant="page" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("home.nextHeading")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{t("home.nextNote")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Link
              href="/patient/matching"
              className="app-panel-soft group flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("home.nextMatching")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">{t("home.nextMatchingNote")}</p>
              </div>
              <HeartHandshake className="h-5 w-5 shrink-0 text-primary transition group-hover:scale-110" />
            </Link>

            <Link
              href="/patient/support"
              className="app-panel-soft group flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("home.nextSupport")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">{t("home.nextSupportNote")}</p>
              </div>
              <LifeBuoy className="h-5 w-5 shrink-0 text-primary transition group-hover:scale-110" />
            </Link>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
