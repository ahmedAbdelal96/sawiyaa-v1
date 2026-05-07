"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Video,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { toAppError } from "@/lib/api/errors";
import {
  useCancelPatientSession,
  usePreviewPatientSessionCancellation,
  usePreparePatientSessionRuntime,
  usePatientSession,
  useResolvePatientSessionJoinContract,
} from "../hooks/use-sessions";
import {
  buildProviderLaunchUrl,
  canPrepareSessionRuntime,
  canLaunchProviderRuntime,
  getRuntimeBlockedReasonKey,
  getRuntimePreparedState,
  getRuntimeProvider,
  getRuntimeRoomName,
  formatProviderDisplayName,
  hasSessionRuntimeAccess,
  isJoinWindowOpen,
} from "../lib/session-runtime";
import { dispatchOpenSessionChatInShell } from "@/features/messages-shell/lib/messages-shell-events";
import PatientMoneyClarityPanel from "@/features/payments/components/PatientMoneyClarityPanel";
import { canContinuePayment } from "@/features/payments/lib/payment-status";
import { usePatientPayments } from "@/features/payments/hooks/use-payments";
import PatientSessionNextStepsPanel from "./PatientSessionNextStepsPanel";
import SessionStatusBadge from "./SessionStatusBadge";
import type {
  SessionJoinItem,
  SessionRuntimeItem,
  SessionStatus,
} from "../types/sessions.types";

const CANCELLABLE_STATUSES: SessionStatus[] = ["CONFIRMED", "UPCOMING"];

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

function formatMoney(value: string, numLocale: string): string {
  return new Intl.NumberFormat(numLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || "0"));
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
  const openInMessagesLabel = locale.startsWith("ar")
    ? "فتح داخل الرسائل"
    : "Open in messages";

  const liveFlowKey = !hasRuntimeAccess
    ? "unavailable"
    : session.status === "IN_PROGRESS"
      ? "liveNow"
      : joinResult?.canJoin && canLaunchProviderRuntime(joinResult)
        ? "readyToJoin"
        : runtimePrepared
          ? "preparedWaiting"
          : prepareAllowed
            ? "readyToPrepare"
            : "awaitingWindow";

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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white/90">
                {t("detail.with")}{" "}
                {session.practitioner.displayName ?? session.practitioner.slug}
              </h2>
              <p className="mt-1 font-mono text-xs text-text-muted">{session.sessionCode}</p>
            </div>
            <SessionStatusBadge status={session.status} />
          </div>

          <div className="space-y-1.5 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="shrink-0 text-text-muted" />
              {session.scheduledStartAt ? (
                <span>{formatDatetime(session.scheduledStartAt, numLocale)}</span>
              ) : (
                <span className="text-text-muted">{t("detail.notScheduled")}</span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <CalendarClock size={14} className="mt-0.5 shrink-0 text-text-muted" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-muted">
                  {t("detail.bookingStartedAt")}
                </p>
                <p>{formatDatetime(session.createdAt, numLocale)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="shrink-0 text-text-muted" />
              <span>{t("detail.duration", { n: session.durationMinutes })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video size={14} className="shrink-0 text-text-muted" />
              <span>
                {t(`detail.mode.${session.sessionMode}` as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("detail.runtime.heading")}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {t(`detail.runtime.status.${session.status}` as Parameters<typeof t>[0])}
            </p>
          </div>

          {session.status === "PENDING_PAYMENT" && hasActivePendingPayment && (
            <Link
              href={`/patient/sessions/${session.id}/pay` as never}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 sm:w-auto"
            >
              {t("detail.PENDING_PAYMENT.action")}
            </Link>
          )}

          {hasRuntimeAccess && (
            <div className="space-y-3">
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 sm:w-auto"
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
                      ) : session.status === "READY_TO_JOIN" ||
                        session.status === "IN_PROGRESS" ? (
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
                    `detail.runtime.blocked.${getRuntimeBlockedReasonKey(joinResult.blockedReason)}` as Parameters<typeof t>[0],
                  )}
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
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("detail.currentStateHeading")}
        </h3>
        <p className="text-sm text-text-secondary">
          {t(`detail.${session.status}.note` as Parameters<typeof t>[0])}
        </p>
        {session.status === "CANCELLED" && session.cancellationReason && (
          <p className="mt-1 text-xs text-text-muted">
            {t("detail.CANCELLED.reason", { reason: session.cancellationReason })}
          </p>
        )}
        {session.status === "EXPIRED" && (
          <div className="mt-4">
            <Link
              href="/practitioners"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 sm:w-auto"
            >
              {t("detail.bookNewSlot")}
            </Link>
          </div>
        )}
      </div>

      {session.status === "COMPLETED" ? (
        <PatientSessionNextStepsPanel session={session} />
      ) : null}

      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("detail.liveFlow.heading")}
        </h3>
        <p className="text-sm font-medium text-text-primary dark:text-white/90">
          {t(`detail.liveFlow.phases.${liveFlowKey}.title` as Parameters<typeof t>[0])}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {t(`detail.liveFlow.phases.${liveFlowKey}.note` as Parameters<typeof t>[0])}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-tertiary px-4 py-3 text-sm dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("detail.liveFlow.facts.provider")}
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
              {runtimeProviderLabel ?? t("detail.liveFlow.provider.NONE")}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-tertiary px-4 py-3 text-sm dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("detail.liveFlow.facts.room")}
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
              {runtimeRoomName ?? t("detail.liveFlow.facts.roomPending")}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-text-secondary">
          {prepareAllowed && (
            <p>{t("detail.liveFlow.notes.prepareWindow")}</p>
          )}
          {hasRuntimeAccess && !joinWindowOpen && (
            <p>{t("detail.liveFlow.notes.joinWindow")}</p>
          )}
          {runtimePrepared && (
            <p>{t("detail.liveFlow.notes.returnToSession")}</p>
          )}
          {joinUrl && (
            <p>{t("detail.liveFlow.notes.openInNewTab")}</p>
          )}
        </div>
      </div>

      {paymentStateKey && (
        <div
          className={
            paymentStateKey === "SECURED"
              ? "rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-700/40 dark:bg-green-900/10"
              : paymentStateKey === "PENDING_PAYMENT"
                ? "rounded-2xl border border-primary/15 bg-primary-light p-5 dark:border-primary/20 dark:bg-primary/10"
                : "rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700/40 dark:bg-amber-900/10"
          }
        >
          <h3
            className={
              paymentStateKey === "SECURED"
                ? "mb-2 text-sm font-semibold text-green-800 dark:text-green-300"
                : paymentStateKey === "PENDING_PAYMENT"
                  ? "mb-2 text-sm font-semibold text-text-primary dark:text-white/90"
                  : "mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300"
            }
          >
            {tPayments("sessionState.heading")}
          </h3>
          <p
            className={
              paymentStateKey === "SECURED"
                ? "text-sm font-medium text-green-700 dark:text-green-400"
                : paymentStateKey === "PENDING_PAYMENT"
                  ? "text-sm font-medium text-text-primary dark:text-white/90"
                  : "text-sm font-medium text-amber-800 dark:text-amber-300"
            }
          >
            {tPayments(
              `sessionState.${paymentStateKey}.label` as Parameters<typeof tPayments>[0],
            )}
          </p>
          <p
            className={
              paymentStateKey === "SECURED"
                ? "mt-1 text-sm text-green-700/80 dark:text-green-400/80"
                : paymentStateKey === "PENDING_PAYMENT"
                  ? "mt-1 text-sm text-text-secondary"
                  : "mt-1 text-sm text-amber-700/80 dark:text-amber-400/80"
            }
          >
            {tPayments(
              `sessionState.${paymentStateKey}.note` as Parameters<typeof tPayments>[0],
            )}
          </p>

          {paymentStateKey === "PENDING_PAYMENT" && hasActivePendingPayment && (
            <div className="mt-4">
              <Link
                href={`/patient/sessions/${session.id}/pay` as never}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                {tPayments("sessionState.PENDING_PAYMENT.action")}
              </Link>
            </div>
          )}
        </div>
      )}

      {paymentStateKey ? (
        <PatientMoneyClarityPanel
          eyebrow={tPayments("sessionMoney.eyebrow")}
          title={tPayments("sessionMoney.heading")}
          note={tPayments(`sessionMoney.notes.${paymentStateKey}` as Parameters<
            typeof tPayments
          >[0])}
          actions={[
            { label: tPayments("sessionMoney.actions.wallet"), href: "/patient/wallet" },
            { label: tPayments("sessionMoney.actions.history"), href: "/patient/payments", tone: "primary" },
          ]}
          variant="soft"
        />
      ) : null}

      {session.status !== "COMPLETED" ? (
        <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("detail.chatCard.heading")}
        </h3>
        {["READY_TO_JOIN", "IN_PROGRESS", "COMPLETED"].includes(session.status) ? (
          <p className="text-sm text-text-secondary">{t("detail.chatCard.note")}</p>
        ) : (
          <p className="text-sm text-text-secondary">
            {t("detail.chatCard.disabledNote")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {["READY_TO_JOIN", "IN_PROGRESS", "COMPLETED"].includes(session.status) ? (
            <>
              <button
                type="button"
                onClick={() => dispatchOpenSessionChatInShell({ sessionId: session.id })}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover sm:w-auto"
              >
                {openInMessagesLabel}
              </button>
              <Link
                href={`/patient/sessions/${session.id}/chat` as never}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:text-white/90 dark:hover:text-primary-light sm:w-auto"
              >
                {t("detail.chatCard.open")}
              </Link>
            </>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-medium text-text-muted opacity-70 sm:w-auto"
            >
              {t("detail.chatCard.open")}
            </button>
          )}
        </div>
        </div>
      ) : null}

      {cancelFeedbackKey === "SUCCESS" ? (
        <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          {t("detail.cancelResult.success")}
        </div>
      ) : null}
      {cancelFeedbackKey === "NOT_ALLOWED" ? (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
          {t("detail.cancelResult.notAllowedByPolicy")}
        </div>
      ) : null}
      {cancelFeedbackKey === "FAILED" ? (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300">
          {t("detail.cancelResult.failed")}
        </div>
      ) : null}

      {isCancellable && (
        <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
          <Button variant="outline" size="sm" onClick={openCancelModal}>
            {t("detail.cancelAction")}
          </Button>
          {cancelMutation.isError && (
            <p className="mt-3 text-xs text-red-500">{t("detail.cancelError")}</p>
          )}
        </div>
      )}

      <DestructiveConfirmModal
        isOpen={confirmingCancel}
        onClose={() => {
          setConfirmingCancel(false);
          cancelMutation.reset();
          previewCancellationMutation.reset();
          setCancelPreviewError(false);
          setCancellationReasonDraft("");
        }}
        size="sm"
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
        cancelLabel={t("detail.cancelConfirm.back")}
        onConfirm={() => {
          if (!cancellationPreview?.canCancelNow) {
            return;
          }
          void handleCancel();
        }}
        loading={cancelMutation.isPending || previewCancellationMutation.isPending}
      >
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <p className="font-medium">
            {session.practitioner.displayName ?? session.practitioner.slug}
          </p>
          <p className="mt-1 text-xs opacity-80">
            {session.scheduledStartAt
              ? formatDatetime(session.scheduledStartAt, numLocale)
              : t("detail.notScheduled")}
          </p>
        </div>
        <div className="mt-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
          <p className="font-medium text-text-primary dark:text-white/90">
            {t("detail.cancelConfirm.policyHeading")}
          </p>
          <p className="mt-1">{t("detail.cancelConfirm.policyNote")}</p>
        </div>
        <div className="mt-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
          <p className="font-medium text-text-primary dark:text-white/90">
            {t("detail.cancelConfirm.previewHeading")}
          </p>
          {previewCancellationMutation.isPending ? (
            <p className="mt-2 inline-flex items-center gap-2 text-sm">
              <Loader2 size={14} className="animate-spin" />
              {t("detail.cancelConfirm.previewLoading")}
            </p>
          ) : cancelPreviewError || !cancellationPreview ? (
            <p className="mt-2 text-sm text-danger-700 dark:text-danger-300">
              {t("detail.cancelConfirm.previewLoadFailed")}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-text-primary dark:text-white/90">
                {t(
                  `detail.cancelConfirm.outcomes.${cancellationPreview.outcomeType}` as Parameters<
                    typeof t
                  >[0],
                )}
              </p>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-xl border border-border-light bg-surface-primary px-3 py-2 dark:bg-white/5">
                  <p className="text-text-muted">{t("detail.cancelConfirm.fields.refundPercent")}</p>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                    {cancellationPreview.refundPercent
                      ? `${cancellationPreview.refundPercent}%`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-primary px-3 py-2 dark:bg-white/5">
                  <p className="text-text-muted">{t("detail.cancelConfirm.fields.refundDestination")}</p>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                    {cancellationPreview.refundDestination
                      ? t(
                          `detail.cancelConfirm.destinations.${cancellationPreview.refundDestination}` as Parameters<
                            typeof t
                          >[0],
                        )
                      : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-primary px-3 py-2 dark:bg-white/5">
                  <p className="text-text-muted">
                    {t("detail.cancelConfirm.fields.reservationReleaseAmount")}
                  </p>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                    {formatMoney(cancellationPreview.reservationReleaseAmount, numLocale)}
                  </p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-primary px-3 py-2 dark:bg-white/5">
                  <p className="text-text-muted">{t("detail.cancelConfirm.fields.refundAmount")}</p>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                    {formatMoney(cancellationPreview.refundAmount, numLocale)}
                  </p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-primary px-3 py-2 dark:bg-white/5">
                  <p className="text-text-muted">{t("detail.cancelConfirm.fields.walletCreditAmount")}</p>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                    {formatMoney(cancellationPreview.walletCreditAmount, numLocale)}
                  </p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-primary px-3 py-2 dark:bg-white/5">
                  <p className="text-text-muted">{t("detail.cancelConfirm.fields.noRefund")}</p>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                    {cancellationPreview.outcomeType === "NO_REFUND"
                      ? t("detail.cancelConfirm.yes")
                      : t("detail.cancelConfirm.no")}
                  </p>
                </div>
              </div>
              {!cancellationPreview.canCancelNow ? (
                <p className="text-xs text-warning-800 dark:text-warning-300">
                  {t("detail.cancelConfirm.cannotProceed")}
                </p>
              ) : null}
            </div>
          )}
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("detail.cancelConfirm.reasonLabel")}
          </label>
          <textarea
            value={cancellationReasonDraft}
            onChange={(event) => setCancellationReasonDraft(event.target.value)}
            maxLength={500}
            rows={3}
            className="app-control mt-2 w-full resize-none px-3 py-2.5"
            placeholder={t("detail.cancelConfirm.reasonPlaceholder")}
          />
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}
