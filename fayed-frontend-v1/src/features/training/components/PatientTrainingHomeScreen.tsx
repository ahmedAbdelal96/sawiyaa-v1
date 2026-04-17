"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BookOpen, Clock3, GraduationCap, PlayCircle } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePatientTrainingEnrollments } from "../hooks/use-training";
import type { PublicTrainingsListData } from "../types/training.types";
import {
  formatTrainingDatetime,
  getEnrollmentStatusTone,
  getStatusToneClasses,
  getTrainingCardSummary,
} from "./training-utils";

type Props = {
  catalog: PublicTrainingsListData;
};

export default function PatientTrainingHomeScreen({ catalog }: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = usePatientTrainingEnrollments({
    page: 1,
    limit: 10,
  });

  const enrollments = data?.items ?? [];

  return (
    <div className="app-max-content mx-auto space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("patient.home.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
          {t("patient.home.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
          {t("patient.home.note")}
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("patient.home.scopeHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>{t("patient.home.scopeItems.catalog")}</li>
              <li>{t("patient.home.scopeItems.enrollment")}</li>
              <li>{t("patient.home.scopeItems.join")}</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-border-light bg-surface-primary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("patient.home.boundaryHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>{t("patient.home.boundaryItems.noLms")}</li>
              <li>{t("patient.home.boundaryItems.noCertificates")}</li>
              <li>{t("patient.home.boundaryItems.noQuizzes")}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="app-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("patient.enrollments.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t("patient.enrollments.note")}
              </p>
            </div>
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {data
                ? t("patient.enrollments.count", { value: data.pagination.totalItems })
                : t("patient.enrollments.loadingCount")}
            </span>
          </div>

          {isLoading ? (
            <div className="mt-5">
              <ListStateSkeleton items={3} heightClass="h-28" />
            </div>
          ) : isError ? (
            <div className="mt-5">
              <StateCard
                title={t("patient.enrollments.states.error.heading")}
                note={t("patient.enrollments.states.error.note")}
                action={{
                  label: t("patient.enrollments.states.error.retry"),
                  onClick: () => refetch(),
                }}
                className="rounded-[24px]"
              />
            </div>
          ) : enrollments.length > 0 ? (
            <div className="mt-5 space-y-3">
              {enrollments.map((enrollment) => {
                const tone = getEnrollmentStatusTone(enrollment.enrollmentStatus);
                return (
                  <Link
                    key={enrollment.id}
                    href={`/patient/training/${enrollment.id}` as never}
                    className="app-panel-soft block rounded-[24px] p-4 transition hover:border-primary/25"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(tone)}`}
                          >
                            {t(
                              `statuses.enrollment.${enrollment.enrollmentStatus}` as Parameters<
                                typeof t
                              >[0],
                            )}
                          </span>
                          <span className="text-xs text-text-muted">
                            {t("patient.enrollments.scheduleCode", {
                              code: enrollment.scheduleCode,
                            })}
                          </span>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-text-primary dark:text-white/95">
                          {enrollment.courseTitle}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-secondary">
                          {enrollment.startsAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatTrainingDatetime(enrollment.startsAt, locale)}
                            </span>
                          ) : null}
                          <span>
                            {t(
                              `statuses.attendance.${enrollment.attendanceStatus}` as Parameters<
                                typeof t
                              >[0],
                            )}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-2 text-xs font-medium text-primary">
                        {enrollment.enrollmentStatus === "ACTIVE"
                          ? t("patient.enrollments.actions.continue")
                          : enrollment.enrollmentStatus === "PENDING_PAYMENT"
                            ? t("patient.enrollments.actions.completePayment")
                            : t("patient.enrollments.actions.review")}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <StateCard
                icon={<PlayCircle className="h-5 w-5 text-primary" />}
                title={t("patient.enrollments.states.empty.heading")}
                note={t("patient.enrollments.states.empty.note")}
                centered={false}
                className="rounded-[24px] p-5"
              />
            </div>
          )}
        </div>

        <div className="app-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("patient.catalog.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t("patient.catalog.note")}
              </p>
            </div>
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t("patient.catalog.count", { value: catalog.pagination.totalItems })}
            </span>
          </div>

          {catalog.items.length > 0 ? (
            <div className="mt-5 space-y-3">
              {catalog.items.map((training) => {
                const summary = getTrainingCardSummary(training, locale);
                return (
                  <Link
                    key={training.id}
                    href={`/patient/training/catalog/${training.slug}` as never}
                    className="app-panel-soft block rounded-[24px] p-4 transition hover:border-primary/25"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                        <GraduationCap className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                            {t(
                              `courseTypes.${training.courseType}` as Parameters<typeof t>[0],
                            )}
                          </span>
                          {summary.published ? (
                            <span className="text-xs text-text-muted">
                              {t("patient.catalog.publishedAt", { date: summary.published })}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-text-primary dark:text-white/95">
                          {training.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          {summary.description ?? t("patient.catalog.fallbackDescription")}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary">
                          <BookOpen className="h-3.5 w-3.5" />
                          {t("patient.catalog.openDetails")}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <StateCard
                icon={<GraduationCap className="h-5 w-5 text-primary" />}
                title={t("patient.catalog.states.empty.heading")}
                note={t("patient.catalog.states.empty.note")}
                centered={false}
                className="rounded-[24px] p-5"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
