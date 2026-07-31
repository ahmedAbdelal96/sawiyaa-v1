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
import { toAppError } from "@/lib/api/errors";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import {
  formatPractitionerOrViewerDateTime,
  formatTimeZoneLabel,
} from "@/lib/time-formatting";
import {
  useClosePractitionerSessionRuntime,
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
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import type {
  SessionJoinItem,
  SessionRuntimeItem,
  SessionPresentationStatus,
} from "../types/sessions.types";
import { formatMoney } from "@/lib/finance-format";

const COMPLETE_ALLOWED_PRESENTATION_STATUSES: SessionPresentationStatus[] = [
  "READY_TO_JOIN",
  "IN_PROGRESS",
];
const NO_SHOW_ALLOWED_PRESENTATION_STATUSES: SessionPresentationStatus[] = [
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
];

type Props = {
  sessionId: string;
};

type RoomCloseFeedback = "closed" | "alreadyClosed" | null;

function getRoomCloseErrorMessage(code: string | undefined, t: any) {
  switch (code) {
    case "SESSION_VIDEO_ROOM_CLOSE_ONLY_AFTER_START":
      return t("detail.roomClose.errors.onlyAfterStart");
    case "SESSION_VIDEO_ROOM_CLOSE_REASON_REQUIRED":
      return t("detail.roomClose.errors.reasonRequired");
    case "SESSION_VIDEO_ROOM_CLOSE_NOT_ALLOWED":
      return t("detail.roomClose.errors.notAllowed");
    case "SESSION_VIDEO_PROVIDER_ROOM_CLOSE_FAILED":
      return t("detail.roomClose.errors.providerFailed");
    default:
      return t("detail.roomClose.errors.generic");
  }
}

function getSafeTranslation(
  t: any,
  key: string,
  fallback: string,
) {
  return t.has?.(key) ? t(key) : fallback;
}

export default function PractitionerSessionDetailPanel({ sessionId }: Props) {
  const t = useTranslations("sessions.practitioner");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const profileQuery = usePractitionerProfile();

  const [confirmingAction, setConfirmingAction] = useState<
    "complete" | "no-show" | "close-room" | null
  >(null);
  const [recentAction, setRecentAction] = useState<"complete" | "no-show" | null>(null);
  const [joinResult, setJoinResult] = useState<SessionJoinItem | null>(null);
  const [prepareResult, setPrepareResult] = useState<SessionRuntimeItem | null>(null);
  const [roomCloseReason, setRoomCloseReason] = useState("");
  const [roomCloseFeedback, setRoomCloseFeedback] = useState<RoomCloseFeedback>(null);
  const [roomCloseError, setRoomCloseError] = useState<string | null>(null);

  const { data: session, isLoading, isError } = usePractitionerSession(sessionId);
  const completeMutation = useMarkPractitionerSessionCompleted();
  const noShowMutation = useMarkPractitionerSessionNoShow();
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const closeRoomMutation = useClosePractitionerSessionRuntime();
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? session?.timezone ?? null;
  const practitionerTimeZoneLabel = practitionerTimeZone
    ? formatTimeZoneLabel(practitionerTimeZone, { locale })
    : null;

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

  const isActive = ![
    "COMPLETED",
    "CANCELLED",
    "PATIENT_NO_SHOW",
    "PRACTITIONER_NO_SHOW",
    "BOTH_NO_SHOW",
    "EXPIRED",
  ].includes(session.status);
  const hasRuntimeAccess = hasSessionRuntimeAccess(session.status);
  const canMarkCompleted = COMPLETE_ALLOWED_PRESENTATION_STATUSES.includes(
    session.presentationStatus,
  );
  const canMarkNoShow = NO_SHOW_ALLOWED_PRESENTATION_STATUSES.includes(
    session.status,
  );
  const isBusy =
    completeMutation.isPending ||
    noShowMutation.isPending ||
    joinMutation.isPending ||
    closeRoomMutation.isPending;
  const now = Date.now();
  const scheduledStartTime = session.scheduledStartAt
    ? new Date(session.scheduledStartAt).getTime()
    : null;
  const scheduledEndTime = session.scheduledEndAt
    ? new Date(session.scheduledEndAt).getTime()
    : null;
  const hasSessionStarted = scheduledStartTime !== null && now >= scheduledStartTime;
  const isRoomClosed =
    roomCloseFeedback !== null ||
    joinResult?.blockedReason === "SESSION_ROOM_CLOSED" ||
    session.joinAvailability?.blockedReason === "SESSION_ROOM_CLOSED";
  const roomCloseRequiresReason =
    hasSessionStarted && scheduledEndTime !== null && now < scheduledEndTime;
  const canCloseRoom =
    hasRuntimeAccess &&
    hasSessionStarted &&
    !isRoomClosed &&
    session.status !== "CANCELLED" &&
    session.status !== "PATIENT_NO_SHOW" &&
    session.status !== "COMPLETED";
  const joinUrl = buildProviderLaunchUrl(joinResult);
  const runtimePrepared = getRuntimePreparedState({ prepareResult, joinResult });
  const runtimeProvider = getRuntimeProvider({ prepareResult, joinResult });
  const runtimeRoomName = getRuntimeRoomName({ prepareResult, joinResult });
  const runtimeProviderLabel = formatProviderDisplayName(runtimeProvider);
  const prepareAllowed =
    hasRuntimeAccess && !isRoomClosed && !runtimePrepared && canPrepareSessionRuntime(session, joinResult);
  const joinWindowOpen = isJoinWindowOpen(session, joinResult);
  const canJoinNow = joinResult?.canJoin ?? session.joinAvailability?.canJoin ?? false;
  const blockedJoinReason =
    joinResult?.blockedReason ?? session.joinAvailability?.blockedReason ?? null;
  const canOpenSessionChat = canOpenSessionChatFromPresentationStatus(
    session.status,
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
  const roomCloseActionLabel = getSafeTranslation(
    t,
    "detail.roomClose.action",
    locale.startsWith("ar") ? "إغلاق الجلسة" : "Close room",
  );
  const shouldShowJoinCheck =
    hasRuntimeAccess &&
    !isRoomClosed &&
    !(joinResult?.canJoin && canLaunchProviderRuntime(joinResult)) &&
    canJoinNow;
  const openInMessagesLabel = locale.startsWith("ar")
    ? "فتح داخل الرسائل"
    : "Open in messages";

  const liveFlowKey = !hasRuntimeAccess
    ? "unavailable"
    : isRoomClosed
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

  const openCloseRoomModal = () => {
    setRoomCloseError(null);
    closeRoomMutation.reset();
    setConfirmingAction("close-room");
    setRoomCloseReason("");
  };

  const handleCloseRoom = async () => {
    const reason = roomCloseRequiresReason ? roomCloseReason.trim() : undefined;

    if (roomCloseRequiresReason && !reason) {
      setRoomCloseError(t("detail.roomClose.errors.reasonRequired"));
      return;
    }

    try {
      const result = await closeRoomMutation.mutateAsync({
        sessionId: session.id,
        reason,
      });
      setConfirmingAction(null);
      setRoomCloseError(null);
      setRoomCloseFeedback(result.wasAlreadyClosed ? "alreadyClosed" : "closed");
      setRoomCloseReason("");
      setPrepareResult(null);
      setJoinResult({
        sessionId: session.id,
        status: session.status,
        provider: result.provider,
        canJoin: false,
        blockedReason: "SESSION_ROOM_CLOSED",
        availableAt: null,
        expiresAt: null,
        roomName: result.roomName,
        roomUrl: result.roomUrl,
        joinToken: null,
        providerRuntime: null,
      });
    } catch (error) {
      const appError = toAppError(error);
      setRoomCloseError(getRoomCloseErrorMessage(appError.code, t));
    }
  };

  return (
    <div className="space-y-6">

      {/* ═══ HERO SECTION ═══ */}
      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-medium text-text-secondary dark:bg-white/10">
              <SessionCodeReference sessionId={session.id} sessionCode={session.sessionCode} copyable />
            </span>
            <h2 className="mt-2 text-xl font-bold text-text-primary dark:text-white/95">
              {locale === "ar" ? "جلسة مع " : "Session with "}
              <span className="text-primary">{session.patient?.displayName ?? "—"}</span>
            </h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} className="text-text-muted" />
                {session.scheduledStartAt
                  ? formatPractitionerOrViewerDateTime(
                      session.scheduledStartAt,
                      practitionerTimeZone,
                      { locale: numLocale, fallbackText: "—" },
                    )
                  : t("detail.noSchedule")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={15} className="text-text-muted" />
                {session.durationMinutes} {locale === "ar" ? "دقيقة" : "mins"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Video size={15} className="text-text-muted" />
                {session.sessionMode === "VIDEO"
                  ? (locale === "ar" ? "فيديو" : "Video")
                  : session.sessionMode === "AUDIO"
                  ? (locale === "ar" ? "صوتي" : "Audio")
                  : (locale === "ar" ? "محادثة" : "Chat")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SessionStatusBadge
              status={session.status}
              presentationStatus={session.presentationStatus}
            />
            {/* Quick Action: Join Button */}
            {joinResult?.canJoin && joinUrl && (
              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 shadow-sm"
              >
                <ExternalLink size={14} />
                {t("detail.runtime.actions.openRoom")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TWO COLUMN LAYOUT ═══ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

        {/* ═══ LEFT COLUMN: SUMMARY, MEETING, CLINICAL, TIMELINE (65-70%) ═══ */}
        <div className="space-y-6">

          {/* Session Summary Card */}
          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white/90">
              {locale === "ar" ? "ملخص الجلسة" : "Session Summary"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl bg-surface-tertiary p-3 dark:bg-white/5">
                <span className="text-xs text-text-muted">{locale === "ar" ? "تاريخ الحجز" : "Booked At"}</span>
                <span className="text-sm font-medium text-text-primary dark:text-white/95">
                  {formatPractitionerOrViewerDateTime(
                    session.createdAt,
                    practitionerTimeZone,
                    { locale: numLocale, fallbackText: "—" },
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-surface-tertiary p-3 dark:bg-white/5">
                <span className="text-xs text-text-muted">{locale === "ar" ? "نوع التدفق" : "Flow Type"}</span>
                <span className="text-sm font-medium text-text-primary dark:text-white/95">
                  {session.flowType === "INSTANT"
                    ? (locale === "ar" ? "جلسة فورية" : "Instant Session")
                    : (locale === "ar" ? "جلسة مجدولة" : "Scheduled Session")}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-surface-tertiary p-3 dark:bg-white/5">
                <span className="text-xs text-text-muted">{locale === "ar" ? "المنطقة الزمنية" : "Timezone"}</span>
                <span className="text-sm font-medium text-text-primary dark:text-white/95">
                  {practitionerTimeZoneLabel ?? session.timezone ?? "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-surface-tertiary p-3 dark:bg-white/5">
                <span className="text-xs text-text-muted">{locale === "ar" ? "تاريخ الانتهاء المتوقع" : "Scheduled End"}</span>
                <span className="text-sm font-medium text-text-primary dark:text-white/95">
                  {session.scheduledEndAt
                    ? formatPractitionerOrViewerDateTime(
                        session.scheduledEndAt,
                        practitionerTimeZone,
                        { locale: numLocale, fallbackText: "—" },
                      )
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Meeting Access Card */}
          {hasRuntimeAccess && (
            <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white/90">
                {t("detail.liveFlow.heading")}
              </h3>
              
              <div className="mb-4 flex flex-wrap gap-4 items-center justify-between rounded-xl border border-border-light p-3 dark:border-white/10">
                <div>
                  <p className="text-xs text-text-muted">{locale === "ar" ? "حالة الغرفة" : "Room Status"}</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90 mt-0.5">
                    {t(`detail.liveFlow.phases.${liveFlowKey}.title` as Parameters<typeof t>[0])}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t(`detail.liveFlow.phases.${liveFlowKey}.note` as Parameters<typeof t>[0])}
                  </p>
                </div>
                {/* Providers info */}
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-xs text-text-muted">{t("detail.liveFlow.facts.provider")}</p>
                    <p className="text-xs font-medium text-text-primary dark:text-white/90">
                      {runtimeProviderLabel ?? t("detail.liveFlow.provider.NONE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">{t("detail.liveFlow.facts.room")}</p>
                    <p className="text-xs font-medium text-text-primary dark:text-white/90">
                      {runtimeRoomName ?? t("detail.liveFlow.facts.roomPending")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status messages + actions */}
              <div className="space-y-3">
                {joinResult?.canJoin && joinUrl && (
                  <div className="rounded-xl border border-primary/15 bg-primary-light px-4 py-3 text-sm dark:border-primary/20 dark:bg-primary/10">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <p className="text-text-primary dark:text-white/90">
                        {t("detail.runtime.ready")}
                      </p>
                    </div>
                  </div>
                )}
                {prepareResult?.isPrepared && !joinResult?.canJoin && (
                  <div className="rounded-xl border border-primary/15 bg-primary-light px-4 py-3 text-sm dark:border-primary/20 dark:bg-primary/10">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <p className="text-text-primary dark:text-white/90">
                        {t("detail.runtime.prepared")}
                      </p>
                    </div>
                  </div>
                )}
                {blockedJoinReason && !canJoinNow && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
                      {t(`detail.runtime.blocked.${getRuntimeBlockedReasonKey(blockedJoinReason)}` as Parameters<typeof t>[0])}
                    </div>
                    {blockedJoinReason === "SESSION_ROOM_CLOSED" && (
                      <div className="rounded-xl border border-primary/15 bg-primary-light px-4 py-3 text-sm dark:border-primary/20 dark:bg-primary/10">
                        <p className="font-semibold text-text-primary dark:text-white/90">
                          {roomCloseSupportHeading}
                        </p>
                        <p className="mt-1 text-text-secondary">{roomCloseSupportNote}</p>
                      </div>
                    )}
                  </div>
                )}
                {roomCloseFeedback && (
                  <div className="rounded-xl border border-primary/15 bg-primary-light px-4 py-3 text-sm dark:border-primary/20 dark:bg-primary/10">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <p className="text-text-primary dark:text-white/90">
                        {roomCloseFeedback === "alreadyClosed"
                          ? t("detail.roomClose.alreadyClosed")
                          : t("detail.roomClose.success")}
                      </p>
                    </div>
                  </div>
                )}
                {prepareMutation.isError && (
                  <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary dark:border-accent/25 dark:text-white/90">
                    {t("detail.runtime.prepareError")}
                  </div>
                )}
                {joinMutation.isError && (
                  <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary dark:border-accent/25 dark:text-white/90">
                    {t("detail.runtime.error")}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  {prepareAllowed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrepareRuntime}
                      disabled={prepareMutation.isPending}
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
                    >
                      {joinMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {t("detail.runtime.actions.checking")}
                        </>
                      ) : canJoinNow
                        ? t("detail.runtime.actions.joinNow")
                        : t("detail.runtime.actions.checkAccess")}
                    </Button>
                  )}
                  {canCloseRoom && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={openCloseRoomModal}
                      disabled={closeRoomMutation.isPending}
                    >
                      {roomCloseActionLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Internal Notes Card */}
          {session.notesInternal && (
            <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-text-primary dark:text-white/90">
                {locale === "ar" ? "ملاحظات إدارية داخلية" : "Internal Admin Notes"}
              </h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed bg-surface-tertiary p-4 rounded-xl dark:bg-white/5">
                {session.notesInternal}
              </p>
            </div>
          )}

          {/* Timeline Card */}
          {session.timeline && session.timeline.length > 0 && (
            <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white/90">
                {locale === "ar" ? "سجل الأحداث والجدول الزمني" : "Event Timeline & History"}
              </h3>
              <div className="relative border-l border-border-light pl-4 dark:border-white/10 space-y-5 ml-2 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4 rtl:mr-2">
                {session.timeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle marker */}
                    <div className="absolute -left-[21px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-surface-primary dark:bg-slate-900 rtl:-left-0 rtl:-right-[21px]" />
                    <div>
                      <span className="text-[11px] font-mono text-text-muted">
                        {formatPractitionerOrViewerDateTime(
                          event.occurredAt,
                          practitionerTimeZone,
                          { locale: numLocale, fallbackText: "—" },
                        )}
                      </span>
                      <p className="text-sm font-semibold text-text-primary dark:text-white/90 mt-0.5">
                        {locale === "ar" ? formatEventTypeAr(event.eventType) : formatEventTypeEn(event.eventType)}
                      </p>
                      {event.reason && (
                        <p className="text-xs text-text-secondary mt-1 bg-surface-tertiary px-2 py-1 rounded inline-block dark:bg-white/5">
                          {locale === "ar" ? "السبب: " : "Reason: "}{event.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ═══ RIGHT COLUMN: PATIENT, BILLING, MESSAGING, ACTIONS (30-35%) ═══ */}
        <div className="space-y-6">

          {/* Patient Card */}
          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white/90">
              {locale === "ar" ? "بيانات المريض" : "Patient Profile"}
            </h3>
            <div className="flex items-center gap-3.5 pb-4 border-b border-border-light dark:border-white/10">
              {/* Initial Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {session.patient?.displayName?.charAt(0).toUpperCase() ?? "P"}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-text-primary dark:text-white/95 truncate">
                  {session.patient?.displayName ?? "—"}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  ID: {session.patient?.id.substring(0, 8)}...
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-sm">
              {session.patientDetails?.gender && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-text-secondary text-xs">{locale === "ar" ? "الجنس" : "Gender"}</span>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {session.patientDetails.gender === "MALE"
                      ? (locale === "ar" ? "ذكر" : "Male")
                      : session.patientDetails.gender === "FEMALE"
                      ? (locale === "ar" ? "أنثى" : "Female")
                      : session.patientDetails.gender}
                  </span>
                </div>
              )}
              {session.patientDetails?.dateOfBirth && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-text-secondary text-xs">{locale === "ar" ? "العمر" : "Age"}</span>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {calculateAge(session.patientDetails.dateOfBirth)} {locale === "ar" ? "سنة" : "years"}
                  </span>
                </div>
              )}
              {session.patientDetails?.preferredLanguage && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-text-secondary text-xs">{locale === "ar" ? "اللغة المفضلة" : "Preferred Language"}</span>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {session.patientDetails.preferredLanguage === "ar"
                      ? "العربية"
                      : "English"}
                  </span>
                </div>
              )}
              {session.patientDetails?.country && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-text-secondary text-xs">{locale === "ar" ? "الدولة" : "Country"}</span>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {locale === "ar" && session.patientDetails.country.nativeName
                      ? session.patientDetails.country.nativeName
                      : session.patientDetails.country.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Booking & Payment Card */}
          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-text-primary dark:text-white/90">
              {locale === "ar" ? "الحجز والمالية" : "Booking & Payment"}
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-border-light/75 dark:border-white/5">
                <span className="text-text-secondary text-xs">{locale === "ar" ? "نوع التغطية" : "Coverage Type"}</span>
                <span className="font-medium text-text-primary dark:text-white/90">
                  {session.paymentCoverageType === "PACKAGE"
                    ? (locale === "ar" ? "باقة علاجية" : "Package")
                    : session.paymentCoverageType === "CORPORATE_SPONSORSHIP"
                    ? (locale === "ar" ? "رعاية شركات" : "Corporate Sponsorship")
                    : (locale === "ar" ? "دفع مباشر" : "Direct Payment")}
                </span>
              </div>

              {/* Package Details */}
              {session.paymentCoverageType === "PACKAGE" && session.packagePurchase && (
                <div className="rounded-xl bg-surface-tertiary p-3 dark:bg-white/5 space-y-2">
                  <p className="text-xs font-semibold text-text-primary dark:text-white/90">
                    {locale === "ar" ? "بيانات الباقة:" : "Package Details:"}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{locale === "ar" ? "اسم الباقة" : "Plan"}</span>
                    <span className="font-medium text-text-primary dark:text-white/90">{session.packagePurchase.packagePlan.title}</span>
                  </div>
                </div>
              )}

              {/* Corporate Sponsorship Details */}
              {session.paymentCoverageType === "CORPORATE_SPONSORSHIP" && session.corporateSponsorshipDetails && (
                <div className="rounded-xl bg-surface-tertiary p-3 dark:bg-white/5 space-y-2">
                  <p className="text-xs font-semibold text-text-primary dark:text-white/90">
                    {locale === "ar" ? "بيانات الرعاية:" : "Sponsorship Details:"}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{locale === "ar" ? "الشركة الراعية" : "Organization"}</span>
                    <span className="font-medium text-text-primary dark:text-white/90">{session.corporateSponsorshipDetails.organizationName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{locale === "ar" ? "خطة المنافع" : "Benefit Plan"}</span>
                    <span className="font-medium text-text-primary dark:text-white/90">{session.corporateSponsorshipDetails.benefitPlanName}</span>
                  </div>
                </div>
              )}

              {/* Billing and Amount */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-text-secondary text-xs">{locale === "ar" ? "حالة الدفع" : "Payment Status"}</span>
                <span className="font-semibold text-text-primary dark:text-white/90">
                  {session.paymentDetails
                    ? (locale === "ar" ? formatPaymentStatusAr(session.paymentDetails.status) : session.paymentDetails.status)
                    : (session.paymentCoverageType === "PACKAGE"
                        ? (locale === "ar" ? "مغطى بالباقة" : "Package Covered")
                        : (session.paymentCoverageType === "CORPORATE_SPONSORSHIP"
                            ? (locale === "ar" ? "مغطى بالرعاية" : "Sponsor Covered")
                            : (locale === "ar" ? "لم يتم الدفع" : "Unpaid")))}
                </span>
              </div>

              {session.paymentDetails && (
                <div className="flex justify-between items-center pt-1">
                  <span className="text-text-secondary text-xs">{locale === "ar" ? "المبلغ الإجمالي" : "Total Amount"}</span>
                  <span className="text-base font-bold text-primary dark:text-primary-light">
                    {formatMoney(locale, session.paymentDetails.amountTotal, session.paymentDetails.currencyCode)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Messaging Card */}
          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-text-primary dark:text-white/90">
              {t("detail.chatCard.heading")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {canOpenSessionChat
                ? t("detail.chatCard.note")
                : t("detail.chatCard.disabledNote")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canOpenSessionChat ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      dispatchOpenSessionChatInShell({ sessionId: session.id })
                    }
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary/95 shadow-sm"
                  >
                    {openInMessagesLabel}
                  </button>
                  <Link
                    href={`/practitioner/sessions/${session.id}/chat` as never}
                    className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:text-white/90 dark:hover:text-primary-light"
                  >
                    {t("detail.chatCard.open")}
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-medium text-text-muted opacity-60"
                >
                  {t("detail.chatCard.open")}
                </button>
              )}
            </div>
          </div>

          {/* Session Closeout Actions Card */}
          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-text-primary dark:text-white/90">
              {t("detail.actions.heading")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              {t("detail.actions.note")}
            </p>

            {recentAction === "complete" && !completeMutation.isError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/15 bg-primary-light px-3 py-2 text-xs">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-text-primary dark:text-white/90">
                  {t("detail.actions.completeSuccess")}
                </p>
              </div>
            )}
            {recentAction === "no-show" && !noShowMutation.isError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/15 bg-primary-light px-3 py-2 text-xs">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-text-primary dark:text-white/90">
                  {t("detail.actions.noShowSuccess")}
                </p>
              </div>
            )}
            {(completeMutation.isError || noShowMutation.isError) && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-text-primary dark:text-white/90">
                  {t("detail.actions.error")}
                </p>
              </div>
            )}

            {canMarkCompleted || canMarkNoShow ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2.5">
                  {canMarkCompleted && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setConfirmingAction("complete");
                        setRecentAction(null);
                        noShowMutation.reset();
                      }}
                      disabled={isBusy}
                    >
                      {t("detail.actions.complete")}
                    </Button>
                  )}
                  {canMarkNoShow && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setConfirmingAction("no-show");
                        setRecentAction(null);
                        completeMutation.reset();
                      }}
                      disabled={isBusy}
                    >
                      {t("detail.actions.noShow")}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-surface-tertiary px-3.5 py-2.5 text-xs text-text-secondary dark:bg-white/5">
                {t("detail.actions.availability.notAvailable")}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Back to sessions — inactive sessions only */}
      {!isActive && (
        <div className="pt-1">
          <Link
            href="/practitioner/sessions"
            className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
          >
            {t("detail.backToSessions")}
          </Link>
        </div>
      )}

      {/* ═══ MODALS ═══ */}
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
        <div className="rounded-xl border border-primary/15 bg-primary-light px-4 py-4 text-sm text-text-brand dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{session.patient?.displayName ?? "-"}</p>
              <p className="mt-1 text-xs opacity-80">
                {session.scheduledStartAt
                  ? formatPractitionerOrViewerDateTime(
                      session.scheduledStartAt,
                      practitionerTimeZone,
                      { locale: numLocale, fallbackText: "—" },
                    )
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
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <div className="flex items-start gap-3">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{session.patient?.displayName ?? "-"}</p>
              <p className="mt-1 text-xs opacity-80">
                {session.scheduledStartAt
                  ? formatPractitionerOrViewerDateTime(
                      session.scheduledStartAt,
                      practitionerTimeZone,
                      { locale: numLocale, fallbackText: "—" },
                    )
                  : t("detail.noSchedule")}
              </p>
            </div>
          </div>
        </div>
      </DestructiveConfirmModal>

      <DestructiveConfirmModal
        isOpen={confirmingAction === "close-room"}
        onClose={() => {
          setConfirmingAction(null);
          closeRoomMutation.reset();
          setRoomCloseError(null);
        }}
        size="sm"
        title={
          roomCloseRequiresReason
            ? t("detail.roomClose.modal.beforeTitle")
            : t("detail.roomClose.modal.afterTitle")
        }
        description={
          roomCloseRequiresReason
            ? t("detail.roomClose.modal.beforeNote")
            : t("detail.roomClose.modal.afterNote")
        }
        confirmLabel={
          closeRoomMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("detail.roomClose.closing")}
            </>
          ) : (
            roomCloseActionLabel
          )
        }
        cancelLabel={t("detail.roomClose.cancel")}
        onConfirm={handleCloseRoom}
        loading={closeRoomMutation.isPending}
        confirmDisabled={roomCloseRequiresReason && roomCloseReason.trim().length === 0}
      >
        <div className="space-y-4">
          {roomCloseRequiresReason ? (
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white/90">
                {t("detail.roomClose.reasonLabel")}
              </label>
              <input
                type="text"
                value={roomCloseReason}
                onChange={(event) => setRoomCloseReason(event.target.value)}
                maxLength={200}
                placeholder={t("detail.roomClose.reasonPlaceholder")}
                className="app-control mt-2 w-full px-3 py-2.5"
              />
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                {t("detail.roomClose.reasonHelp")}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
              {t("detail.roomClose.afterEndHelper")}
            </div>
          )}

          {roomCloseError ? (
            <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-500/20 dark:bg-danger-500/10 dark:text-danger-200">
              {roomCloseError}
            </div>
          ) : null}
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}

function calculateAge(dateOfBirthString: string | null) {
  if (!dateOfBirthString) return null;
  const birthDate = new Date(dateOfBirthString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatEventTypeAr(eventType: string) {
  switch (eventType) {
    case "SESSION_CREATED": return "تم إنشاء الجلسة";
    case "PAYMENT_PENDING": return "بانتظار الدفع";
    case "PAYMENT_CONFIRMED": return "تم تأكيد الدفع بنجاح";
    case "PRACTITIONER_ACCEPTED": return "تم قبول الجلسة من المختص";
    case "PRACTITIONER_REJECTED": return "تم رفض الجلسة من المختص";
    case "SESSION_CONFIRMED": return "تم تأكيد موعد الجلسة";
    case "SESSION_READY_TO_JOIN": return "الجلسة جاهزة للانضمام الآن";
    case "PATIENT_JOINED": return "انضم المريض للغرفة";
    case "PRACTITIONER_JOINED": return "انضم المختص للغرفة";
    case "SESSION_STARTED": return "بدأت الجلسة الفعلية";
    case "SESSION_AWAITING_COMPLETION_CONFIRMATION": return "بانتظار تأكيد إتمام الجلسة";
    case "SESSION_COMPLETED": return "اكتملت الجلسة بنجاح";
    case "CANCELLED_BY_PATIENT": return "تم إلغاء الجلسة من قبل المريض";
    case "CANCELLED_BY_PRACTITIONER": return "تم إلغاء الجلسة من قبل المختص";
    case "EXPIRED_UNPAID": return "انتهت الجلسة لعدم إتمام الدفع";
    case "NO_SHOW_PATIENT": return "لم يحضر المريض";
    case "NO_SHOW_PRACTITIONER": return "لم يحضر المختص";
    case "PROVIDER_ROOM_CREATED": return "تم تجهيز غرفة البث المباشر";
    case "PROVIDER_ROOM_ENDED": return "تم إغلاق غرفة البث المباشر";
    default: return eventType;
  }
}

function formatEventTypeEn(eventType: string) {
  switch (eventType) {
    case "SESSION_CREATED": return "Session Created";
    case "PAYMENT_PENDING": return "Payment Pending";
    case "PAYMENT_CONFIRMED": return "Payment Confirmed";
    case "PRACTITIONER_ACCEPTED": return "Session Accepted by Practitioner";
    case "PRACTITIONER_REJECTED": return "Session Rejected by Practitioner";
    case "SESSION_CONFIRMED": return "Session Confirmed";
    case "SESSION_READY_TO_JOIN": return "Session Ready to Join";
    case "PATIENT_JOINED": return "Patient Joined Room";
    case "PRACTITIONER_JOINED": return "Practitioner Joined Room";
    case "SESSION_STARTED": return "Session Started";
    case "SESSION_AWAITING_COMPLETION_CONFIRMATION": return "Awaiting Completion Confirmation";
    case "SESSION_COMPLETED": return "Session Completed";
    case "CANCELLED_BY_PATIENT": return "Cancelled by Patient";
    case "CANCELLED_BY_PRACTITIONER": return "Cancelled by Practitioner";
    case "EXPIRED_UNPAID": return "Expired Unpaid";
    case "NO_SHOW_PATIENT": return "Patient No-Show";
    case "NO_SHOW_PRACTITIONER": return "Practitioner No-Show";
    case "PROVIDER_ROOM_CREATED": return "Live Room Created";
    case "PROVIDER_ROOM_ENDED": return "Live Room Closed";
    default: return eventType;
  }
}

function formatPaymentStatusAr(status: string) {
  switch (status) {
    case "CREATED": return "تم الإنشاء";
    case "CAPTURED": return "مقبول ومؤكد";
    case "FAILED": return "فشل الدفع";
    case "CANCELLED": return "ملغي";
    case "REFUNDED": return "مسترجع";
    default: return status;
  }
}
