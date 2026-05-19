"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { useSessionFinancialBreakdown } from "@/features/sessions/hooks/use-session-financial";
import { usePatientSession } from "@/features/sessions/hooks/use-sessions";
import type { SessionItem, SessionStatus } from "@/features/sessions/types/sessions.types";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { reconcileSessionPaymentReturn } from "../api/payments-return.api";
import PatientMoneyClarityPanel from "./PatientMoneyClarityPanel";

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
  providerReference: string | null;
};

export default function PaymentReturnPanel({
  redirectStatus,
  sessionId,
  providerReference,
}: Props) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const router = useRouter();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const retryHref = `/patient/sessions/${sessionId}/pay` as const;
  const sessionDetailHref = `/patient/sessions/${sessionId}` as const;

  /**
   * Only poll when Stripe says it succeeded — we're waiting for the
   * payment_intent.succeeded webhook to land and the session to become CONFIRMED.
   * For failed/canceled we trust redirect_status immediately (no polling benefit).
   */
  const isPotentiallySucceeded = redirectStatus === "succeeded";

  // Stop polling after MAX_POLL_DURATION_MS regardless of session state.
  const [pollingActive, setPollingActive] = useState(isPotentiallySucceeded);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcileAttemptedRef = useRef(false);

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
  const { data: financialBreakdown } = useSessionFinancialBreakdown(sessionId, null, {
    enabled: Boolean(session),
  });

  // Cancel the timer once session is confirmed — no need to wait the full duration.
  useEffect(() => {
    if (session && CONFIRMED_STATUSES.includes(session.status)) {
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    }
  }, [session]);

  useEffect(() => {
    if (!isPotentiallySucceeded) return;
    if (!session) return;
    if (reconcileAttemptedRef.current) return;

    reconcileAttemptedRef.current = true;

    void reconcileSessionPaymentReturn(sessionId, {
      providerReference,
      redirectStatus,
      success: redirectStatus === "succeeded",
      pending: redirectStatus === "succeeded" ? false : null,
    }).catch(() => {
      // Best-effort reconciliation only. Polling still keeps the UI truthful.
    });
  }, [isPotentiallySucceeded, providerReference, redirectStatus, session, sessionId]);

  useEffect(() => {
    if (!session || !CONFIRMED_STATUSES.includes(session.status)) return;
    router.replace(sessionDetailHref);
  }, [router, session, sessionDetailHref]);

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
      <div className="space-y-5">
        <div className="rounded-[28px] border border-primary/15 bg-primary-light p-5 text-center dark:border-primary/20 dark:bg-primary/10">
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
          <p className="mb-4 text-xs text-text-muted">
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

        {financialBreakdown ? (
          <PatientMoneyClarityPanel
            eyebrow={t("return.moneyStory.eyebrow")}
            title={t("return.moneyStory.heading")}
            note={t("return.moneyStory.note")}
            facts={[
              {
                label: t("return.moneyStory.facts.gross.label"),
                value: formatFinanceMoney(numLocale, financialBreakdown.grossAmount, financialBreakdown.currency, {
                  fallbackText: "—",
                }),
                helper: t("return.moneyStory.facts.gross.helper"),
              },
              {
                label: t("return.moneyStory.facts.discount.label"),
                value: formatFinanceMoney(numLocale, financialBreakdown.discountAmount, financialBreakdown.currency, {
                  fallbackText: "—",
                }),
                helper: t("return.moneyStory.facts.discount.helper"),
              },
              {
                label: t("return.moneyStory.facts.patientPaid.label"),
                value: formatFinanceMoney(numLocale, financialBreakdown.netPaidAmount, financialBreakdown.currency, {
                  fallbackText: "—",
                }),
                helper: t("return.moneyStory.facts.patientPaid.helper"),
              },
              {
                label: t("return.moneyStory.facts.where.label"),
                value: t("return.moneyStory.facts.where.value"),
                helper: t("return.moneyStory.facts.where.helper"),
              },
            ]}
            actions={[
              { label: t("return.moneyStory.actions.payments"), href: "/patient/payments" },
              { label: t("return.moneyStory.actions.wallet"), href: "/patient/wallet" },
            ]}
          />
        ) : null}
      </div>
    );
  }

  // --- Session EXPIRED ---
  if (isSessionExpired) {
    return (
      <div className="space-y-5">
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

        <PatientMoneyClarityPanel
          eyebrow={t("return.moneyStory.eyebrow")}
          title={t("return.moneyStory.expiredHeading")}
          note={t("return.moneyStory.expiredNote")}
          actions={[
            { label: t("return.moneyStory.actions.payments"), href: "/patient/payments" },
            { label: t("return.moneyStory.actions.wallet"), href: "/patient/wallet" },
          ]}
          variant="soft"
        />
      </div>
    );
  }

  // --- Session CANCELLED ---
  if (isSessionCancelled) {
    return (
      <div className="space-y-5">
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

        <PatientMoneyClarityPanel
          eyebrow={t("return.moneyStory.eyebrow")}
          title={t("return.moneyStory.cancelledHeading")}
          note={t("return.moneyStory.cancelledNote")}
          actions={[
            { label: t("return.moneyStory.actions.payments"), href: "/patient/payments" },
            { label: t("return.moneyStory.actions.wallet"), href: "/patient/wallet" },
          ]}
          variant="soft"
        />
      </div>
    );
  }

  // --- PENDING_PAYMENT: payment failed (redirect_status=failed) ---
  if (isSessionPending && redirectStatus === "failed") {
    return (
      <div className="space-y-5">
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

        <PatientMoneyClarityPanel
          eyebrow={t("return.moneyStory.eyebrow")}
          title={t("return.moneyStory.failedHeading")}
          note={t("return.moneyStory.failedNote")}
          actions={[
            { label: t("return.moneyStory.actions.payments"), href: "/patient/payments" },
            { label: t("return.moneyStory.actions.wallet"), href: "/patient/wallet" },
          ]}
          variant="soft"
        />
      </div>
    );
  }

  // --- PENDING_PAYMENT: user cancelled payment (redirect_status=canceled) ---
  if (isSessionPending && redirectStatus === "canceled") {
    return (
      <div className="space-y-5">
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

        <PatientMoneyClarityPanel
          eyebrow={t("return.moneyStory.eyebrow")}
          title={t("return.moneyStory.canceledHeading")}
          note={t("return.moneyStory.canceledNote")}
          actions={[
            { label: t("return.moneyStory.actions.payments"), href: "/patient/payments" },
            { label: t("return.moneyStory.actions.wallet"), href: "/patient/wallet" },
          ]}
          variant="soft"
        />
      </div>
    );
  }

  // --- PENDING_PAYMENT + redirect_status=succeeded: webhook lag, still polling ---
  if (isSessionPending && isPotentiallySucceeded && pollingActive) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Loader2 size={48} className="animate-spin text-primary" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-text-primary dark:text-white/95">
            {t("return.verifying.heading")}
          </h2>
          <p className="text-sm text-text-secondary">{t("return.verifying.note")}</p>
        </div>

        <PatientMoneyClarityPanel
          eyebrow={t("return.moneyStory.eyebrow")}
          title={t("return.moneyStory.verifyingHeading")}
          note={t("return.moneyStory.verifyingNote")}
          actions={[
            { label: t("return.moneyStory.actions.sessions"), href: "/patient/sessions" },
            { label: t("return.moneyStory.actions.history"), href: "/patient/payments", tone: "primary" },
          ]}
          variant="soft"
        />
      </div>
    );
  }

  // --- PENDING_PAYMENT + polling timed out (redirect_status=succeeded but webhook not landed yet) ---
  if (isSessionPending && isPotentiallySucceeded && !pollingActive) {
    return (
      <div className="space-y-5">
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

        <PatientMoneyClarityPanel
          eyebrow={t("return.moneyStory.eyebrow")}
          title={t("return.moneyStory.pendingHeading")}
          note={t("return.moneyStory.pendingNote")}
          actions={[
            { label: t("return.moneyStory.actions.history"), href: "/patient/payments", tone: "primary" },
            { label: t("return.moneyStory.actions.wallet"), href: "/patient/wallet" },
          ]}
          variant="soft"
        />
      </div>
    );
  }

  // --- Catch-all: unknown state (no redirect_status, no clear session status) ---
  return (
    <div className="space-y-5">
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

      <PatientMoneyClarityPanel
        eyebrow={t("return.moneyStory.eyebrow")}
        title={t("return.moneyStory.pendingHeading")}
        note={t("return.moneyStory.pendingNote")}
        actions={[
          { label: t("return.moneyStory.actions.history"), href: "/patient/payments", tone: "primary" },
          { label: t("return.moneyStory.actions.wallet"), href: "/patient/wallet" },
        ]}
        variant="soft"
      />
    </div>
  );
}
