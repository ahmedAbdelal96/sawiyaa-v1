"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Clock3,
  PlayCircle,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { formatViewerDateTime } from "@/lib/time-formatting";
import { usePatientTrainingEnrollments } from "../hooks/use-training";
import type { PatientTrainingEnrollmentItem } from "../types/training.types";
import {
  getEnrollmentStatusTone,
  getStatusToneClasses,
} from "./training-utils";

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
      className="group block rounded-[20px] border border-border-light bg-white p-5 transition hover:border-primary/25 hover:shadow-[0_4px_12px_rgba(36,86,79,0.06)] dark:bg-white/5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusToneClasses(tone)}`}
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

          <h3 className="mt-3 text-base font-bold text-text-primary transition group-hover:text-primary dark:text-white/95">
            {enrollment.courseTitle}
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            {enrollment.startsAt ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-text-muted" />
                {formatViewerDateTime(enrollment.startsAt, { locale: locale === "ar" ? "ar-SA" : "en-US" })}
              </span>
            ) : null}
            <span className="inline-block h-1 w-1 rounded-full bg-border-strong/60" />
            <span>
              {t(
                `statuses.attendance.${enrollment.attendanceStatus}` as Parameters<
                  typeof t
                >[0],
              )}
            </span>
          </div>

          <p className="mt-3 text-sm text-text-secondary leading-relaxed">{t(action.noteKey)}</p>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusToneClasses(action.tone)}`}
        >
          {t(action.labelKey)}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
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
    <section className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {t("patient.home.nextStep.eyebrow")}
          </p>
          <h2 className="mt-2 text-lg font-bold text-text-primary dark:text-white/95">
            {t("patient.home.nextStep.heading")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary leading-relaxed">
            {t("patient.home.nextStep.note")}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusToneClasses(action.tone)}`}
        >
          {t(
            `statuses.enrollment.${enrollment.enrollmentStatus}` as Parameters<
              typeof t
            >[0],
          )}
        </span>
      </div>

      <div className="mt-5 rounded-[20px] border border-border-light bg-surface-tertiary p-5 dark:bg-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {t("patient.home.nextStep.itemLabel")}
            </p>
            <h3 className="mt-2 text-base font-bold text-text-primary dark:text-white/95">
              {enrollment.courseTitle}
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">{t(action.noteKey)}</p>
          </div>

          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center justify-center rounded-[14px] bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            {t(action.labelKey)}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-secondary border-t border-border-light/50 pt-3">
          <span className="rounded-full bg-white px-3 py-1 border border-border-light dark:bg-white/5">
            {t("patient.enrollments.scheduleCode", {
              code: enrollment.scheduleCode,
            })}
          </span>
          {enrollment.startsAt ? (
            <span className="rounded-full bg-white px-3 py-1 border border-border-light dark:bg-white/5">
              {formatViewerDateTime(enrollment.startsAt, { locale: locale === "ar" ? "ar-SA" : "en-US" })}
            </span>
          ) : null}
          <span className="rounded-full bg-white px-3 py-1 border border-border-light dark:bg-white/5">
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
    <div className="app-max-content mx-auto space-y-6 px-4 py-6 sm:py-8">
      {/* Hero section */}
      <section className="rounded-[24px] border border-border-light bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {t("patient.home.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("patient.home.title")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              {t("patient.home.note")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/patient/messages?lane=support"
              className="inline-flex items-center justify-center rounded-[14px] border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-surface-tertiary"
            >
              {t("patient.home.ctas.support")}
            </Link>
            <Link
              href="/academy"
              className="inline-flex items-center justify-center rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover shadow-sm"
            >
              <Compass className="me-1.5 h-4 w-4" />
              {locale === "ar" ? "استكشاف البرامج" : "Explore Programs"}
            </Link>
          </div>
        </div>

        {/* Clean, Flat stats grid matching Sawiyaa design system (Calm Sage / Charcoal) */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Enrollments */}
          <div className="rounded-[16px] bg-surface-tertiary border border-border-light p-4.5 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {t("patient.home.stats.total.label")}
            </p>
            <p className="mt-2.5 text-2xl font-bold text-text-primary dark:text-white/95 font-mono">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-text-secondary leading-normal">
              {t("patient.home.stats.total.note")}
            </p>
          </div>

          {/* Active Enrollments */}
          <div className="rounded-[16px] bg-surface-tertiary border border-border-light p-4.5 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {t("patient.home.stats.active.label")}
            </p>
            <p className="mt-2.5 text-2xl font-bold text-text-primary dark:text-white/95 font-mono">
              {stats.active}
            </p>
            <p className="mt-1 text-xs text-text-secondary leading-normal">
              {t("patient.home.stats.active.note")}
            </p>
          </div>

          {/* Pending Payment */}
          <div className="rounded-[16px] bg-surface-tertiary border border-border-light p-4.5 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {t("patient.home.stats.pending.label")}
            </p>
            <p className="mt-2.5 text-2xl font-bold text-text-primary dark:text-white/95 font-mono">
              {stats.pending}
            </p>
            <p className="mt-1 text-xs text-text-secondary leading-normal">
              {t("patient.home.stats.pending.note")}
            </p>
          </div>

          {/* Attention items */}
          <div className="rounded-[16px] bg-surface-tertiary border border-border-light p-4.5 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {t("patient.home.stats.next.label")}
            </p>
            <p className="mt-2.5 text-2xl font-bold text-text-primary dark:text-white/95 font-mono">
              {nextActionCount}
            </p>
            <p className="mt-1 text-xs text-text-secondary leading-normal">
              {t("patient.home.stats.next.note")}
            </p>
          </div>
        </div>
      </section>

      {nextEnrollment ? <NextStepCard enrollment={nextEnrollment} locale={locale} /> : null}

      <section id="my-enrollments" className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary dark:text-white/95">
              {t("patient.enrollments.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary leading-relaxed">
              {t("patient.enrollments.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-semibold">
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
              className="rounded-[20px]"
            />
          </div>
        ) : enrollments.length > 0 ? (
          <div className="mt-5 space-y-3.5">
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
              className="rounded-[20px] p-5"
              action={{
                label: t("patient.enrollments.states.empty.action"),
                href: (
                  <div className="flex flex-wrap gap-2.5">
                    <Link
                      href="/academy"
                      className="inline-flex items-center justify-center rounded-[14px] bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover shadow-sm"
                    >
                      {locale === "ar" ? "استكشاف البرامج التدريبية" : "Explore Training Programs"}
                    </Link>
                    <Link
                      href="/patient/messages?lane=support"
                      className="inline-flex items-center justify-center rounded-[14px] border border-border-light bg-white px-5 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary dark:bg-surface-tertiary"
                    >
                      {t("patient.enrollments.states.empty.action")}
                    </Link>
                  </div>
                ),
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
