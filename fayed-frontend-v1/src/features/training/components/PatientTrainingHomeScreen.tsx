"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Clock3,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import { usePatientTrainingEnrollments } from "../hooks/use-training";
import type { PatientTrainingEnrollmentItem } from "../types/training.types";
import {
  formatTrainingDatetime,
  getEnrollmentStatusTone,
  getStatusToneClasses,
} from "./training-utils";

function formatCount(locale: string, value: number) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(value);
}

function EnrollmentCard({
  enrollment,
  locale,
}: {
  enrollment: PatientTrainingEnrollmentItem;
  locale: string;
}) {
  const t = useTranslations("training");
  const tone = getEnrollmentStatusTone(enrollment.enrollmentStatus);
  const action =
    enrollment.enrollmentStatus === "PENDING_PAYMENT"
      ? {
          href: `/patient/training/${enrollment.id}/pay`,
          labelKey: "patient.enrollments.actions.completePayment" as const,
          noteKey: "patient.enrollments.nextActions.pendingPayment" as const,
          tone: "amber" as const,
        }
      : enrollment.enrollmentStatus === "ACTIVE"
        ? {
            href: `/patient/training/${enrollment.id}`,
            labelKey: "patient.enrollments.actions.continue" as const,
            noteKey: "patient.enrollments.nextActions.active" as const,
            tone: "emerald" as const,
          }
        : {
            href: `/patient/training/${enrollment.id}`,
            labelKey: "patient.enrollments.actions.review" as const,
            noteKey: "patient.enrollments.nextActions.default" as const,
            tone: "sky" as const,
          };

  return (
    <Link
      href={action.href}
      className="group block rounded-[28px] border border-border-light bg-surface-primary p-4 transition hover:border-primary/25 hover:shadow-soft dark:bg-white/5"
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

          <h3 className="mt-3 text-sm font-semibold text-text-primary transition group-hover:text-primary dark:text-white/95">
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

          <p className="mt-3 text-sm text-text-secondary">{t(action.noteKey)}</p>
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusToneClasses(action.tone)}`}
        >
          {t(action.labelKey)}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function NextStepCard({
  enrollment,
  locale,
}: {
  enrollment: PatientTrainingEnrollmentItem;
  locale: string;
}) {
  const t = useTranslations("training");
  const action =
    enrollment.enrollmentStatus === "PENDING_PAYMENT"
      ? {
          href: `/patient/training/${enrollment.id}/pay`,
          labelKey: "patient.enrollments.actions.completePayment" as const,
          noteKey: "patient.enrollments.nextActions.pendingPayment" as const,
          tone: "amber" as const,
        }
      : enrollment.enrollmentStatus === "ACTIVE"
        ? {
            href: `/patient/training/${enrollment.id}`,
            labelKey: "patient.enrollments.actions.continue" as const,
            noteKey: "patient.enrollments.nextActions.active" as const,
            tone: "emerald" as const,
          }
        : {
            href: `/patient/training/${enrollment.id}`,
            labelKey: "patient.enrollments.actions.review" as const,
            noteKey: "patient.enrollments.nextActions.default" as const,
            tone: "sky" as const,
          };

  return (
    <section className="app-panel rounded-[32px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("patient.home.nextStep.eyebrow")}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
            {t("patient.home.nextStep.heading")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t("patient.home.nextStep.note")}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(action.tone)}`}
        >
          {t(
            `statuses.enrollment.${enrollment.enrollmentStatus}` as Parameters<
              typeof t
            >[0],
          )}
        </span>
      </div>

      <div className="mt-5 rounded-[26px] border border-border-light bg-surface-primary p-4 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("patient.home.nextStep.itemLabel")}
            </p>
            <h3 className="mt-2 text-base font-semibold text-text-primary dark:text-white/95">
              {enrollment.courseTitle}
            </h3>
            <p className="mt-2 text-sm text-text-secondary">{t(action.noteKey)}</p>
          </div>

          <Link
            href={action.href}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            {t(action.labelKey)}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary">
          <span className="rounded-full bg-surface-secondary px-3 py-1 dark:bg-white/5">
            {t("patient.enrollments.scheduleCode", {
              code: enrollment.scheduleCode,
            })}
          </span>
          {enrollment.startsAt ? (
            <span className="rounded-full bg-surface-secondary px-3 py-1 dark:bg-white/5">
              {formatTrainingDatetime(enrollment.startsAt, locale)}
            </span>
          ) : null}
          <span className="rounded-full bg-surface-secondary px-3 py-1 dark:bg-white/5">
            {t(
              `statuses.attendance.${enrollment.attendanceStatus}` as Parameters<
                typeof t
              >[0],
            )}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function PatientTrainingHomeScreen() {
  const t = useTranslations("training");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = usePatientTrainingEnrollments({
    page: 1,
    limit: 10,
  });

  const enrollments = useMemo(() => (data?.items ?? []).slice(), [data?.items]);
  const nextActionCount = enrollments.filter(
    (enrollment) =>
      enrollment.enrollmentStatus === "PENDING_PAYMENT" ||
      enrollment.enrollmentStatus === "ACTIVE",
  ).length;
  const nextEnrollment = enrollments.find(
    (enrollment) =>
      enrollment.enrollmentStatus === "PENDING_PAYMENT" ||
      enrollment.enrollmentStatus === "ACTIVE",
  );

  const stats = useMemo(
    () => ({
      total: data?.pagination.totalItems ?? 0,
      active: enrollments.filter((enrollment) => enrollment.enrollmentStatus === "ACTIVE").length,
      pending: enrollments.filter((enrollment) => enrollment.enrollmentStatus === "PENDING_PAYMENT").length,
    }),
    [data?.pagination.totalItems, enrollments],
  );

  return (
    <div className="app-max-content mx-auto space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("patient.home.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("patient.home.title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
              {t("patient.home.note")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/patient/support"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {t("patient.home.ctas.support")}
            </Link>
            <Link
              href="#my-enrollments"
              className="inline-flex items-center justify-center rounded-full border border-border-light px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-secondary dark:hover:bg-white/5"
            >
              {t("patient.home.ctas.enrollments")}
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("patient.home.stats.total.label")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">
              {formatCount(locale, stats.total)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("patient.home.stats.total.note")}
            </p>
          </div>

          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("patient.home.stats.active.label")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">
              {formatCount(locale, stats.active)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("patient.home.stats.active.note")}
            </p>
          </div>

          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("patient.home.stats.pending.label")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">
              {formatCount(locale, stats.pending)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("patient.home.stats.pending.note")}
            </p>
          </div>

          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("patient.home.stats.next.label")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">
              {formatCount(locale, nextActionCount)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("patient.home.stats.next.note")}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-border-light/70 pt-4 dark:border-white/10">
          <PatientQuickNav />
        </div>
      </section>

      {nextEnrollment ? <NextStepCard enrollment={nextEnrollment} locale={locale} /> : null}

      <section id="my-enrollments" className="app-panel rounded-[32px] p-5 sm:p-6">
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
              icon={<ShieldCheck className="h-5 w-5 text-primary" />}
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
            {enrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <StateCard
              icon={<PlayCircle className="h-5 w-5 text-primary" />}
              title={t("patient.enrollments.states.empty.heading")}
              note={t("patient.enrollments.states.empty.note")}
              centered={false}
              className="rounded-[24px] p-5"
              action={{
                label: t("patient.enrollments.states.empty.action"),
                href: (
                  <Link
                    href="/patient/support"
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-2 text-sm text-text-secondary shadow-theme-xs transition hover:border-primary/30 hover:bg-primary-light hover:text-primary dark:bg-surface-tertiary dark:hover:bg-surface-tertiary/80"
                  >
                    {t("patient.enrollments.states.empty.action")}
                  </Link>
                ),
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
