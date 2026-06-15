"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle, Clock3, Loader2, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePatientTrainingEnrollment } from "../hooks/use-training";
import {
  formatTrainingAmount,
  formatTrainingDatetime,
  getPaymentStatusTone,
  getStatusToneClasses,
} from "./training-utils";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 15_000;

type Props = {
  enrollmentId: string;
  redirectStatus: string | null;
};

export default function TrainingEnrollmentPaymentReturnPanel({
  enrollmentId,
  redirectStatus,
}: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const retryHref = `/patient/training/${enrollmentId}/pay` as const;
  const detailHref = `/patient/training/${enrollmentId}` as const;

  const isPotentiallySucceeded = redirectStatus === "succeeded";
  const [verificationTimedOut, setVerificationTimedOut] = useState(false);

  const { data: enrollment, isLoading, isError, refetch } =
    usePatientTrainingEnrollment(enrollmentId);

  const isConfirmed = enrollment?.enrollmentStatus === "ACTIVE";
  const shouldPoll = isPotentiallySucceeded && !verificationTimedOut && !isConfirmed;

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refetch();
    }, POLL_INTERVAL_MS);
    const timeoutId = window.setTimeout(() => {
      setVerificationTimedOut(true);
    }, MAX_POLL_DURATION_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [refetch, shouldPoll]);

  const paymentStatusTone = enrollment?.payment
    ? getPaymentStatusTone(enrollment.payment.status)
    : "slate";

  const amountLabel = enrollment?.payment
    ? formatTrainingAmount(
        enrollment.payment.amount,
        enrollment.payment.currency,
        locale,
      )
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ListStateSkeleton items={3} heightClass="h-12" />
        <div className="h-28 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
      </div>
    );
  }

  if (isError || !enrollment) {
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("patient.return.states.error.heading")}
        note={t("patient.return.states.error.note")}
        action={{
          label: t("patient.return.states.error.retry"),
          onClick: () => refetch(),
        }}
      />
    );
  }

  const isFailed = redirectStatus === "failed";
  const isCanceled = redirectStatus === "canceled";
  const isVerifying = shouldPoll;

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-border-light bg-surface-primary p-6 dark:bg-white/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t("patient.return.summaryHeading")}
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text-primary dark:text-white/95">
          {enrollment.courseTitle}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("patient.pay.scheduleCode", { code: enrollment.scheduleCode })}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] bg-surface-secondary px-4 py-3 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("patient.return.amountLabel")}
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
              {amountLabel ?? t("patient.return.notAvailable")}
            </p>
          </div>
          <div className="rounded-[24px] bg-surface-secondary px-4 py-3 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("patient.return.statusLabel")}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(paymentStatusTone)}`}
            >
              {enrollment.payment
                ? t(`statuses.payment.${enrollment.payment.status}` as Parameters<typeof t>[0])
                : t("patient.return.notAvailable")}
            </span>
          </div>
        </div>

        {enrollment.startsAt ? (
          <p className="mt-4 text-sm text-text-secondary">
            {t("patient.return.startsAt", {
              value: formatTrainingDatetime(enrollment.startsAt, locale),
            })}
          </p>
        ) : null}
      </section>

      {isVerifying ? (
        <StateCard
          icon={<Loader2 className="h-5 w-5 animate-spin text-primary" />}
          title={t("patient.return.verifying.heading")}
          note={t("patient.return.verifying.note")}
        />
      ) : null}

      {isConfirmed ? (
        <StateCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          title={t("patient.return.success.heading")}
          note={t("patient.return.success.note")}
          action={{
            href: (
              <Link
                href={detailHref}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("patient.return.success.action")}
              </Link>
            ),
            label: t("patient.return.success.action"),
          }}
        />
      ) : null}

      {!isConfirmed && isFailed ? (
        <StateCard
          icon={<XCircle className="h-5 w-5 text-error-500" />}
          title={t("patient.return.failed.heading")}
          note={t("patient.return.failed.note")}
          action={{
            href: (
              <Link
                href={retryHref}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("patient.return.failed.action")}
              </Link>
            ),
            label: t("patient.return.failed.action"),
          }}
        />
      ) : null}

      {!isConfirmed && isCanceled ? (
        <StateCard
          icon={<Clock3 className="h-5 w-5 text-warning-500" />}
          title={t("patient.return.canceled.heading")}
          note={t("patient.return.canceled.note")}
          action={{
            href: (
              <Link
                href={retryHref}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("patient.return.canceled.action")}
              </Link>
            ),
            label: t("patient.return.canceled.action"),
          }}
        />
      ) : null}

      {!isConfirmed && !isVerifying && !isFailed && !isCanceled ? (
        <StateCard
          icon={<Clock3 className="h-5 w-5 text-primary" />}
          title={t("patient.return.pending.heading")}
          note={t("patient.return.pending.note")}
          action={{
            href: (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={detailHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-secondary dark:text-white/90 dark:hover:bg-white/5"
                >
                  {t("patient.return.pending.viewEnrollment")}
                </Link>
                <Link
                  href={retryHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  {t("patient.return.pending.action")}
                </Link>
              </div>
            ),
            label: t("patient.return.pending.action"),
          }}
        />
      ) : null}
    </div>
  );
}
