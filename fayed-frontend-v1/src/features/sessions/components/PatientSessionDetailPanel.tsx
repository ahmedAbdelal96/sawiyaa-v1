"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Video,
  Wallet,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { toAppError } from "@/lib/api/errors";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import {
  useCancelPatientSession,
  usePreviewPatientSessionCancellation,
  usePreparePatientSessionRuntime,
  usePatientSession,
  useResolvePatientSessionJoinContract,
} from "../hooks/use-sessions";
import {
  buildProviderLaunchUrl,
  canLaunchProviderRuntime,
  canPrepareSessionRuntime,
  formatProviderDisplayName,
  getRuntimeBlockedReasonKey,
  getRuntimePreparedState,
  getRuntimeProvider,
  getRuntimeRoomName,
  hasSessionRuntimeAccess,
  isJoinWindowOpen,
} from "../lib/session-runtime";
import { usePatientPayments } from "@/features/payments/hooks/use-payments";
import { canContinuePayment } from "@/features/payments/lib/payment-status";
import type {
  SessionJoinItem,
  SessionRuntimeItem,
  SessionStatus,
} from "../types/sessions.types";

const CANCELLABLE_STATUSES: SessionStatus[] = ["CONFIRMED", "UPCOMING"];
const SESSION_CHAT_OPEN_STATUSES: SessionStatus[] = [
  "READY_TO_JOIN",
  "IN_PROGRESS",
  "COMPLETED",
];

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

function formatPlainAmount(value: string, numLocale: string): string {
  return new Intl.NumberFormat(numLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || "0"));
}

function formatSessionAmount(value: string, numLocale: string, currencyCode: string | null): string {
  return currencyCode
    ? formatFinanceMoney(numLocale, value, currencyCode, { fallbackText: "—" })
    : formatPlainAmount(value, numLocale);
}

function formatSessionDateLabel(isoString: string | null, numLocale: string): string {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat(numLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoString));
}

function formatSessionTimeLabel(isoString: string | null, numLocale: string): string {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat(numLocale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  }).format(new Date(isoString));
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "F";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

type SummaryFieldProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  note?: ReactNode;
};

type FinanceStatTone = "neutral" | "primary" | "success";

type FinanceStatProps = {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: FinanceStatTone;
};

type LabeledValueProps = {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
};

function SummaryField({ icon, label, value, note }: SummaryFieldProps) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-text-secondary dark:bg-white/8 dark:text-white/75">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {label}
          </p>
          <div className="mt-1 break-words text-base font-semibold text-text-primary dark:text-white/95">
            {value}
          </div>
          {note ? <p className="mt-1 text-sm text-text-secondary">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}

function FinanceStat({ label, value, note, tone = "neutral" }: FinanceStatProps) {
  const toneClassName =
    tone === "primary"
      ? "border-primary/15 bg-primary-light dark:border-primary/20 dark:bg-primary/10"
      : tone === "success"
        ? "border-green-200 bg-green-50 dark:border-green-700/40 dark:bg-green-900/10"
        : "border-border-light bg-surface-tertiary dark:bg-white/5";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <div className="mt-2 break-words text-lg font-semibold text-text-primary dark:text-white/95">
        {value}
      </div>
      {note ? <p className="mt-1 text-xs leading-5 text-text-secondary">{note}</p> : null}
    </div>
  );
}

function LabeledValue({ label, value, helper, tone = "neutral" }: LabeledValueProps) {
  const toneClassName =
    tone === "success"
      ? "border-success-200 bg-success-50 dark:border-success-500/20 dark:bg-success-500/10"
      : tone === "warning"
        ? "border-warning-200 bg-warning-50 dark:border-warning-500/20 dark:bg-warning-500/10"
        : tone === "danger"
          ? "border-danger-200 bg-danger-50 dark:border-danger-500/20 dark:bg-danger-500/10"
          : "border-border-light bg-surface-primary dark:bg-white/5";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">{value}</div>
      {helper ? <p className="mt-1 text-xs leading-5 text-text-secondary">{helper}</p> : null}
    </div>
  );
}

type Props = {
  sessionId: string;
};

export default function PatientSessionDetailPanel({ sessionId }: Props) {
  const t = useTranslations("sessions");
  const tPayments = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const { data: session, isLoading, isError } = usePatientSession(sessionId);
  const { data: paymentsData } = usePatientPayments({ limit: 20 });
  const cancelMutation = useCancelPatientSession();
  const previewCancellationMutation = usePreviewPatientSessionCancellation();
  const prepareMutation = usePreparePatientSessionRuntime();
  const joinMutation = useResolvePatientSessionJoinContract();

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancellationReasonDraft, setCancellationReasonDraft] = useState("");
  const [cancelFeedbackKey, setCancelFeedbackKey] = useState<
    "SUCCESS" | "NOT_ALLOWED" | "FAILED" | null
  >(null);
  const [cancelPreviewError, setCancelPreviewError] = useState(false);
  const [joinResult, setJoinResult] = useState<SessionJoinItem | null>(null);
  const [prepareResult, setPrepareResult] = useState<SessionRuntimeItem | null>(null);

  if (isLoading) {
    return (
      <div className="app-max-content mx-auto">
        <ListStateSkeleton items={3} heightClass="h-32" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <StateCard
        icon={<AlertCircle size={36} className="text-primary" />}
        title={t("list.errorHeading")}
        note={t("list.errorNote")}
        action={{
          label: t("detail.backToSessions"),
          href: (
            <Link
              href="/patient/sessions"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("detail.backToSessions")}
            </Link>
          ),
        }}
      />
    );
  }

  const isCancellable = CANCELLABLE_STATUSES.includes(session.status);
  const hasRuntimeAccess = hasSessionRuntimeAccess(session.status);
  const isChatAvailable = SESSION_CHAT_OPEN_STATUSES.includes(session.status);
  const paymentStateKey =
    session.status === "PENDING_PAYMENT"
      ? "PENDING_PAYMENT"
      : session.status === "REFUND_PENDING"
        ? "REFUND_PENDING"
        : session.status === "REFUNDED"
          ? "REFUNDED"
          : session.status === "EXPIRED"
            ? "EXPIRED"
            : session.status === "CONFIRMED" ||
                session.status === "UPCOMING" ||
                session.status === "READY_TO_JOIN" ||
                session.status === "IN_PROGRESS" ||
                session.status === "COMPLETED"
              ? "SECURED"
          : null;
  const sessionPayment = paymentsData?.items.find((payment) => payment.sessionId === session.id);
  const sessionPaymentCurrency = sessionPayment?.currency ?? null;
  const sessionPaymentHasDiscount = Boolean(
    sessionPayment && Number(sessionPayment.amountDiscount) > 0,
  );
  const hasActivePendingPayment = Boolean(sessionPayment && canContinuePayment(sessionPayment));
  const joinUrl = buildProviderLaunchUrl(joinResult);
  const runtimePrepared = getRuntimePreparedState({ prepareResult, joinResult });
  const runtimeProvider = getRuntimeProvider({ prepareResult, joinResult });
  const runtimeRoomName = getRuntimeRoomName({ prepareResult, joinResult });
  const runtimeProviderLabel = formatProviderDisplayName(runtimeProvider);
  const prepareAllowed = hasRuntimeAccess && !runtimePrepared && canPrepareSessionRuntime(session);
  const joinWindowOpen = isJoinWindowOpen(session);
  const shouldShowJoinCheck =
    hasRuntimeAccess &&
    !(joinResult?.canJoin && canLaunchProviderRuntime(joinResult)) &&
    (joinWindowOpen ||
      session.status === "READY_TO_JOIN" ||
      session.status === "IN_PROGRESS" ||
      runtimePrepared ||
      Boolean(joinResult));
  const cancellationPreview = previewCancellationMutation.data;
  const runtimeStatusNote = t(`detail.runtime.status.${session.status}` as Parameters<
    typeof t
  >[0]);
  const sessionModeLabel = t(`detail.mode.${session.sessionMode}` as Parameters<
    typeof t
  >[0]);
  const chatNote = isChatAvailable ? t("detail.chatCard.note") : t("detail.chatCard.disabledNote");
  const paymentStateNote = paymentStateKey
    ? tPayments(`sessionState.${paymentStateKey}.note` as Parameters<typeof tPayments>[0])
    : null;
  const sessionPriceValue = sessionPayment
    ? formatSessionAmount(sessionPayment.amountSubtotal, numLocale, sessionPaymentCurrency)
    : "—";
  const sessionDiscountValue = sessionPayment
    ? formatSessionAmount(sessionPayment.amountDiscount, numLocale, sessionPaymentCurrency)
    : "—";
  const sessionNetValue = sessionPayment
    ? formatSessionAmount(sessionPayment.amountTotal, numLocale, sessionPaymentCurrency)
    : "—";
  const cancellationPreviewAmount = cancellationPreview
    ? sessionPaymentCurrency
      ? formatSessionAmount(cancellationPreview.refundAmount, numLocale, sessionPaymentCurrency)
      : formatPlainAmount(cancellationPreview.refundAmount, numLocale)
    : null;
  const cancellationPreviewCanCancel = Boolean(cancellationPreview?.canCancelNow);
  const cancellationBlockedReasonTitle = cancellationPreview
    ? cancellationPreview.blockingReasonCode === "SESSION_CANCELLATION_REFUND_DESTINATION_NOT_SUPPORTED"
      ? t("detail.cancelConfirm.eligibility.blockedReason.unsupportedRefundDestination")
      : !cancellationPreview.cancellationAllowedByPolicy
        ? cancellationPreview.hoursBeforeStart <= 0
          ? t("detail.cancelConfirm.eligibility.blockedReason.policyWindowEnded")
          : cancellationPreview.hoursBeforeStart < 1
            ? t("detail.cancelConfirm.eligibility.blockedReason.sessionTooClose")
            : t("detail.cancelConfirm.eligibility.blockedReason.policyRestricted")
        : cancellationPreview.outcomeType === "PAYMENT_STATE_NOT_REFUNDABLE"
          ? t("detail.cancelConfirm.eligibility.blockedReason.paymentRestricted")
          : t("detail.cancelConfirm.eligibility.blockedReason.policyRestricted")
    : null;
  const cancellationBlockedReasonNote = cancellationPreview
    ? cancellationPreview.blockingReasonCode === "SESSION_CANCELLATION_REFUND_DESTINATION_NOT_SUPPORTED"
      ? t("detail.cancelConfirm.eligibility.blockedExplanation.unsupportedRefundDestination")
      : !cancellationPreview.cancellationAllowedByPolicy
        ? cancellationPreview.hoursBeforeStart <= 0
          ? t("detail.cancelConfirm.eligibility.blockedExplanation.policyWindowEnded")
          : cancellationPreview.hoursBeforeStart < 1
            ? t("detail.cancelConfirm.eligibility.blockedExplanation.sessionTooClose")
            : t("detail.cancelConfirm.eligibility.blockedExplanation.policyRestricted")
        : cancellationPreview.outcomeType === "PAYMENT_STATE_NOT_REFUNDABLE"
          ? t("detail.cancelConfirm.eligibility.blockedExplanation.paymentRestricted")
          : t("detail.cancelConfirm.eligibility.blockedExplanation.policyRestricted")
    : null;
  const cancellationRefundDestinationLabel = cancellationPreview?.refundDestination
    ? t(
        `detail.cancelConfirm.destinations.${cancellationPreview.refundDestination}` as Parameters<
          typeof t
        >[0],
      )
    : null;
  const cancellationHasRefund =
    cancellationPreviewCanCancel &&
    cancellationPreview?.outcomeType === "REFUND_TO_WALLET" &&
    Number(cancellationPreview?.refundAmount ?? "0") > 0 &&
    Boolean(cancellationPreviewAmount) &&
    Boolean(cancellationRefundDestinationLabel);
  const cancellationFinancialSummary = cancellationPreview
    ? cancellationPreviewCanCancel
      ? cancellationPreview.outcomeType === "NO_PAYMENT"
        ? t("detail.cancelConfirm.financialSummary.noPayment")
        : cancellationPreview.outcomeType === "REFUND_TO_WALLET" &&
            cancellationPreviewAmount &&
            cancellationRefundDestinationLabel
          ? t("detail.cancelConfirm.financialSummary.allowedRefundWithAmount", {
              amount: cancellationPreviewAmount,
              destination: cancellationRefundDestinationLabel,
            })
          : cancellationPreview.outcomeType === "REFUND_TO_WALLET"
            ? t("detail.cancelConfirm.financialSummary.allowedRefund")
            : t("detail.cancelConfirm.financialSummary.allowedNoRefund")
      : t("detail.cancelConfirm.financialSummary.blocked")
    : null;
  const cancellationPolicyPath = "/refund-policies/session" as never;
  const practitionerDisplayName =
    session.practitioner.displayName ?? t("detail.cancelConfirm.summaryFields.practitioner");
  const sessionScheduledAt = session.scheduledStartAt ?? cancellationPreview?.sessionStartAt ?? null;
  const sessionScheduledDateLabel = formatSessionDateLabel(sessionScheduledAt, numLocale);
  const sessionScheduledTimeLabel = formatSessionTimeLabel(sessionScheduledAt, numLocale);
  const sessionTypeLabel = sessionModeLabel;

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        sessionId: session.id,
        reason: cancellationReasonDraft.trim() || undefined,
      });
      setCancelFeedbackKey("SUCCESS");
      setCancellationReasonDraft("");
      setConfirmingCancel(false);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === "SESSION_CANCELLATION_NOT_ALLOWED_BY_POLICY") {
        setCancelFeedbackKey("NOT_ALLOWED");
      } else {
        setCancelFeedbackKey("FAILED");
      }
    }
  };

  const handlePrepareRuntime = async () => {
    try {
      const result = await prepareMutation.mutateAsync(session.id);
      setPrepareResult(result);
    } catch {
      setPrepareResult(null);
    }
  };

  const handleResolveJoin = async () => {
    try {
      const result = await joinMutation.mutateAsync(session.id);
      setJoinResult(result);
    } catch {
      setJoinResult(null);
    }
  };

  const openCancelModal = () => {
    setConfirmingCancel(true);
    previewCancellationMutation.reset();
    setCancelPreviewError(false);
    previewCancellationMutation.mutate(session.id, {
      onError: () => {
        setCancelPreviewError(true);
      },
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(340px,0.95fr)]">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.14)] dark:bg-surface-secondary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.summary.eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/95">
              {t("detail.summary.heading")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{t("detail.summary.note")}</p>
          </div>
          <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-text-brand dark:bg-primary/15 dark:text-primary-light">
            {t(`status.${session.status}` as Parameters<typeof t>[0])}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryField
            icon={<MessageSquareText className="h-4 w-4" />}
            label={t("detail.summary.practitioner")}
            value={session.practitioner.displayName ?? session.practitioner.slug}
            note={session.practitioner.slug}
          />
          <SummaryField
            icon={<CalendarClock className="h-4 w-4" />}
            label={t("detail.summary.sessionCode")}
            value={session.sessionCode}
            note={sessionModeLabel}
          />
          <SummaryField
            icon={<CalendarDays className="h-4 w-4" />}
            label={t("detail.summary.scheduledAt")}
            value={
              session.scheduledStartAt
                ? formatDatetime(session.scheduledStartAt, numLocale)
                : t("detail.notScheduled")
            }
            note={
              session.scheduledEndAt
                ? formatDatetime(session.scheduledEndAt, numLocale)
                : undefined
            }
          />
          <SummaryField
            icon={<Clock className="h-4 w-4" />}
            label={t("detail.summary.duration")}
            value={t("detail.duration", { n: session.durationMinutes })}
            note={sessionModeLabel}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.14)] dark:bg-surface-secondary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.runtime.heading")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/95">
              {t("detail.runtime.heading")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{runtimeStatusNote}</p>
          </div>

          {session.status === "PENDING_PAYMENT" && hasActivePendingPayment && (
            <Link
              href={`/patient/sessions/${session.id}/pay` as never}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {t("detail.PENDING_PAYMENT.action")}
            </Link>
          )}
        </div>

        {hasRuntimeAccess ? (
          <div className="mt-4 space-y-3">
            {joinResult?.canJoin && joinUrl ? (
              <>
                <div className="rounded-2xl border border-primary/15 bg-primary-light px-4 py-3 text-sm text-text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-white/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                    <p>{t("detail.runtime.ready")}</p>
                  </div>
                </div>
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  <ExternalLink size={16} />
                  {t("detail.runtime.actions.openRoom")}
                </a>
              </>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {prepareAllowed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrepareRuntime}
                    disabled={prepareMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {prepareMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {t("detail.runtime.actions.preparing")}
                      </>
                    ) : (
                      t("detail.runtime.actions.prepare")
                    )}
                  </Button>
                )}
                {shouldShowJoinCheck && (
                  <Button
                    size="sm"
                    onClick={handleResolveJoin}
                    disabled={joinMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {joinMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {t("detail.runtime.actions.checking")}
                      </>
                    ) : session.status === "READY_TO_JOIN" || session.status === "IN_PROGRESS" ? (
                      t("detail.runtime.actions.joinNow")
                    ) : (
                      t("detail.runtime.actions.checkAccess")
                    )}
                  </Button>
                )}
              </div>
            )}

            {prepareResult?.isPrepared && !joinResult?.canJoin && (
              <div className="rounded-2xl border border-primary/15 bg-primary-light px-4 py-3 text-sm text-text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-white/90">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <p>{t("detail.runtime.prepared")}</p>
                </div>
              </div>
            )}

            {joinResult && !joinResult.canJoin && (
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
                {t(
                  `detail.runtime.blocked.${getRuntimeBlockedReasonKey(joinResult.blockedReason)}` as Parameters<
                    typeof t
                  >[0],
                )}
              </div>
            )}

            {!joinResult?.canJoin && !prepareAllowed && !shouldShowJoinCheck && (
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
                <p className="font-medium text-text-primary dark:text-white/90">
                  {t("detail.liveFlow.phases.awaitingWindow.title")}
                </p>
                <p className="mt-1">{t("detail.liveFlow.phases.awaitingWindow.note")}</p>
              </div>
            )}

            {prepareMutation.isError && (
              <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary dark:border-accent/25 dark:bg-accent/10 dark:text-white/90">
                {t("detail.runtime.prepareError")}
              </div>
            )}

            {joinMutation.isError && (
              <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary dark:border-accent/25 dark:bg-accent/10 dark:text-white/90">
                {t("detail.runtime.error")}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-sm text-text-secondary dark:bg-white/5">
            <p className="font-medium text-text-primary dark:text-white/90">
              {t("detail.liveFlow.phases.awaitingWindow.title")}
            </p>
            <p className="mt-1">{t("detail.liveFlow.phases.awaitingWindow.note")}</p>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.14)] dark:bg-surface-secondary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.chat.eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/95">
              {t("detail.chatCard.heading")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{chatNote}</p>
          </div>

          <MessageSquareText className="mt-1 h-5 w-5 shrink-0 text-text-muted" />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {isChatAvailable ? (
            <Link
              href={`/patient/sessions/${session.id}/chat` as never}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("detail.chatCard.open")}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-medium text-text-muted opacity-80"
            >
              {t("detail.chatCard.open")}
            </button>
          )}
        </div>

        {!isChatAvailable && (
          <div className="mt-3 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
            {chatNote}
          </div>
        )}
      </section>

      </div>

      <aside className="space-y-6 xl:sticky xl:top-6 self-start">
        {paymentStateKey && (
          <section
          className={
            paymentStateKey === "SECURED"
              ? "rounded-[28px] border border-green-200 bg-green-50 p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.14)] dark:border-green-700/40 dark:bg-green-900/10"
              : paymentStateKey === "PENDING_PAYMENT"
                ? "rounded-[28px] border border-primary/15 bg-primary-light p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.14)] dark:border-primary/20 dark:bg-primary/10"
                : "rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.14)] dark:border-amber-700/40 dark:bg-amber-900/10"
          }
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p
                className={
                  paymentStateKey === "SECURED"
                    ? "text-xs font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-300"
                    : paymentStateKey === "PENDING_PAYMENT"
                      ? "text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                      : "text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"
                }
              >
                {tPayments("breakdown.heading")}
              </p>
              <h2
                className={
                  paymentStateKey === "SECURED"
                    ? "mt-1 text-lg font-semibold text-green-800 dark:text-green-300"
                    : paymentStateKey === "PENDING_PAYMENT"
                      ? "mt-1 text-lg font-semibold text-text-primary dark:text-white/95"
                      : "mt-1 text-lg font-semibold text-amber-800 dark:text-amber-300"
                }
              >
                {tPayments(
                  `sessionState.${paymentStateKey}.label` as Parameters<typeof tPayments>[0],
                )}
              </h2>
              <p
                className={
                  paymentStateKey === "SECURED"
                    ? "mt-2 text-sm leading-6 text-green-700 dark:text-green-400"
                    : paymentStateKey === "PENDING_PAYMENT"
                      ? "mt-2 text-sm leading-6 text-text-secondary"
                      : "mt-2 text-sm leading-6 text-amber-700 dark:text-amber-400"
                }
              >
                {paymentStateNote}
              </p>
            </div>

            <Wallet className="mt-1 h-5 w-5 shrink-0 text-text-muted" />
          </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <FinanceStat
              label={tPayments("breakdown.grossAmount")}
              value={sessionPriceValue}
              note={tPayments("breakdown.loading")}
            />
            <FinanceStat
              label={tPayments("breakdown.discount")}
              value={sessionDiscountValue}
              note={
                sessionPaymentHasDiscount
                  ? tPayments("breakdown.couponApplied")
                  : tPayments("breakdown.discount")
              }
              tone={sessionPaymentHasDiscount ? "primary" : "neutral"}
            />
            <FinanceStat
              label={tPayments("breakdown.netPaid")}
              value={sessionNetValue}
              note={paymentStateNote ?? undefined}
              tone="success"
            />
          </div>

            <div className="mt-4 flex flex-wrap gap-3">
            {paymentStateKey === "PENDING_PAYMENT" && hasActivePendingPayment && (
              <Link
                href={`/patient/sessions/${session.id}/pay` as never}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                {tPayments("sessionState.PENDING_PAYMENT.action")}
              </Link>
            )}
            <Link
              href="/patient/payments"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
            >
              {tPayments("sessionMoney.actions.history")}
            </Link>
            <Link
              href="/patient/wallet"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
            >
              {tPayments("sessionMoney.actions.wallet")}
            </Link>
            </div>
          </section>
        )}

        <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.14)] dark:bg-surface-secondary">
          <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">
              {t("detail.cancelAction")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/95">
              {t("detail.cancelAction")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t("detail.cancelConfirm.note")}
            </p>
          </div>

          <Button variant="danger" size="sm" onClick={openCancelModal}>
            {t("detail.cancelAction")}
          </Button>
          </div>

          <p className="mt-3 text-sm text-text-secondary">
            {isCancellable
              ? t("detail.cancelConfirm.policyNote")
              : t("detail.cancelConfirm.cannotProceed")}
          </p>

          {cancelFeedbackKey === "SUCCESS" ? (
            <div className="mt-4 rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
              {t("detail.cancelResult.success")}
            </div>
          ) : null}
          {cancelFeedbackKey === "NOT_ALLOWED" ? (
            <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
              {t("detail.cancelResult.notAllowedByPolicy")}
            </div>
          ) : null}
          {cancelFeedbackKey === "FAILED" ? (
            <div className="mt-4 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300">
              {t("detail.cancelResult.failed")}
            </div>
          ) : null}
        </section>

      </aside>

      <DestructiveConfirmModal
        isOpen={confirmingCancel}
        onClose={() => {
          setConfirmingCancel(false);
          cancelMutation.reset();
          previewCancellationMutation.reset();
          setCancelPreviewError(false);
          setCancellationReasonDraft("");
        }}
        size="xl"
        title={t("detail.cancelConfirm.heading")}
        description={t("detail.cancelConfirm.note")}
        confirmLabel={
          cancelMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("detail.cancelConfirm.confirm")}
            </>
          ) : (
            t("detail.cancelConfirm.confirm")
          )
        }
        cancelLabel={
          cancellationPreviewCanCancel
            ? t("detail.cancelConfirm.back")
            : t("detail.cancelConfirm.backToSession")
        }
        confirmDisabled={!cancellationPreviewCanCancel}
        onConfirm={() => {
          if (!cancellationPreviewCanCancel) {
            return;
          }
          void handleCancel();
        }}
        loading={cancelMutation.isPending || previewCancellationMutation.isPending}
        backdropClassName="bg-[rgba(25,52,57,0.22)] backdrop-blur-0"
      >
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:bg-surface-secondary">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-light text-lg font-semibold text-primary">
                  {getInitials(practitionerDisplayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-brand">
                    {t("detail.cancelConfirm.summaryHeading")}
                  </p>
                  <h3 className="mt-2 break-words text-lg font-semibold text-text-primary dark:text-white/95">
                    {practitionerDisplayName}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">{session.sessionCode}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <LabeledValue
                  label={t("detail.cancelConfirm.summaryFields.sessionTime")}
                  value={sessionScheduledDateLabel}
                  helper={sessionScheduledTimeLabel}
                />
                <LabeledValue
                  label={t("detail.cancelConfirm.summaryFields.duration")}
                  value={t("detail.duration", { n: session.durationMinutes })}
                />
                <LabeledValue
                  label={t("detail.cancelConfirm.summaryFields.mode")}
                  value={sessionTypeLabel}
                />
                <LabeledValue
                  label={t("detail.cancelConfirm.summaryFields.status")}
                  value={t(`status.${session.status}` as Parameters<typeof t>[0])}
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-border-light bg-primary-light/40 p-5 dark:bg-primary/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-brand">
                    {t("detail.cancelConfirm.eligibilityHeading")}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
                    {cancellationPreviewCanCancel
                      ? t("detail.cancelConfirm.eligibility.availableBadge")
                      : t("detail.cancelConfirm.eligibility.blockedBadge")}
                  </h3>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    cancellationPreviewCanCancel
                      ? "bg-success-100 text-success-800 dark:bg-success-500/10 dark:text-success-200"
                      : "bg-danger-100 text-danger-800 dark:bg-danger-500/10 dark:text-danger-200"
                  }`}
                >
                  {cancellationPreviewCanCancel
                    ? t("detail.cancelConfirm.eligibility.availableBadge")
                    : t("detail.cancelConfirm.eligibility.blockedBadge")}
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-border-light bg-white/70 p-4 dark:bg-white/5">
                {previewCancellationMutation.isPending ? (
                  <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
                    <Loader2 size={14} className="animate-spin" />
                    {t("detail.cancelConfirm.previewLoading")}
                  </p>
                ) : cancelPreviewError || !cancellationPreview ? (
                  <p className="text-sm text-danger-700 dark:text-danger-300">
                    {t("detail.cancelConfirm.previewLoadFailed")}
                  </p>
                ) : cancellationPreviewCanCancel ? (
                  <p className="text-sm leading-6 text-text-primary dark:text-white/90">
                    {t("detail.cancelConfirm.eligibility.availableNote")}
                  </p>
                ) : (
                  <>
                    <p className="text-base font-semibold text-danger-800 dark:text-danger-200">
                      {cancellationBlockedReasonTitle ??
                        t("detail.cancelConfirm.financialSummary.blocked")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {cancellationBlockedReasonNote ?? t("detail.cancelConfirm.cannotProceed")}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-border-light bg-white/70 p-4 dark:bg-white/5">
                <Link
                  href={cancellationPolicyPath}
                  className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
                >
                  {t("detail.cancelConfirm.policyAccessAction")}
                  <ExternalLink size={14} />
                </Link>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {t("detail.cancelConfirm.policyAccessNote")}
                </p>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  {t("detail.cancelConfirm.policyAccessHelper")}
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-[28px] border border-border-light bg-surface-tertiary p-5 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-brand">
                  {t("detail.cancelConfirm.financialHeading")}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {cancellationFinancialSummary}
                </p>
              </div>

              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <Wallet size={18} />
              </span>
            </div>

            <div className="mt-5">
              {previewCancellationMutation.isPending ? (
                <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <Loader2 size={14} className="animate-spin" />
                  {t("detail.cancelConfirm.previewLoading")}
                </p>
              ) : cancelPreviewError || !cancellationPreview ? (
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  {t("detail.cancelConfirm.previewLoadFailed")}
                </p>
              ) : cancellationPreviewCanCancel ? (
                cancellationHasRefund ? (
                  <div className="rounded-[24px] border border-border-light bg-white p-5 dark:bg-surface-secondary">
                    <div className="grid gap-3 sm:grid-cols-3 sm:divide-x sm:divide-border-light rtl:sm:divide-x-reverse">
                      <LabeledValue
                        label={t("detail.cancelConfirm.financialFields.refundPercent")}
                        value={`${cancellationPreview.refundPercent}%`}
                        tone="success"
                      />
                      <LabeledValue
                        label={t("detail.cancelConfirm.financialFields.refundAmount")}
                        value={cancellationPreviewAmount ?? "—"}
                        helper={t("detail.cancelConfirm.financialFields.walletCreditAmount")}
                        tone="success"
                      />
                      <LabeledValue
                        label={t("detail.cancelConfirm.financialFields.refundDestination")}
                        value={cancellationRefundDestinationLabel ?? "—"}
                      />
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-primary-light/45 px-4 py-3 text-sm leading-6 text-text-primary dark:bg-primary/10 dark:text-white/90">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <p>
                        {t("detail.cancelConfirm.financialSummary.allowedRefundWithAmount", {
                          amount: cancellationPreviewAmount ?? "",
                          destination: cancellationRefundDestinationLabel ?? "",
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-border-light bg-white px-4 py-4 text-sm leading-6 text-text-secondary dark:bg-surface-secondary">
                    <p className="font-medium text-text-primary dark:text-white/90">
                      {cancellationFinancialSummary}
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-[24px] border border-danger-200 bg-danger-50 px-4 py-4 text-sm leading-6 text-danger-800 dark:border-danger-500/20 dark:bg-danger-500/10 dark:text-danger-200">
                  <p className="font-medium">
                    {cancellationBlockedReasonTitle ??
                      t("detail.cancelConfirm.financialSummary.blocked")}
                  </p>
                  <p className="mt-1">
                    {cancellationBlockedReasonNote ?? t("detail.cancelConfirm.cannotProceed")}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-border-light bg-white p-4 dark:bg-surface-secondary">
            <label className="block text-sm font-semibold text-text-primary dark:text-white/90">
              {t("detail.cancelConfirm.noteLabel")}
            </label>
            <textarea
              value={cancellationReasonDraft}
              onChange={(event) => setCancellationReasonDraft(event.target.value)}
              maxLength={500}
              rows={2}
              className="app-control mt-3 w-full resize-none px-3 py-2.5"
              placeholder={t("detail.cancelConfirm.notePlaceholder")}
            />
            {!cancellationPreviewCanCancel && cancellationPreview ? (
              <p className="mt-3 text-sm font-medium text-danger-700 dark:text-danger-300">
                {t("detail.cancelConfirm.confirmDisabled")}
              </p>
            ) : null}
          </section>
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}

