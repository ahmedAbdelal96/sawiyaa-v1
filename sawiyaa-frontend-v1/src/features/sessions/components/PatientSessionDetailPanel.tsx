"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal, Modal, ModalBody } from "@/components/ui/modal";
import { toAppError } from "@/lib/api/errors";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { formatViewerDate, formatViewerDateTime, formatViewerTime } from "@/lib/time-formatting";
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
import { canOpenSessionChatFromPresentationStatus } from "../lib/session-presentation";
import SessionStatusBadge from "./SessionStatusBadge";
import { usePatientPayments } from "@/features/payments/hooks/use-payments";
import { canContinuePayment, isPaymentExpired } from "@/features/payments/lib/payment-status";
import type { SessionJoinItem, SessionRuntimeItem } from "../types/sessions.types";
import Avatar from "@/components/ui/avatar/Avatar";
import { Skeleton } from "@/components/shared/LoadingStates";
import { SurfaceCard, SurfaceHeader, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import { PatientSectionCard } from "@/components/patient/PatientChrome";
import PatientSessionReviewCard from "./PatientSessionReviewCard";

function formatDatetime(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
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
  return formatViewerDate(isoString, { locale: numLocale, fallbackText: "—" });
}

function formatSessionTimeLabel(isoString: string | null, numLocale: string): string {
  return formatViewerTime(isoString, { locale: numLocale, fallbackText: "—" });
}

function getSafeTranslation(
  t: any,
  key: string,
  fallback: string,
) {
  return t.has?.(key) ? t(key) : fallback;
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
    <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 dark:bg-white/5 transition-all duration-300">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-text-secondary dark:bg-white/8 dark:text-white/75 shadow-sm">
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
    <div className={`rounded-2xl border px-4 py-4 ${toneClassName} transition-all duration-300`}>
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
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName} transition-all duration-300`}>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">{value}</div>
      {helper ? <p className="mt-1 text-xs leading-5 text-text-secondary">{helper}</p> : null}
    </div>
  );
}

function PatientSessionDetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(340px,0.95fr)]">
      <div className="space-y-6">
        {/* Summary Card Skeleton */}
        <SurfaceCard variant="section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border-light bg-surface-tertiary p-4 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Runtime Card Skeleton */}
        <SurfaceCard variant="section" className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-3/4" />
          <div className="pt-2 flex gap-3">
            <Skeleton className="h-10 w-32 rounded-2xl" />
          </div>
        </SurfaceCard>

        {/* Chat Card Skeleton */}
        <SurfaceCard variant="section" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-36" />
            </div>
            <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
          </div>
          <Skeleton className="h-4 w-5/6" />
          <div className="pt-2">
            <Skeleton className="h-10 w-28 rounded-2xl" />
          </div>
        </SurfaceCard>
      </div>

      <aside className="space-y-6">
        {/* Payment Card Skeleton */}
        <SurfaceCard variant="section" className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-5/6" />
          <div className="grid gap-3 sm:grid-cols-3 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border-light bg-surface-tertiary p-3 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Cancel Card Skeleton */}
        <SurfaceCard variant="section" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-36" />
            </div>
            <Skeleton className="h-9 w-24 rounded-2xl" />
          </div>
          <Skeleton className="h-4 w-5/6" />
        </SurfaceCard>
      </aside>
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
  const isRtl = locale.startsWith("ar");

  const [now, setNow] = useState<number>(() => Date.now());

  const { data: session, isLoading, isError, refetch } = usePatientSession(sessionId);

  useEffect(() => {
    if (!session || session.status !== "PENDING_PAYMENT") {
      return;
    }
    const deadline = session.expiresAt;
    if (!deadline) {
      return;
    }

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session]);

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
  const [reviewOpen, setReviewOpen] = useState(false);

  if (isLoading) {
    return <PatientSessionDetailSkeleton />;
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
              className="sawiyaa-btn-press inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("detail.backToSessions")}
            </Link>
          ),
        }}
      />
    );
  }

  // Old client caches may not contain the new backend-owned action contract.
  // Deny every action until a fresh response arrives rather than inferring from status.
  const actions = session.actions ?? {
    canCancel: false,
    canPrepareRoom: false,
    canJoin: false,
    canPay: false,
    canReview: false,
  };
  const reviewCompletedAt =
    session.completedAt ?? (actions.canReview ? session.scheduledEndAt : null);
  const isCancellable = actions.canCancel;
  const hasRuntimeAccess =
    hasSessionRuntimeAccess(session.status) &&
    (actions.canPrepareRoom || actions.canJoin);
  const paymentStateKey =
    session.status === "PENDING_PAYMENT"
      ? "PENDING_PAYMENT"
      : session.status === "EXPIRED"
        ? "EXPIRED"
        : ["UPCOMING", "READY_TO_JOIN", "IN_PROGRESS", "COMPLETED"].includes(session.status)
            ? "SECURED"
          : null;
  const sessionPayment = paymentsData?.items.find((payment) => payment.sessionId === session.id);
  const isReservationExpired = Boolean(
    session.expiresAt && new Date(session.expiresAt).getTime() <= now
  );
  const isPaymentAttemptExpired = Boolean(
    sessionPayment && isPaymentExpired(sessionPayment, now)
  );
  const isPaymentWindowExpired = isReservationExpired;

  const paymentDisplayStateKey =
    isReservationExpired && session.status === "PENDING_PAYMENT"
      ? "EXPIRED"
      : paymentStateKey;

  const sessionPaymentCurrency = sessionPayment?.currency ?? null;
  const sessionPaymentHasDiscount = Boolean(
    sessionPayment && Number(sessionPayment.amountDiscount) > 0,
  );
  const hasActivePendingPayment = Boolean(
    sessionPayment &&
      ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(sessionPayment.status) &&
      !isPaymentAttemptExpired
  );
  const canJoinNow = joinResult?.canJoin ?? actions.canJoin;
  const blockedJoinReason =
    joinResult?.blockedReason ?? session.joinAvailability?.blockedReason ?? null;
  const isRoomClosed = blockedJoinReason === "SESSION_ROOM_CLOSED";
  const canOpenSessionChat = canOpenSessionChatFromPresentationStatus(
    session.presentationStatus,
  );
  const joinUrl = buildProviderLaunchUrl(joinResult);
  const runtimePrepared = getRuntimePreparedState({ prepareResult, joinResult });
  const runtimeProvider = getRuntimeProvider({ prepareResult, joinResult });
  const runtimeRoomName = getRuntimeRoomName({ prepareResult, joinResult });
  const runtimeProviderLabel = formatProviderDisplayName(runtimeProvider);
  const prepareAllowed =
    actions.canPrepareRoom &&
    hasRuntimeAccess &&
    !isRoomClosed &&
    !runtimePrepared &&
    canPrepareSessionRuntime(session, joinResult);
  const joinWindowOpen = isJoinWindowOpen(session, joinResult);
  const shouldShowJoinCheck =
    hasRuntimeAccess &&
    !isRoomClosed &&
    !(joinResult?.canJoin && canLaunchProviderRuntime(joinResult)) &&
    canJoinNow;
  const cancellationPreview = previewCancellationMutation.data;
  const runtimeStatusNote = t(`detail.presentation.${session.presentationStatus}.note` as Parameters<
    typeof t
  >[0]);
  const runtimeStatusTitle = t(`detail.presentation.${session.presentationStatus}.title` as Parameters<
    typeof t
  >[0]);
  const runtimeStatusCloseout = t(
    `detail.presentation.${session.presentationStatus}.closeout` as Parameters<typeof t>[0],
  );
  const sessionModeLabel = t(`detail.mode.${session.sessionMode}` as Parameters<
    typeof t
  >[0]);
  const chatNote = canOpenSessionChat ? t("detail.chatCard.note") : t("detail.chatCard.disabledNote");
  const paymentStateNote = paymentDisplayStateKey
    ? tPayments(`sessionState.${paymentDisplayStateKey}.note` as Parameters<typeof tPayments>[0])
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
  const supportHref = `/patient/messages?lane=support&relatedSessionId=${encodeURIComponent(
    session.id,
  )}`;
  const roomCloseSupportHeading = getSafeTranslation(
    t,
    "detail.roomClose.support.heading",
    locale.startsWith("ar") ? "هل تحتاج إلى مساعدة في هذه الجلسة؟" : "Need help with this session?",
  );
  const roomCloseSupportNote = getSafeTranslation(
    t,
    "detail.roomClose.support.note",
    locale.startsWith("ar")
      ? "إذا أُغلقت الغرفة بشكل غير متوقع أو احتجت إلى مراجعة ما حدث، يمكن للدعم مساعدتك."
      : "If the room closed unexpectedly or you need help reviewing what happened, support can help.",
  );
  const roomCloseSupportAction = getSafeTranslation(
    t,
    "detail.roomClose.support.action",
    locale.startsWith("ar") ? "اتصل بالدعم" : "Contact support",
  );
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_360px]">
      <div className="space-y-6">
        {/* Unified, Compact Session Details Card */}
        <PatientSectionCard
          className="shadow-[0_8px_24px_rgba(36,86,79,0.08)] border-border-soft bg-white p-4 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-light/60">
            {/* Practitioner Profile details */}
            <div className="flex items-center gap-3.5">
              <Avatar
                src={null}
                alt={session.practitioner.displayName ?? session.practitioner.slug}
                name={undefined}
                fallbackInitials={undefined}
                size="large"
                className="ring-2 ring-primary/10"
              />
              <div className="min-w-0 space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-text-primary dark:text-white/95 leading-tight">
                  {session.practitioner.displayName ?? session.practitioner.slug}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
                  <span className="font-semibold text-text-secondary">{sessionModeLabel}</span>
                  <span className="text-text-muted">•</span>
                  <span className="text-text-muted">{t("detail.duration", { n: session.durationMinutes })}</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="sm:self-center">
              <SessionStatusBadge
                status={isReservationExpired ? "EXPIRED" : session.status}
                presentationStatus={isReservationExpired ? undefined : session.presentationStatus}
              />
            </div>
          </div>

          {/* Session Metadata details (clean text grids, NO NESTED CARDS!) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-5 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t("detail.summary.scheduledAt")}
              </span>
              <p className="text-sm sm:text-base font-bold text-text-primary dark:text-white/90">
                {session.scheduledStartAt
                  ? formatDatetime(session.scheduledStartAt, numLocale)
                  : t("detail.notScheduled")}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t("detail.summary.sessionCode")}
              </span>
              <p className="font-mono text-sm sm:text-base font-bold text-text-primary dark:text-white/90">
                {session.sessionCode}
              </p>
            </div>

            <div className="space-y-1 col-span-2 md:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {locale === "ar" ? "موعد الانتهاء المتوقع" : "Expected End"}
              </span>
              <p className="text-sm sm:text-base font-semibold text-text-secondary dark:text-white/70">
                {session.scheduledEndAt
                  ? formatDatetime(session.scheduledEndAt, numLocale)
                  : "—"}
              </p>
            </div>
          </div>
        </PatientSectionCard>

        {/* Combined Session Action Operations Card */}
        <PatientSectionCard
          className="shadow-[0_8px_24px_rgba(36,86,79,0.08)] border-border-soft bg-white p-5 space-y-4"
        >
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-text-primary dark:text-white/95">
              {locale === "ar" ? "التواصل والاتصال بالجلسة" : "Session Communication & Operations"}
            </h3>
            <p className="text-sm text-text-secondary">
              {locale === "ar"
                ? "ابدأ محادثة مع المختص أو انضم إلى غرفة الجلسة عند تفعيلها."
                : "Message the practitioner or join the session room when available."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 pt-3">
            {/* Join Section */}
            <div className="flex-1 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t("detail.runtime.heading")}
              </p>
              
              {hasRuntimeAccess ? (
                <div className="space-y-3">
                  {joinResult?.canJoin && joinUrl ? (
                    <div className="space-y-3">
                      <p className="text-sm text-success-700 font-medium">
                        {t("detail.runtime.ready")}
                      </p>
                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover transition"
                      >
                        <ExternalLink size={16} />
                        {t("detail.runtime.actions.openRoom")}
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {prepareAllowed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrepareRuntime}
                          disabled={prepareMutation.isPending}
                          className="rounded-xl px-5 py-2.5 text-sm font-bold"
                        >
                          {prepareMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
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
                          className="rounded-xl px-5 py-2.5 text-sm font-bold"
                        >
                          {joinMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            t("detail.runtime.actions.joinNow")
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {prepareResult?.isPrepared && !joinResult?.canJoin && (
                    <p className="text-sm text-text-secondary font-medium">
                      {t("detail.runtime.prepared")}
                    </p>
                  )}

                  {blockedJoinReason && !canJoinNow && (
                    <div className="space-y-3">
                      <p className="text-sm text-text-muted">
                        {t(
                          `detail.runtime.blocked.${getRuntimeBlockedReasonKey(blockedJoinReason)}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </p>
                      {blockedJoinReason === "SESSION_ROOM_CLOSED" ? (
                        <div className="rounded-2xl border border-primary/15 bg-primary-light px-4 py-4 text-sm text-text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-white/90">
                          <p className="font-semibold">{roomCloseSupportHeading}</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {roomCloseSupportNote}
                          </p>
                          <Link
                            href={supportHref}
                            className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                          >
                            {roomCloseSupportAction}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {!joinResult?.canJoin && !prepareAllowed && !shouldShowJoinCheck && !isRoomClosed && (
                    <p className="text-sm text-text-muted">
                      {t("detail.liveFlow.phases.awaitingWindow.note")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  {t("detail.liveFlow.phases.awaitingWindow.note")}
                </p>
              )}
            </div>

            <div className="h-px bg-border-light sm:h-auto sm:w-px sm:mx-2" />

            {/* Chat Section */}
            <div className="flex-1 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t("detail.chat.eyebrow")}
              </p>
              
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  {chatNote}
                </p>
                
                {canOpenSessionChat ? (
                  <Link
                    href={`/patient/sessions/${session.id}/chat` as never}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover transition"
                  >
                    {t("detail.chatCard.open")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-border-light px-5 py-2.5 text-sm font-semibold text-text-muted opacity-60"
                  >
                    {t("detail.chatCard.open")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </PatientSectionCard>

        {actions.canReview ? (
          <PatientSectionCard className="border-border-soft bg-white p-5 shadow-[0_8px_24px_rgba(36,86,79,0.08)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-text-primary dark:text-white/95">
                  {t("detail.reviewAction.heading")}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t("detail.reviewAction.note")}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setReviewOpen(true)}
                className="rounded-xl px-5 py-2.5 text-sm font-bold"
              >
                {t("detail.reviewAction.cta")}
              </Button>
            </div>
          </PatientSectionCard>
        ) : null}
      </div>

      {/* Sidebar Columns */}
      <aside className="space-y-6 xl:sticky xl:top-6 self-start">
        {paymentDisplayStateKey && (
          <PatientSectionCard
            className={`shadow-[0_8px_24px_rgba(36,86,79,0.08)] border-border-soft p-5 space-y-4 ${
              paymentDisplayStateKey === "SECURED"
                ? "bg-green-50/20 border border-green-200"
                : paymentDisplayStateKey === "PENDING_PAYMENT"
                  ? "bg-primary-light/10 border border-primary/15"
                  : "bg-amber-50/20 border border-amber-200"
            }`}
          >
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {tPayments("breakdown.heading")}
              </p>
              <h3 className="text-base font-bold text-text-primary dark:text-white/95">
                {tPayments(`sessionState.${paymentDisplayStateKey}.label` as any)}
              </h3>
              {paymentStateNote && (
                <p className="text-sm text-text-secondary">
                  {paymentStateNote}
                </p>
              )}
            </div>

            {/* Price breakdown textual list (NO NESTED CARDS!) */}
            <div className="space-y-3 pt-3 border-t border-border-light/60 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">{tPayments("breakdown.grossAmount")}</span>
                <span className="font-semibold text-text-primary dark:text-white/90">{sessionPriceValue}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">{tPayments("breakdown.discount")}</span>
                <span className="font-semibold text-text-brand dark:text-primary-light">
                  {sessionPaymentHasDiscount ? `-${sessionDiscountValue}` : sessionDiscountValue}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border-light/60 font-bold">
                <span className="text-text-primary">{tPayments("breakdown.netPaid")}</span>
                <span className="text-base text-primary">{sessionNetValue}</span>
              </div>
            </div>

            {/* Actions list */}
            <div className="pt-2 flex flex-col gap-2">
              {actions.canPay && !isPaymentWindowExpired && (
                <Link
                  href={`/patient/sessions/${session.id}/pay` as never}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover transition"
                >
                  {tPayments("sessionState.PENDING_PAYMENT.action")}
                </Link>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/patient/payments"
                  className="inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-tertiary transition"
                >
                  {tPayments("sessionMoney.actions.history")}
                </Link>
                <Link
                  href="/patient/wallet"
                  className="inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-tertiary transition"
                >
                  {tPayments("sessionMoney.actions.wallet")}
                </Link>
              </div>
            </div>
          </PatientSectionCard>
        )}

        {/* Compact Cancellation Card */}
        {isCancellable ? (
          <PatientSectionCard
            className="shadow-[0_8px_24px_rgba(36,86,79,0.08)] border-border-soft bg-white p-4 sm:p-5"
          >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text-primary">
                {t("detail.cancelAction")}
              </h4>
              <p className="text-xs text-text-muted leading-tight">
                {t("detail.cancelConfirm.policyNote")}
              </p>
            </div>
            
            <Button
              variant="danger"
              size="sm"
              onClick={openCancelModal}
              className="rounded-xl px-4 py-2.5 text-sm font-bold shrink-0"
            >
              {t("detail.cancelAction")}
            </Button>
          </div>

          {cancelFeedbackKey === "SUCCESS" && (
            <div className="mt-3 rounded-xl border border-success-200 bg-success-50 px-3.5 py-2 text-xs text-success-700">
              {t("detail.cancelResult.success")}
            </div>
          )}
          {cancelFeedbackKey === "NOT_ALLOWED" && (
            <div className="mt-3 rounded-xl border border-warning-200 bg-warning-50 px-3.5 py-2 text-xs text-warning-800">
              {t("detail.cancelResult.notAllowedByPolicy")}
            </div>
          )}
          {cancelFeedbackKey === "FAILED" && (
            <div className="mt-3 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2 text-xs text-danger-700">
              {t("detail.cancelResult.failed")}
            </div>
          )}
          </PatientSectionCard>
        ) : null}
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
            <SurfaceCard variant="section" className="bg-white dark:bg-surface-secondary">
              <div className="flex items-start gap-4">
                <Avatar
                  src={null}
                  alt={practitionerDisplayName}
                  size="xlarge"
                  className="shrink-0"
                />
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
                  value={
                    <SessionStatusBadge
                      status={isReservationExpired ? "EXPIRED" : session.status}
                      presentationStatus={isReservationExpired ? undefined : session.presentationStatus}
                    />
                  }
                />
              </div>
            </SurfaceCard>

            <SurfaceCard variant="section" className="bg-primary-light/40 dark:bg-primary/10">
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
                  className="sawiyaa-btn-press inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary hover:-translate-y-0.5 duration-200 dark:bg-white/5 dark:text-white/90"
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
            </SurfaceCard>
          </div>

          <SurfaceCard variant="section" className="bg-surface-tertiary dark:bg-white/5">
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
          </SurfaceCard>

          <SurfaceCard variant="compact" className="bg-white dark:bg-surface-secondary">
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
          </SurfaceCard>
        </div>
      </DestructiveConfirmModal>

      <Modal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        size="md"
        ariaLabel={t("detail.reviewAction.heading")}
      >
        <ModalBody className="p-6 sm:p-7">
          <PatientSessionReviewCard
            sessionId={session.id}
            practitionerName={session.practitioner.displayName}
            completedAt={reviewCompletedAt}
            onSubmitted={() => {
              window.setTimeout(() => {
                setReviewOpen(false);
                void refetch();
              }, 1200);
            }}
            onCancel={() => setReviewOpen(false)}
          />
        </ModalBody>
      </Modal>
    </div>
  );
}
