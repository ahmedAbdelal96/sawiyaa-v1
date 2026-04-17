"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePatientSession } from "@/features/sessions/hooks/use-sessions";
import type { SessionItem, SessionStatus } from "@/features/sessions/types/sessions.types";

/** These session statuses all mean payment was accepted and booking is real. */
const CONFIRMED_STATUSES: SessionStatus[] = [
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
  "COMPLETED",
];

/** Poll interval and max duration while waiting for webhook confirmation. */
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 15_000;

function formatDatetime(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

type Props = {
  redirectStatus: string | null;
  sessionId: string;
};

export default function PaymentReturnPanel({ redirectStatus, sessionId }: Props) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const retryHref = `/patient/sessions/${sessionId}/pay` as const;

  /**
   * Only poll when Stripe says it succeeded — we're waiting for the
   * payment_intent.succeeded webhook to land and the session to become CONFIRMED.
   * For failed/canceled we trust redirect_status immediately (no polling benefit).
   */
  const isPotentiallySucceeded = redirectStatus === "succeeded";

  // Stop polling after MAX_POLL_DURATION_MS regardless of session state.
  const [pollingActive, setPollingActive] = useState(isPotentiallySucceeded);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPotentiallySucceeded) return;
    pollingTimerRef.current = setTimeout(
      () => setPollingActive(false),
      MAX_POLL_DURATION_MS,
    );
    return () => {
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, [isPotentiallySucceeded]);

  const { data: session, isLoading, isError } = usePatientSession(sessionId, {
    staleTime: 0,
    refetchInterval: (query) => {
      if (!pollingActive) return false;
      const data = query.state.data as SessionItem | undefined;
      if (!data) return false;
      // Stop polling once the session has moved out of PENDING_PAYMENT
      if (CONFIRMED_STATUSES.includes(data.status)) return false;
      if (data.status === "EXPIRED" || data.status === "CANCELLED") return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
  });

  // Cancel the timer once session is confirmed — no need to wait the full duration.
  useEffect(() => {
    if (session && CONFIRMED_STATUSES.includes(session.status)) {
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    }
  }, [session]);

  const sessionStatus = session?.status as SessionStatus | undefined;
  const isSessionConfirmed = sessionStatus && CONFIRMED_STATUSES.includes(sessionStatus);
  const isSessionExpired = sessionStatus === "EXPIRED";
  const isSessionCancelled = sessionStatus === "CANCELLED";
  const isSessionPending = sessionStatus === "PENDING_PAYMENT";

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="mx-auto max-w-md">
        <ListStateSkeleton items={3} heightClass="h-12" />
      </div>
    );
  }

  // --- Error fetching session ---
  if (isError || (!isLoading && !session)) {
    return (
      <div className="mx-auto max-w-xl">
        <StateCard
          icon={<AlertCircle size={40} className="text-primary" />}
          title={t("return.error.heading")}
          note={t("return.error.note")}
          action={{
            label: t("return.viewSessions"),
            href: (
              <Link
                href="/patient/sessions"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t("return.viewSessions")}
              </Link>
            ),
          }}
        />
      </div>
    );
  }

  // --- Session CONFIRMED (backend source of truth — payment webhook landed) ---
  if (isSessionConfirmed && session) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle size={52} className="text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-text-primary dark:text-white/95">
          {t("return.confirmed.heading")}
        </h2>
        <p className="mb-1 text-sm text-text-secondary">{t("return.confirmed.note")}</p>
        {session.scheduledStartAt && (
          <p className="mb-1 text-sm font-medium text-text-primary dark:text-white/85">
            {formatDatetime(session.scheduledStartAt, numLocale)}
          </p>
        )}
        <p className="mb-6 text-xs text-text-muted">
          {t("return.confirmed.sessionWith", {
            practitioner:
              session.practitioner.displayName ?? session.practitioner.slug,
          })}
        </p>
        <Link
          href="/patient/sessions"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {t("return.viewSessions")}
        </Link>
      </div>
    );
  }

  // --- Session EXPIRED ---
  if (isSessionExpired) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Clock size={48} className="text-warning-500" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
          {t("return.expired.heading")}
        </h2>
        <p className="mb-6 text-sm text-text-secondary">{t("return.expired.note")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/practitioners"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            {t("return.expired.bookAgain")}
          </Link>
          <Link
            href="/patient/sessions"
            className="inline-flex items-center justify-center rounded-2xl border border-border-light px-6 py-3 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
          >
            {t("return.viewSessions")}
          </Link>
        </div>
      </div>
    );
  }

  // --- Session CANCELLED ---
  if (isSessionCancelled) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <XCircle size={48} className="text-text-muted" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
          {t("return.sessionCancelled.heading")}
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          {t("return.sessionCancelled.note")}
        </p>
        <Link
          href="/practitioners"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {t("return.expired.bookAgain")}
        </Link>
      </div>
    );
  }

  // --- PENDING_PAYMENT: payment failed (redirect_status=failed) ---
  if (isSessionPending && redirectStatus === "failed") {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <XCircle size={48} className="text-error-500" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
          {t("return.failed.heading")}
        </h2>
        <p className="mb-6 text-sm text-text-secondary">{t("return.failed.note")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={retryHref}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            {t("return.failed.retry")}
          </Link>
          <Link
            href="/patient/sessions"
            className="inline-flex items-center justify-center rounded-2xl border border-border-light px-6 py-3 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
          >
            {t("return.viewSessions")}
          </Link>
        </div>
      </div>
    );
  }

  // --- PENDING_PAYMENT: user cancelled payment (redirect_status=canceled) ---
  if (isSessionPending && redirectStatus === "canceled") {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Clock size={48} className="text-warning-500" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
          {t("return.canceled.heading")}
        </h2>
        <p className="mb-6 text-sm text-text-secondary">{t("return.canceled.note")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={retryHref}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            {t("return.canceled.retry")}
          </Link>
          <Link
            href="/patient/sessions"
            className="inline-flex items-center justify-center rounded-2xl border border-border-light px-6 py-3 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
          >
            {t("return.viewSessions")}
          </Link>
        </div>
      </div>
    );
  }

  // --- PENDING_PAYMENT + redirect_status=succeeded: webhook lag, still polling ---
  if (isSessionPending && isPotentiallySucceeded && pollingActive) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Loader2 size={48} className="animate-spin text-primary" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
          {t("return.verifying.heading")}
        </h2>
        <p className="text-sm text-text-secondary">{t("return.verifying.note")}</p>
      </div>
    );
  }

  // --- PENDING_PAYMENT + polling timed out (redirect_status=succeeded but webhook not landed yet) ---
  if (isSessionPending && isPotentiallySucceeded && !pollingActive) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Clock size={48} className="text-text-muted" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
          {t("return.pendingTimeout.heading")}
        </h2>
        <p className="mb-1 text-sm text-text-secondary">{t("return.pendingTimeout.note")}</p>
        <p className="mb-6 text-xs text-text-muted">{t("return.pendingTimeout.checkNote")}</p>
        <Link
          href="/patient/sessions"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {t("return.viewSessions")}
        </Link>
      </div>
    );
  }

  // --- Catch-all: unknown state (no redirect_status, no clear session status) ---
  return (
    <div className="text-center">
      <div className="mb-4 flex justify-center">
        <Clock size={48} className="text-text-muted" />
      </div>
      <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
        {t("return.pendingTimeout.heading")}
      </h2>
      <p className="mb-6 text-sm text-text-secondary">{t("return.pendingTimeout.note")}</p>
      <Link
        href="/patient/sessions"
        className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        {t("return.viewSessions")}
      </Link>
    </div>
  );
}
