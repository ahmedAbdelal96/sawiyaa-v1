"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  ClipboardList,
  Clock,
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
  const categoryCount = new Set(items.map((item) => item.category)).size;
  const historyCount = history.data?.items.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Compact Statistics Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border-light bg-white p-4 shadow-[0_8px_24px_rgba(36,86,79,0.04)] dark:bg-surface-secondary text-start flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-muted">{t("home.heroStats.assessmentsLabel")}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white">{items.length}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        <div className="rounded-2xl border border-border-light bg-white p-4 shadow-[0_8px_24px_rgba(36,86,79,0.04)] dark:bg-surface-secondary text-start flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-muted">{t("home.heroStats.categoriesLabel")}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white">{categoryCount}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/40">
            <ClipboardList className="h-4 w-4" />
          </span>
        </div>

        <div className="rounded-2xl border border-border-light bg-white p-4 shadow-[0_8px_24px_rgba(36,86,79,0.04)] dark:bg-surface-secondary text-start flex items-start justify-between col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-muted">{t("home.heroStats.resultsLabel")}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white">{historyCount}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-success-light text-success dark:bg-success/20 dark:text-success-light">
            <Target className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* Available Assessments Panel */}
      <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border-light/60">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <Brain className="h-5 w-5" />
          </span>
          <div className="text-start">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("home.availableHeading")}
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">{t("home.availableNote")}</p>
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
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const Icon = assessmentIcons[hashToken(`${item.slug}-${index}`) % assessmentIcons.length];
              const isAlt = index % 3 === 1;
              const iconShell =
                assessmentIconShells[
                  hashToken(`${item.slug}-icon-${index}`) % assessmentIconShells.length
                ];

              return (
                <article
                  key={item.slug}
                  className={`relative flex flex-col justify-between rounded-[24px] border border-border-light p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:bg-surface-secondary dark:border-border-light/40 ${
                    isAlt ? "bg-primary-light/10 dark:bg-primary/5" : "bg-white"
                  }`}
                >
                  <div className="space-y-4 text-start">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconShell}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            {item.category}
                          </p>
                          <h3 className="text-base font-bold text-text-primary dark:text-white/95">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      {item.estimatedDurationMinutes !== null && (
                        <span className="inline-flex items-center rounded-full bg-primary-light/60 px-2.5 py-0.5 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                          {t("home.card.minutes", { value: item.estimatedDurationMinutes })}
                        </span>
                      )}
                    </div>

                    <p className="text-sm leading-6 text-text-secondary line-clamp-2">
                      {item.description ?? t("home.card.noDescription")}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-border-light/60 pt-4 flex items-center justify-between">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {t("home.card.duration", { value: item.estimatedDurationMinutes ?? 3 })}
                    </span>
                    <Link
                      href={`/patient/assessments/${item.slug}`}
                      className="sawiyaa-btn-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover shadow-sm"
                    >
                      <span>{t("home.card.open")}</span>
                      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Link>
                  </div>
                </article>
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
      </section>

      {/* Recent History Panel */}
      <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border-light/60">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="text-start">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("history.heading")}
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">{t("history.note")}</p>
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
            {history.data.items.map((item) => (
              <div
                key={item.submissionId}
                className="rounded-[24px] border border-border-light bg-white p-5 shadow-sm dark:bg-surface-secondary flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3 text-start">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <div>
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
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <HistoryBandChip band={item.resultBand} />
                  {item.totalScore !== null && (
                    <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-medium text-text-primary dark:bg-white/10 dark:text-white/80">
                      {t("history.score", { value: item.totalScore })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 pt-4 border-t border-border-light/60 w-full">
                  <Link
                    href={`/patient/assessments/submissions/${item.submissionId}`}
                    className="sawiyaa-btn-press inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover shadow-sm"
                  >
                    {t("history.viewResult")}
                  </Link>
                  <Link
                    href={`/patient/assessments/${item.assessmentSlug}`}
                    className="sawiyaa-btn-press inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/25 hover:text-primary dark:bg-white/5"
                  >
                    {t("history.retake")}
                  </Link>
                </div>
              </div>
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
      </section>

      {/* Next Steps Panel */}
      <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border-light/60">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <div className="text-start">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("home.nextHeading")}
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">{t("home.nextNote")}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link
            href="/patient/matching"
            className="group flex items-center justify-between gap-4 rounded-[20px] border border-border-light bg-surface-tertiary/20 p-4 transition-all duration-300 hover:border-primary/25 hover:bg-surface-tertiary/40 text-start"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95 group-hover:text-primary">
                {t("home.nextMatching")}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{t("home.nextMatchingNote")}</p>
            </div>
            <HeartHandshake className="h-5 w-5 shrink-0 text-primary transition group-hover:scale-110" />
          </Link>

          <Link
            href="/patient/messages?lane=support"
            className="group flex items-center justify-between gap-4 rounded-[20px] border border-border-light bg-surface-tertiary/20 p-4 transition-all duration-300 hover:border-primary/25 hover:bg-surface-tertiary/40 text-start"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95 group-hover:text-primary">
                {t("home.nextSupport")}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{t("home.nextSupportNote")}</p>
            </div>
            <LifeBuoy className="h-5 w-5 shrink-0 text-primary transition group-hover:scale-110" />
          </Link>
        </div>
      </section>
    </div>
  );
}
