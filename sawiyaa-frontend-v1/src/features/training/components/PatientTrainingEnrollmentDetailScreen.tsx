"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { formatViewerDateTime } from "@/lib/time-formatting";
import {
  usePatientTrainingEnrollment,
  useResolvePatientTrainingJoinAccess,
} from "../hooks/use-training";
import {
  formatTrainingAmount,
  getAttendanceStatusTone,
  getEnrollmentStatusTone,
  getPaymentStatusTone,
  getStatusToneClasses,
  getTrainingJoinBlockedReasonKey,
} from "./training-utils";

type Props = {
  enrollmentId: string;
};

export default function PatientTrainingEnrollmentDetailScreen({ enrollmentId }: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const { data: enrollment, isLoading, isError, refetch } =
    usePatientTrainingEnrollment(enrollmentId);
  const joinMutation = useResolvePatientTrainingJoinAccess();
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  if (isLoading) {
    return (
          <div className="app-max-content mx-auto">
        <ListStateSkeleton items={3} heightClass="h-32" />
      </div>
    );
  }

  if (isError || !enrollment) {
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("patient.detail.states.error.heading")}
        note={t("patient.detail.states.error.note")}
        action={{
          label: t("patient.detail.states.error.retry"),
          href: (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
              >
                {t("patient.detail.states.error.retry")}
              </button>
              <Link
                href="/patient/training"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("patient.detail.back")}
              </Link>
            </div>
          ),
        }}
      />
    );
  }

  const enrollmentTone = getEnrollmentStatusTone(enrollment.enrollmentStatus);
  const attendanceTone = getAttendanceStatusTone(enrollment.attendanceStatus);
  const paymentTone = enrollment.payment
    ? getPaymentStatusTone(enrollment.payment.status)
    : null;

  const handleResolveJoin = async () => {
    try {
      const result = await joinMutation.mutateAsync(enrollment.id);
      setJoinUrl(result.canJoin ? result.joinUrl : null);
    } catch {
      setJoinUrl(null);
    }
  };

  return (
      <div className="app-max-content mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/patient/training"
          className="inline-flex items-center justify-center rounded-full border border-border-light px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-secondary dark:hover:bg-white/5"
        >
          {t("patient.detail.back")}
        </Link>
        <Link
          href="/patient/messages?lane=support"
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm text-primary transition hover:underline"
        >
          {t("patient.detail.support")}
        </Link>
      </div>

      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("patient.detail.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {enrollment.courseTitle}
            </h1>
            <p className="mt-3 text-sm text-text-secondary">
              {t("patient.detail.scheduleCode", { code: enrollment.scheduleCode })}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(enrollmentTone)}`}
          >
            {t(
              `statuses.enrollment.${enrollment.enrollmentStatus}` as Parameters<typeof t>[0],
            )}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("patient.detail.startsAt")}
                </p>
                <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
                  {enrollment.startsAt
                    ? formatViewerDateTime(enrollment.startsAt, {
                        locale: locale === "ar" ? "ar-SA" : "en-US",
                      })
                    : t("patient.detail.notScheduled")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("patient.detail.attendance")}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(attendanceTone)}`}
                >
                  {t(
                    `statuses.attendance.${enrollment.attendanceStatus}` as Parameters<
                      typeof t
                    >[0],
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border-light bg-surface-primary p-6 dark:bg-white/5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("patient.detail.currentStateHeading")}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t(
            `patient.detail.stateNotes.${enrollment.enrollmentStatus}` as Parameters<
              typeof t
            >[0],
          )}
        </p>
      </section>

      {enrollment.payment ? (
        <section className="rounded-[32px] border border-border-light bg-surface-primary p-6 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("patient.detail.paymentHeading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t(
                  `patient.detail.paymentNotes.${enrollment.payment.status}` as Parameters<
                    typeof t
                  >[0],
                )}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(paymentTone ?? "slate")}`}
            >
              {t(`statuses.payment.${enrollment.payment.status}` as Parameters<typeof t>[0])}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("patient.detail.paymentAmount")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
                {formatTrainingAmount(
                  enrollment.payment.amount,
                  enrollment.payment.currency,
                  locale,
                )}
              </p>
            </div>
            <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("patient.detail.paymentProvider")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
                {t(
                  `statuses.paymentProvider.${enrollment.payment.provider}` as Parameters<
                    typeof t
                  >[0],
                )}
              </p>
            </div>
          </div>

          {enrollment.enrollmentStatus === "PENDING_PAYMENT" ? (
            <div className="mt-4">
              <Link
                href={`/patient/training/${enrollment.id}/pay` as never}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
              >
                {t("patient.detail.completePayment")}
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[32px] border border-border-light bg-surface-primary p-6 dark:bg-white/5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("patient.detail.joinHeading")}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {t("patient.detail.joinNote")}
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleResolveJoin}
            disabled={joinMutation.isPending}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/90 sm:w-auto"
          >
            {joinMutation.isPending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("patient.detail.joinActions.checking")}
              </>
            ) : (
              t("patient.detail.joinActions.check")
            )}
          </button>

          {joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" />
              {t("patient.detail.joinActions.open")}
            </a>
          ) : null}
        </div>

        {joinMutation.data && !joinMutation.data.canJoin ? (
          <div className="mt-4 rounded-[24px] border border-border-light bg-surface-secondary px-5 py-4 text-sm text-text-secondary dark:bg-white/5">
            {t(
              `patient.detail.joinBlocked.${getTrainingJoinBlockedReasonKey(joinMutation.data.blockedReason)}` as Parameters<
                typeof t
              >[0],
            )}
          </div>
        ) : null}

        {joinUrl ? (
          <div className="mt-4 rounded-[24px] border border-primary/15 bg-primary-light px-5 py-4 text-sm text-text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-white/90">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>{t("patient.detail.joinReady")}</p>
            </div>
          </div>
        ) : null}

        {joinMutation.isError ? (
          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/10 dark:text-amber-300">
            {t("patient.detail.joinError")}
          </div>
        ) : null}
      </section>
    </div>
  );
}
