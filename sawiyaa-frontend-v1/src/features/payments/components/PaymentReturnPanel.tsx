"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Loader2,
  Receipt,
  User,
  Video,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { formatViewerDateTime } from "@/lib/time-formatting";
import { useSessionFinancialBreakdown } from "@/features/sessions/hooks/use-session-financial";
import { usePatientSession } from "@/features/sessions/hooks/use-sessions";
import type { SessionItem } from "@/features/sessions/types/sessions.types";
import type { PaymentStatus } from "../types/payments.types";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { reconcileSessionPaymentReturn } from "../api/payments-return.api";
import PatientMoneyClarityPanel from "./PatientMoneyClarityPanel";

/** Poll interval and max duration while waiting for webhook confirmation. */
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 15_000;

function formatDatetime(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
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

  const isPotentiallySucceeded = redirectStatus === "succeeded";

  const [pollingActive, setPollingActive] = useState(isPotentiallySucceeded);
  const [reconciledPaymentStatus, setReconciledPaymentStatus] = useState<PaymentStatus | null>(null);
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
      if (data.operational?.timelineBucket !== "PENDING") return false;
      if (data.operational?.actions.canPay !== true) return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
  });

  const { data: financialBreakdown } = useSessionFinancialBreakdown(sessionId, null, {
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (session && session.operational?.timelineBucket !== "PENDING") {
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
    }).then((result) => {
      setReconciledPaymentStatus(result.item?.status ?? null);
    }).catch(() => {
      // Best-effort reconciliation only.
    });
  }, [isPotentiallySucceeded, providerReference, redirectStatus, session, sessionId]);

  const operationalState = session?.operational?.state ?? null;
  const isPaymentConfirmed =
    reconciledPaymentStatus === "CAPTURED" ||
    reconciledPaymentStatus === "AUTHORIZED" ||
    (isPotentiallySucceeded && session?.operational?.timelineBucket !== "PENDING");
  const isSessionActivated = session?.operational?.timelineBucket !== "PENDING";
  const isSessionConfirmed = isPaymentConfirmed || isSessionActivated;
  const isSessionExpired = operationalState === "EXPIRED";
  const isSessionCancelled = operationalState === "CANCELLED";
  const isSessionPending = session?.operational?.actions.canPay === true;

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <ListStateSkeleton items={3} heightClass="h-14" />
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

  // --- 1. Session CONFIRMED: High-Density Modern 2-Column Receipt & Confirmation ---
  if (isSessionConfirmed && session) {
    const practitionerName =
      session.practitioner.displayName ?? session.practitioner.slug;

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Hero Confirmation & Session Info */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-xs dark:bg-surface-secondary">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {t("return.confirmed.statusPaid", { defaultValue: "مدفوع ومؤكد" })}
                  </span>
                </div>
                <h1 className="mt-1 text-xl font-bold text-text-primary dark:text-white/95">
                  {t("return.confirmed.heading")}
                </h1>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  {t("return.confirmed.note")}
                </p>
              </div>
            </div>

            {/* Practitioner & Appointment Mini-Card */}
            <div className="mt-5 rounded-2xl border border-border-light bg-surface-secondary/60 p-4 dark:bg-surface-tertiary">
              <div className="flex items-center gap-3 border-b border-border-light pb-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-text-brand border border-primary/20">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-muted">
                    {t("return.confirmed.sessionWith", { practitioner: "" }).replace(":", "")}
                  </p>
                  <p className="text-sm font-bold text-text-primary truncate dark:text-white/95">
                    {practitionerName}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {session.scheduledStartAt ? (
                  <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 border border-border-light dark:bg-surface-secondary">
                    <Calendar size={15} className="text-primary shrink-0" />
                    <span className="font-semibold text-text-primary dark:text-white/90">
                      {formatDatetime(session.scheduledStartAt, numLocale)}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 border border-border-light dark:bg-surface-secondary">
                  <Video size={15} className="text-primary shrink-0" />
                  <span className="font-semibold text-text-primary dark:text-white/90">
                    {session.durationMinutes} دقيقة • جلسة مرئية
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={sessionDetailHref}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-2xs hover:bg-primary/90 transition"
              >
                <span>{t("return.confirmed.viewSessionDetail", { defaultValue: "عرض تفاصيل الجلسة والاستعداد" })}</span>
              </Link>
              <Link
                href="/patient/sessions"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border-light bg-surface px-4 py-3 text-xs font-semibold text-text-secondary hover:bg-surface-secondary transition dark:bg-surface-secondary"
              >
                {t("return.viewSessions")}
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Receipt & Clarity Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-border-light bg-surface p-5 shadow-xs dark:bg-surface-secondary">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={17} className="text-primary" />
                <h2 className="text-xs font-bold text-text-primary dark:text-white/95">
                  {t("return.confirmed.paymentReceipt", { defaultValue: "إيصال وتفاصيل الدفع" })}
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-text-muted">
                {financialBreakdown?.currency ?? "EGP"}
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-text-secondary">
                <span>{t("return.moneyStory.facts.gross.label")}</span>
                <span className="font-semibold text-text-primary dark:text-white/90">
                  {financialBreakdown
                    ? formatFinanceMoney(numLocale, financialBreakdown.grossAmount, financialBreakdown.currency, { fallbackText: "—" })
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between text-text-secondary">
                <span>{t("return.moneyStory.facts.discount.label")}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {financialBreakdown
                    ? formatFinanceMoney(numLocale, financialBreakdown.discountAmount, financialBreakdown.currency, { fallbackText: "0" })
                    : "0"}
                </span>
              </div>

              <div className="border-t border-border-light pt-2.5 flex items-center justify-between text-sm font-bold text-text-primary dark:text-white/95">
                <span>{t("return.moneyStory.facts.patientPaid.label", { defaultValue: "المبلغ المسدد" })}</span>
                <span className="text-base text-primary">
                  {financialBreakdown
                    ? formatFinanceMoney(numLocale, financialBreakdown.netPaidAmount, financialBreakdown.currency, { fallbackText: "—" })
                    : "—"}
                </span>
              </div>

              <div className="rounded-xl border border-border-light bg-surface-secondary/60 p-2.5 text-[11px] leading-4 text-text-secondary">
                <span className="font-semibold text-text-primary block mb-0.5">
                  {t("return.moneyStory.facts.where.label")}
                </span>
                {t("return.moneyStory.facts.where.helper")}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border-light pt-3.5">
              <Link
                href="/patient/payments"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-light bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:border-primary/30 hover:text-text-brand transition dark:bg-surface-secondary"
              >
                <Layers size={13} />
                <span>{t("return.moneyStory.actions.payments")}</span>
              </Link>
              <Link
                href="/patient/wallet"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-light bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:border-primary/30 hover:text-text-brand transition dark:bg-surface-secondary"
              >
                <Wallet size={13} />
                <span>{t("return.moneyStory.actions.wallet")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. Session EXPIRED ---
  if (isSessionExpired) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-3xl border border-warning-200 bg-warning-50/50 p-6 text-center dark:border-warning-500/20 dark:bg-warning-950/20">
          <div className="mb-3 flex justify-center">
            <Clock size={44} className="text-warning-500" />
          </div>
          <h2 className="mb-1 text-lg font-bold text-text-primary dark:text-white/95">
            {t("return.expired.heading")}
          </h2>
          <p className="mb-5 text-xs leading-relaxed text-text-secondary">{t("return.expired.note")}</p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/practitioners"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary/90"
            >
              {t("return.expired.bookAgain")}
            </Link>
            <Link
              href="/patient/sessions"
              className="inline-flex items-center justify-center rounded-xl border border-border-light bg-surface px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-secondary dark:bg-surface-secondary"
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

  // --- 3. Session CANCELLED ---
  if (isSessionCancelled) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-3xl border border-border-light bg-surface p-6 text-center shadow-xs dark:bg-surface-secondary">
          <div className="mb-3 flex justify-center">
            <XCircle size={44} className="text-text-muted" />
          </div>
          <h2 className="mb-1 text-lg font-bold text-text-primary dark:text-white/95">
            {t("return.sessionCancelled.heading")}
          </h2>
          <p className="mb-5 text-xs leading-relaxed text-text-secondary">
            {t("return.sessionCancelled.note")}
          </p>
          <Link
            href="/practitioners"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary/90"
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

  // --- 4. PENDING_PAYMENT: payment failed (redirect_status=failed) ---
  if (isSessionPending && redirectStatus === "failed") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-3xl border border-error-200 bg-error-50/50 p-6 text-center dark:border-error-500/20 dark:bg-error-950/20">
          <div className="mb-3 flex justify-center">
            <XCircle size={44} className="text-error-500" />
          </div>
          <h2 className="mb-1 text-lg font-bold text-text-primary dark:text-white/95">
            {t("return.failed.heading")}
          </h2>
          <p className="mb-5 text-xs leading-relaxed text-text-secondary">{t("return.failed.note")}</p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href={retryHref}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary/90"
            >
              {t("return.failed.retry")}
            </Link>
            <Link
              href="/patient/sessions"
              className="inline-flex items-center justify-center rounded-xl border border-border-light bg-surface px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-secondary dark:bg-surface-secondary"
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

  // --- 5. PENDING_PAYMENT: user cancelled payment (redirect_status=canceled) ---
  if (isSessionPending && redirectStatus === "canceled") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-3xl border border-warning-200 bg-warning-50/50 p-6 text-center dark:border-warning-500/20 dark:bg-warning-950/20">
          <div className="mb-3 flex justify-center">
            <Clock size={44} className="text-warning-500" />
          </div>
          <h2 className="mb-1 text-lg font-bold text-text-primary dark:text-white/95">
            {t("return.canceled.heading")}
          </h2>
          <p className="mb-5 text-xs leading-relaxed text-text-secondary">{t("return.canceled.note")}</p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href={retryHref}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary/90"
            >
              {t("return.canceled.retry")}
            </Link>
            <Link
              href="/patient/sessions"
              className="inline-flex items-center justify-center rounded-xl border border-border-light bg-surface px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-secondary dark:bg-surface-secondary"
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

  // --- 6. PENDING_PAYMENT + redirect_status=succeeded: webhook lag, still polling ---
  if (isSessionPending && isPotentiallySucceeded && pollingActive) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-3xl border border-border-light bg-surface p-6 text-center shadow-xs dark:bg-surface-secondary">
          <div className="mb-3 flex justify-center">
            <Loader2 size={44} className="animate-spin text-primary" />
          </div>
          <h2 className="mb-1 text-lg font-bold text-text-primary dark:text-white/95">
            {t("return.verifying.heading")}
          </h2>
          <p className="text-xs leading-relaxed text-text-secondary">{t("return.verifying.note")}</p>
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

  // --- 7. Catch-all: pending / timeout ---
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-3xl border border-border-light bg-surface p-6 text-center shadow-xs dark:bg-surface-secondary">
        <div className="mb-3 flex justify-center">
          <Clock size={44} className="text-text-muted" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-text-primary dark:text-white/95">
          {t("return.pendingTimeout.heading")}
        </h2>
        <p className="mb-1 text-xs text-text-secondary">{t("return.pendingTimeout.note")}</p>
        <p className="mb-5 text-[11px] text-text-muted">{t("return.pendingTimeout.checkNote")}</p>
        <Link
          href="/patient/sessions"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary/90"
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
