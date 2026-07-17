"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import {
  resolveAcademyProgramEnrollmentStatusLabel,
  resolveAcademyProgramPaymentStatusLabel,
} from "../lib/academy-program-localization";
import { usePublicAcademyProgramEnrollment } from "../hooks/use-academy-programs";
import type { AcademyProgramEnrollmentItem } from "../types/academy-programs.types";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 15_000;

type ReturnState =
  | "confirmed"
  | "failed"
  | "canceled"
  | "expired"
  | "unavailable"
  | "pending"
  | "verifying";

function isFinalEnrollmentState(enrollment: AcademyProgramEnrollmentItem) {
  return (
    enrollment.status === "UPCOMING" ||
    enrollment.paymentStatus === "CAPTURED" ||
    enrollment.status === "CANCELLED" ||
    enrollment.status === "EXPIRED" ||
    enrollment.paymentStatus === "FAILED" ||
    enrollment.paymentStatus === "CANCELLED" ||
    enrollment.paymentStatus === "EXPIRED"
  );
}

function getReturnState(enrollment: AcademyProgramEnrollmentItem, redirectStatus: string | null) {
  if (enrollment.status === "UPCOMING" || enrollment.paymentStatus === "CAPTURED") {
    return "confirmed";
  }

  if (enrollment.status === "CANCELLED" || enrollment.paymentStatus === "CANCELLED") {
    return "canceled";
  }

  if (enrollment.status === "EXPIRED" || enrollment.paymentStatus === "EXPIRED") {
    return "expired";
  }

  if (enrollment.paymentStatus === "FAILED" || redirectStatus === "failed") {
    return "failed";
  }

  if (redirectStatus === "canceled") {
    return "canceled";
  }

  if (redirectStatus === "payment_expired") {
    return "expired";
  }

  if (redirectStatus === "payment_unavailable") {
    return "unavailable";
  }

  return "pending";
}

function buildRetryHref(enrollmentId: string, token: string) {
  return `/academy/program-enrollments/${enrollmentId}/pay/redirect?token=${encodeURIComponent(
    token,
  )}`;
}

function ResultHeader({
  state,
  t,
}: {
  state: ReturnState;
  t: ReturnType<typeof useTranslations>;
}) {
  if (state === "verifying") {
    return (
      <>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-4 text-xl font-bold text-text-primary">{t("return.verifying.heading")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t("return.verifying.note")}</p>
      </>
    );
  }

  if (state === "confirmed") {
    return (
      <>
        <CheckCircle className="h-12 w-12 text-primary" />
        <h2 className="mt-4 text-xl font-bold text-text-primary">{t("return.confirmed.heading")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t("return.confirmed.note")}</p>
      </>
    );
  }

  if (state === "failed") {
    return (
      <>
        <AlertCircle className="h-12 w-12 text-error-500" />
        <h2 className="mt-4 text-xl font-bold text-text-primary">{t("return.failed.heading")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t("return.failed.note")}</p>
      </>
    );
  }

  if (state === "canceled") {
    return (
      <>
        <Clock className="h-12 w-12 text-warning-500" />
        <h2 className="mt-4 text-xl font-bold text-text-primary">{t("return.canceled.heading")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t("return.canceled.note")}</p>
      </>
    );
  }

  if (state === "expired") {
    return (
      <>
        <Clock className="h-12 w-12 text-warning-500" />
        <h2 className="mt-4 text-xl font-bold text-text-primary">{t("return.expired.heading")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t("return.expired.note")}</p>
      </>
    );
  }

  if (state === "unavailable") {
    return (
      <>
        <AlertCircle className="h-12 w-12 text-text-muted" />
        <h2 className="mt-4 text-xl font-bold text-text-primary">{t("return.unavailable.heading")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t("return.unavailable.note")}</p>
      </>
    );
  }

  return (
    <>
      <Clock className="h-12 w-12 text-text-muted" />
      <h2 className="mt-4 text-xl font-bold text-text-primary">{t("return.pending.heading")}</h2>
      <p className="mt-2 text-sm text-text-secondary">{t("return.pending.note")}</p>
    </>
  );
}

export default function PublicAcademyProgramPaymentReturnScreen({
  enrollmentId,
  token,
  redirectStatus,
  providerReference,
}: {
  enrollmentId: string;
  token: string;
  redirectStatus: string | null;
  providerReference: string | null;
}) {
  const t = useTranslations("academy");
  const [pollingActive, setPollingActive] = useState(redirectStatus === "succeeded");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: enrollment, isLoading, isError, refetch } = usePublicAcademyProgramEnrollment(
    enrollmentId,
    token,
  );

  useEffect(() => {
    if (!pollingActive) {
      return;
    }

    void refetch();

    intervalRef.current = setInterval(() => {
      void refetch();
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      setPollingActive(false);
    }, MAX_POLL_DURATION_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pollingActive, refetch]);

  useEffect(() => {
    if (!enrollment || !pollingActive) {
      return;
    }

    if (isFinalEnrollmentState(enrollment)) {
      setPollingActive(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [enrollment, pollingActive]);

  const state = enrollment ? getReturnState(enrollment, redirectStatus) : "pending";
  const isVerifying = pollingActive && redirectStatus === "succeeded" && state === "pending";
  const headerState: ReturnState = isVerifying ? "verifying" : state;
  const retryHref = buildRetryHref(enrollmentId, token);
  const programHref = enrollment ? `/academy/${enrollment.program.slug}` : "/academy";
  const enrollmentStatusLabel = enrollment
    ? resolveAcademyProgramEnrollmentStatusLabel(enrollment.status, t)
    : null;
  const paymentStatusLabel = enrollment
    ? resolveAcademyProgramPaymentStatusLabel(enrollment.paymentStatus, t)
    : null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="h-64 animate-pulse rounded-[24px] border border-border-light bg-surface-tertiary" />
      </div>
    );
  }

  if (isError || !enrollment) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <StateCard
          icon={<AlertCircle size={40} className="text-primary" />}
          title={t("return.error.heading")}
          note={t("return.error.note")}
          action={{
            label: t("return.backToAcademy"),
            href: (
              <Link
                href="/academy"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t("return.backToAcademy")}
              </Link>
            ),
          }}
        />
      </div>
    );
  }

  const programTitle = enrollment.program.title;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-[0_18px_48px_rgba(31,42,45,0.06)] sm:p-8">
        <div className="text-center">
          <ResultHeader state={headerState} t={t} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border-light bg-surface-tertiary p-4 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("return.details.program")}
            </div>
            <div className="mt-1 text-sm font-bold text-text-primary">{programTitle}</div>
          </div>
          <div className="rounded-xl border border-border-light bg-surface-tertiary p-4 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("return.details.reference")}
            </div>
            <div className="mt-1 break-all font-mono text-sm font-bold text-text-primary">
              {enrollment.publicAccessToken}
            </div>
          </div>
          <div className="rounded-xl border border-border-light bg-surface-tertiary p-4 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("return.details.enrollmentStatus")}
            </div>
            <div className="mt-1 text-sm font-bold text-text-primary">
              {enrollmentStatusLabel ?? t("return.details.unknown")}
            </div>
          </div>
          <div className="rounded-xl border border-border-light bg-surface-tertiary p-4 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("return.details.paymentStatus")}
            </div>
            <div className="mt-1 text-sm font-bold text-text-primary">
              {paymentStatusLabel ?? t("return.details.unknown")}
            </div>
          </div>
        </div>

        {providerReference ? (
          <div className="mt-3 rounded-xl border border-border-light bg-surface-tertiary p-4 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("return.details.providerReference")}
            </div>
            <div className="mt-1 break-all font-mono text-sm font-bold text-text-primary">
              {providerReference}
            </div>
          </div>
        ) : null}

        {isVerifying ? (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-text-secondary">
            {t("return.verifying.polling")}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href={programHref}
            className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
          >
            {t("return.backToProgram")}
          </Link>
          {state === "confirmed" ? (
            <div className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white">
              {t("return.confirmed.cta")}
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={retryHref}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("return.retryPayment")}
              </Link>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
              >
                {t("return.refresh")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
