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
  User,
  Video,
  XCircle,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { ConfirmModal, DestructiveConfirmModal } from "@/components/ui/modal";
import {
  useMarkPractitionerSessionCompleted,
  useMarkPractitionerSessionNoShow,
  usePreparePractitionerSessionRuntime,
  usePractitionerSession,
  useResolvePractitionerSessionJoinContract,
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
import { canOpenSessionChatFromPresentationStatus } from "../lib/session-presentation";
import { dispatchOpenSessionChatInShell } from "@/features/messages-shell/lib/messages-shell-events";
import SessionStatusBadge from "./SessionStatusBadge";
import type {
  SessionJoinItem,
  SessionRuntimeItem,
  SessionPresentationStatus,
} from "../types/sessions.types";

const COMPLETE_ALLOWED_PRESENTATION_STATUSES: SessionPresentationStatus[] = [
  "JOINABLE",
  "IN_PROGRESS",
];
const NO_SHOW_ALLOWED_PRESENTATION_STATUSES: SessionPresentationStatus[] = [
  "UPCOMING",
  "JOINABLE",
  "IN_PROGRESS",
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

type Props = {
  sessionId: string;
};

export default function PractitionerSessionDetailPanel({ sessionId }: Props) {
  const t = useTranslations("sessions.practitioner");
  const commonT = useTranslations("sessions");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const [confirmingAction, setConfirmingAction] = useState<"complete" | "no-show" | null>(
    null,
  );
  const [recentAction, setRecentAction] = useState<"complete" | "no-show" | null>(null);
  const [joinResult, setJoinResult] = useState<SessionJoinItem | null>(null);
  const [prepareResult, setPrepareResult] = useState<SessionRuntimeItem | null>(null);

  const { data: session, isLoading, isError } = usePractitionerSession(sessionId);
  const completeMutation = useMarkPractitionerSessionCompleted();
  const noShowMutation = useMarkPractitionerSessionNoShow();
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
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
              href="/practitioner/sessions"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("detail.backToSessions")}
            </Link>
          ),
        }}
      />
    );
  }

  const isActive =
    session.presentationStatus !== "COMPLETED" &&
    session.presentationStatus !== "CANCELLED" &&
    session.presentationStatus !== "ENDED";
  const hasRuntimeAccess = hasSessionRuntimeAccess(session.status);
  const canMarkCompleted = COMPLETE_ALLOWED_PRESENTATION_STATUSES.includes(
    session.presentationStatus,
  );
  const canMarkNoShow = NO_SHOW_ALLOWED_PRESENTATION_STATUSES.includes(
    session.presentationStatus,
  );
  const isBusy =
    completeMutation.isPending || noShowMutation.isPending || joinMutation.isPending;
  const joinUrl = buildProviderLaunchUrl(joinResult);
  const runtimePrepared = getRuntimePreparedState({ prepareResult, joinResult });
  const runtimeProvider = getRuntimeProvider({ prepareResult, joinResult });
  const runtimeRoomName = getRuntimeRoomName({ prepareResult, joinResult });
  const runtimeProviderLabel = formatProviderDisplayName(runtimeProvider);
  const prepareAllowed = hasRuntimeAccess && !runtimePrepared && canPrepareSessionRuntime(session, joinResult);
  const joinWindowOpen = isJoinWindowOpen(session, joinResult);
  const canJoinNow = session.joinAvailability?.canJoin === true;
  const canOpenSessionChat = canOpenSessionChatFromPresentationStatus(
    session.presentationStatus,
  );
  const presentationTitle = t(
    `detail.presentation.${session.presentationStatus}.title` as Parameters<typeof t>[0],
  );
  const presentationNote = t(
    `detail.presentation.${session.presentationStatus}.note` as Parameters<typeof t>[0],
  );
  const presentationCloseout = t(
    `detail.presentation.${session.presentationStatus}.closeout` as Parameters<typeof t>[0],
  );
  const shouldShowJoinCheck =
    hasRuntimeAccess &&
    !(joinResult?.canJoin && canLaunchProviderRuntime(joinResult)) &&
    canJoinNow;
  const openInMessagesLabel = locale.startsWith("ar")
    ? "فتح داخل الرسائل"
    : "Open in messages";

  const liveFlowKey = !hasRuntimeAccess
    ? "unavailable"
    : session.presentationStatus === "IN_PROGRESS"
      ? "liveNow"
      : joinResult?.canJoin && canLaunchProviderRuntime(joinResult)
        ? "readyToJoin"
        : runtimePrepared
          ? "preparedWaiting"
          : prepareAllowed
            ? "readyToPrepare"
            : "awaitingWindow";

  const handleMarkCompleted = async () => {
    try {
      await completeMutation.mutateAsync(session.id);
      setConfirmingAction(null);
      setRecentAction("complete");
      noShowMutation.reset();
    } catch {
      setRecentAction(null);
    }
  };

  const handleMarkNoShow = async () => {
    try {
      await noShowMutation.mutateAsync(session.id);
      setConfirmingAction(null);
      setRecentAction("no-show");
      completeMutation.reset();
    } catch {
      setRecentAction(null);
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

  const handlePrepareRuntime = async () => {
    try {
      const result = await prepareMutation.mutateAsync(session.id);
      setPrepareResult(result);
    } catch {
      setPrepareResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white/90">
                {t("detail.with")} {session.patient?.displayName ?? "-"}
              </h2>
              <p className="mt-1 font-mono text-xs text-text-muted">{session.sessionCode}</p>
            </div>
            <SessionStatusBadge
              status={session.status}
              presentationStatus={session.presentationStatus}
            />
          </div>

          <div className="space-y-1.5 text-sm text-text-secondary">
            {session.patient?.displayName && (
              <div className="flex items-center gap-2">
                <User size={14} className="shrink-0 text-text-muted" />
                <span>{session.patient.displayName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="shrink-0 text-text-muted" />
              {session.scheduledStartAt ? (
                <span>{formatDatetime(session.scheduledStartAt, numLocale)}</span>
              ) : (
                <span className="text-text-muted">{t("detail.noSchedule")}</span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <CalendarClock size={14} className="mt-0.5 shrink-0 text-text-muted" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-muted">{t("detail.bookedAt")}</p>
                <p>{formatDatetime(session.createdAt, numLocale)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="shrink-0 text-text-muted" />
              <span>{commonT("card.duration", { n: session.durationMinutes })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video size={14} className="shrink-0 text-text-muted" />
              <span>{commonT("detail.mode.VIDEO")}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("detail.runtime.heading")}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {t(`detail.presentation.${session.presentationStatus}.note` as Parameters<typeof t>[0])}
            </p>
          </div>

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
                    ) : canJoinNow ? t("detail.runtime.actions.joinNow") : t("detail.runtime.actions.checkAccess")}
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
        <p className="text-sm font-medium text-text-primary dark:text-white/90">{presentationTitle}</p>
        <p className="mt-1 text-sm text-text-secondary">{presentationNote}</p>
        {session.status === "CANCELLED" && session.cancellationReason && (
          <p className="mt-1 text-xs text-text-muted">
            {t("detail.CANCELLED.reason", {
              reason: session.cancellationReason,
            })}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("detail.handlingNow.heading")}
        </h3>
        <p className="text-sm font-medium text-text-primary dark:text-white/90">{presentationTitle}</p>
        <p className="mt-1 text-sm text-text-secondary">{presentationNote}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-tertiary px-4 py-3 text-sm dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("detail.handlingNow.facts.sessionTime")}
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
              {session.scheduledStartAt
                ? formatDatetime(session.scheduledStartAt, numLocale)
                : t("detail.noSchedule")}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-tertiary px-4 py-3 text-sm dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("detail.handlingNow.facts.closeout")}
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
              {presentationCloseout}
            </p>
          </div>
        </div>

        {session.completedAt && (
          <p className="mt-4 text-sm text-text-secondary">
            {t("detail.handlingNow.completedAt", {
              datetime: formatDatetime(session.completedAt, numLocale),
            })}
          </p>
        )}
      </div>

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
          {(session.presentationStatus === "IN_PROGRESS" ||
            session.presentationStatus === "COMPLETED" ||
            session.presentationStatus === "ENDED") && (
            <p>{t("detail.liveFlow.notes.closeoutAfterSession")}</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("detail.chatCard.heading")}
        </h3>
        {canOpenSessionChat ? (
          <p className="text-sm text-text-secondary">{t("detail.chatCard.note")}</p>
        ) : (
          <p className="text-sm text-text-secondary">
            {t("detail.chatCard.disabledNote")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {canOpenSessionChat ? (
            <>
              <button
                type="button"
                onClick={() => dispatchOpenSessionChatInShell({ sessionId: session.id })}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover sm:w-auto"
              >
                {openInMessagesLabel}
              </button>
              <Link
                href={`/practitioner/sessions/${session.id}/chat` as never}
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

      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("detail.actions.heading")}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {t("detail.actions.note")}
          </p>
        </div>

        {recentAction === "complete" && !completeMutation.isError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-primary/15 bg-primary-light px-4 py-3 text-sm text-text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-white/90">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
            <p>{t("detail.actions.completeSuccess")}</p>
          </div>
        )}

        {recentAction === "no-show" && !noShowMutation.isError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-primary/15 bg-primary-light px-4 py-3 text-sm text-text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-white/90">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
            <p>{t("detail.actions.noShowSuccess")}</p>
          </div>
        )}

        {(completeMutation.isError || noShowMutation.isError) && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary dark:border-accent/25 dark:bg-accent/10 dark:text-white/90">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-accent" />
            <p>{t("detail.actions.error")}</p>
          </div>
        )}

        {canMarkCompleted || canMarkNoShow ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              {t("detail.actions.availability.available")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {canMarkCompleted && (
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirmingAction("complete");
                    setRecentAction(null);
                    noShowMutation.reset();
                  }}
                  disabled={isBusy}
                  className="w-full sm:w-auto"
                >
                  {t("detail.actions.complete")}
                </Button>
              )}
              {canMarkNoShow && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirmingAction("no-show");
                    setRecentAction(null);
                    completeMutation.reset();
                  }}
                  disabled={isBusy}
                  className="w-full sm:w-auto"
                >
                  {t("detail.actions.noShow")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-tertiary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
            {t("detail.actions.availability.notAvailable")}
          </div>
        )}
      </div>

      {!isActive && (
        <div className="pt-1">
          <Link
            href="/practitioner/sessions"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5 sm:w-auto"
          >
            {t("detail.backToSessions")}
          </Link>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmingAction === "complete"}
        onClose={() => {
          setConfirmingAction(null);
          completeMutation.reset();
        }}
        size="sm"
        title={t("detail.actions.completeConfirm.heading")}
        description={t("detail.actions.completeConfirm.note")}
        confirmLabel={
          completeMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("detail.actions.completePending")}
            </>
          ) : (
            t("detail.actions.completeConfirm.confirm")
          )
        }
        cancelLabel={t("detail.actions.completeConfirm.back")}
        onConfirm={handleMarkCompleted}
        loading={isBusy}
      >
        <div className="rounded-2xl border border-primary/15 bg-primary-light px-4 py-4 text-sm text-text-brand dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{session.patient?.displayName ?? "-"}</p>
              <p className="mt-1 text-xs opacity-80">
                {session.scheduledStartAt
                  ? formatDatetime(session.scheduledStartAt, numLocale)
                  : t("detail.noSchedule")}
              </p>
            </div>
          </div>
        </div>
      </ConfirmModal>

      <DestructiveConfirmModal
        isOpen={confirmingAction === "no-show"}
        onClose={() => {
          setConfirmingAction(null);
          noShowMutation.reset();
        }}
        size="sm"
        title={t("detail.actions.noShowConfirm.heading")}
        description={t("detail.actions.noShowConfirm.note")}
        confirmLabel={
          noShowMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("detail.actions.noShowPending")}
            </>
          ) : (
            t("detail.actions.noShowConfirm.confirm")
          )
        }
        cancelLabel={t("detail.actions.noShowConfirm.back")}
        onConfirm={handleMarkNoShow}
        loading={isBusy}
      >
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <div className="flex items-start gap-3">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{session.patient?.displayName ?? "-"}</p>
              <p className="mt-1 text-xs opacity-80">
                {session.scheduledStartAt
                  ? formatDatetime(session.scheduledStartAt, numLocale)
                  : t("detail.noSchedule")}
              </p>
            </div>
          </div>
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}
