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
import {
  ListStateSkeleton,
  StateCard,
} from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { toAppError } from "@/lib/api/errors";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import {
  formatPractitionerOrViewerDateTime,
  formatTimeZoneLabel,
} from "@/lib/time-formatting";
import {
  useClosePractitionerSessionRuntime,
  useMarkPractitionerSessionNoShow,
  usePreparePractitionerSessionRuntime,
  usePractitionerSession,
  useResolvePractitionerSessionJoinContract,
} from "../hooks/use-sessions";
import {
  buildProviderLaunchUrl,
  canLaunchProviderRuntime,
  getRuntimeBlockedReasonKey,
  getRuntimePreparedState,
  getRuntimeProvider,
  getRuntimeRoomName,
  formatProviderDisplayName,
} from "../lib/session-runtime";
import { dispatchOpenSessionChatInShell } from "@/features/messages-shell/lib/messages-shell-events";
import SessionStatusBadge from "./SessionStatusBadge";
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import type {
  SessionJoinItem,
  SessionRuntimeItem,
} from "../types/sessions.types";
import { formatMoney } from "@/lib/finance-format";

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

export default function PractitionerSessionDetailPanel({ sessionId }: Props) {
  const t = useTranslations("sessions.practitioner");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const profileQuery = usePractitionerProfile();

  const [confirmingAction, setConfirmingAction] = useState<
    "no-show" | "close-room" | null
  >(null);
  const [recentAction, setRecentAction] = useState<
    "no-show" | null
  >(null);
  const [joinResult, setJoinResult] = useState<SessionJoinItem | null>(null);
  const [prepareResult, setPrepareResult] = useState<SessionRuntimeItem | null>(
    null,
  );
  const [roomCloseReason, setRoomCloseReason] = useState("");
  const [roomCloseFeedback, setRoomCloseFeedback] =
    useState<RoomCloseFeedback>(null);
  const [roomCloseError, setRoomCloseError] = useState<string | null>(null);

  const {
    data: session,
    isLoading,
    isError,
  } = usePractitionerSession(sessionId);
  const noShowMutation = useMarkPractitionerSessionNoShow();
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const closeRoomMutation = useClosePractitionerSessionRuntime();
  const practitionerTimeZone =
    profileQuery.data?.profile.timezone ?? session?.timezone ?? null;
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
              className="border-border-light text-text-secondary hover:bg-surface-tertiary inline-flex items-center justify-center rounded-2xl border px-5 py-2 text-sm dark:hover:bg-white/5"
            >
              {t("detail.backToSessions")}
            </Link>
          ),
        }}
      />
    );
  }

  // Detail responses always carry this backend-owned interpretation.  If a
  // stale cache lacks it, fail closed rather than reconstructing lifecycle
  // meaning from raw status or timestamps.
  const operational = session.operational;
  const operationalState = operational?.state ?? null;
  const hasRuntimeAccess = Boolean(
    operational?.actions.canPrepareRuntime || operational?.actions.canJoin,
  );
  const canMarkNoShow = operational?.actions.canMarkPatientNoShow === true;
  const isActive = hasRuntimeAccess || canMarkNoShow;
  const isBusy =
    noShowMutation.isPending ||
    joinMutation.isPending ||
    closeRoomMutation.isPending;
  const isRoomClosed =
    roomCloseFeedback !== null ||
    operational?.room.state === "CLOSED";
  // Room-close authorization and reason requirements are enforced by the
  // command. The read contract deliberately has no duplicate canCloseRoom
  // policy, so this is only an affordance for an open video room.
  const roomCloseRequiresReason = false;
  const canCloseRoom =
    session.sessionMode === "VIDEO" && operational?.room.state === "OPEN" && !isRoomClosed;
  const joinUrl = buildProviderLaunchUrl(joinResult);
  const runtimePrepared = getRuntimePreparedState({
    prepareResult,
    joinResult,
  });
  const runtimeProvider = getRuntimeProvider({ prepareResult, joinResult });
  const runtimeRoomName = getRuntimeRoomName({ prepareResult, joinResult });
  const runtimeProviderLabel = formatProviderDisplayName(runtimeProvider);
  const prepareAllowed =
    hasRuntimeAccess &&
    !isRoomClosed &&
    !runtimePrepared &&
    operational?.join.canPrepareRuntime === true;
  const joinWindowOpen = operational?.join.allowed === true;
  const canJoinNow =
    joinResult?.canJoin ?? operational?.join.allowed ?? false;
  const blockedJoinReason =
    joinResult?.blockedReason ??
    operational?.join.reasonCode ??
    null;
  const canOpenSessionChat = session.sessionChat?.available === true;
  const presentationTitle = t(
    `detail.presentation.${operationalState}.title` as Parameters<
      typeof t
    >[0],
  );
  const presentationNote = t(
    `detail.presentation.${operationalState}.note` as Parameters<
      typeof t
    >[0],
  );
  const presentationCloseout = t(
    `detail.presentation.${operationalState}.closeout` as Parameters<
      typeof t
    >[0],
  );
  const roomCloseSupportHeading = t("detail.roomClose.support.heading");
  const roomCloseSupportNote = t("detail.roomClose.support.note");
  const roomCloseActionLabel = t("detail.roomClose.action");
  const shouldShowJoinCheck =
    hasRuntimeAccess &&
    !isRoomClosed &&
    !(joinResult?.canJoin && canLaunchProviderRuntime(joinResult)) &&
    canJoinNow;
  const openInMessagesLabel = t("detail.ui.openMessages");

  const liveFlowKey = !hasRuntimeAccess
    ? "unavailable"
    : isRoomClosed
      ? "unavailable"
      : operationalState === "IN_PROGRESS"
        ? "liveNow"
        : joinResult?.canJoin && canLaunchProviderRuntime(joinResult)
          ? "readyToJoin"
          : runtimePrepared
            ? "preparedWaiting"
            : prepareAllowed
              ? "readyToPrepare"
              : "awaitingWindow";

  const handleMarkNoShow = async () => {
    try {
      await noShowMutation.mutateAsync(session.id);
      setConfirmingAction(null);
      setRecentAction("no-show");
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
      setRoomCloseFeedback(
        result.wasAlreadyClosed ? "alreadyClosed" : "closed",
      );
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
      {/* ??? HERO SECTION ??? */}
      <div className="border-border-light bg-surface-primary rounded-2xl border p-5 shadow-sm dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="bg-surface-tertiary text-text-secondary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium dark:bg-white/10">
              <SessionCodeReference
                sessionId={session.id}
                sessionCode={session.sessionCode}
                copyable
              />
            </span>
            <h2 className="text-text-primary mt-2 text-xl font-bold dark:text-white/95">
              {t("detail.ui.sessionWith", { name: session.patient?.displayName ?? "—" })}
            </h2>
            <div className="text-text-secondary mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} className="text-text-muted" />
                {session.scheduledStartAt
                  ? formatPractitionerOrViewerDateTime(
                      session.scheduledStartAt,
                      practitionerTimeZone,
                    )
                  : t("detail.noSchedule")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={15} className="text-text-muted" />
                {t("detail.ui.minutes", { count: session.durationMinutes })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Video size={15} className="text-text-muted" />
                {session.sessionMode === "VIDEO"
                  ? t("detail.ui.video")
                  : session.sessionMode === "AUDIO"
                    ? t("detail.ui.audio")
                    : t("detail.ui.chatMode")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SessionStatusBadge
              status={session.status}
              operational={session.operational}
            />
            {/* Quick Action: Join Button */}
            {joinResult?.canJoin && joinUrl && (
              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition"
              >
                <ExternalLink size={14} />
                {t("detail.runtime.actions.openRoom")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ??? TWO COLUMN LAYOUT ??? */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ??? LEFT COLUMN: SUMMARY, MEETING, CLINICAL, TIMELINE (65-70%) ??? */}
        <div className="space-y-6">
          {/* Session Summary Card */}
          <div className="border-border-light bg-surface-primary rounded-2xl border p-5 shadow-sm dark:bg-white/5">
            <h3 className="text-text-primary mb-4 text-base font-semibold dark:text-white/90">
              {t("detail.currentStateHeading")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-surface-tertiary flex flex-col gap-1 rounded-xl p-3 dark:bg-white/5">
                <span className="text-text-muted text-xs">
                  {t("detail.bookedAt")}
                </span>
                <span className="text-text-primary text-sm font-medium dark:text-white/95">
                  {formatPractitionerOrViewerDateTime(
                    session.createdAt,
                    practitionerTimeZone,
                  )}
                </span>
              </div>
              <div className="bg-surface-tertiary flex flex-col gap-1 rounded-xl p-3 dark:bg-white/5">
                <span className="text-text-muted text-xs">
                  {t("detail.ui.flowType")}
                </span>
                <span className="text-text-primary text-sm font-medium dark:text-white/95">
                    {session.flowType === "INSTANT"
                      ? t("detail.ui.instantSession")
                      : t("detail.ui.scheduledSession")}
                </span>
              </div>
              <div className="bg-surface-tertiary flex flex-col gap-1 rounded-xl p-3 dark:bg-white/5">
                <span className="text-text-muted text-xs">
                  {t("detail.summary.timezoneLabel")}
                </span>
                <span className="text-text-primary text-sm font-medium dark:text-white/95">
                  {practitionerTimeZoneLabel ?? session.timezone ?? "�"}
                </span>
              </div>
              <div className="bg-surface-tertiary flex flex-col gap-1 rounded-xl p-3 dark:bg-white/5">
                <span className="text-text-muted text-xs">
                  {t("detail.ui.expectedEnd")}
                </span>
                <span className="text-text-primary text-sm font-medium dark:text-white/95">
                  {session.scheduledEndAt
                    ? formatPractitionerOrViewerDateTime(
                        session.scheduledEndAt,
                        practitionerTimeZone,
                      )
                    : "�"}
                </span>
              </div>
            </div>
          </div>

          {/* Meeting Access Card */}
          {hasRuntimeAccess && (
            <div className="border-border-light bg-surface-primary rounded-2xl border p-5 shadow-sm dark:bg-white/5">
              <h3 className="text-text-primary mb-4 text-base font-semibold dark:text-white/90">
                {t("detail.liveFlow.heading")}
              </h3>

              <div className="border-border-light mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3 dark:border-white/10">
                <div>
                  <p className="text-text-muted text-xs">
                    {t("detail.ui.roomStatus")}
                  </p>
                  <p className="text-text-primary mt-0.5 text-sm font-semibold dark:text-white/90">
                    {t(
                      `detail.liveFlow.phases.${liveFlowKey}.title` as Parameters<
                        typeof t
                      >[0],
                    )}
                  </p>
                  <p className="text-text-secondary mt-0.5 text-xs">
                    {t(
                      `detail.liveFlow.phases.${liveFlowKey}.note` as Parameters<
                        typeof t
                      >[0],
                    )}
                  </p>
                </div>
                {/* Providers info */}
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-text-muted text-xs">
                      {t("detail.liveFlow.facts.provider")}
                    </p>
                    <p className="text-text-primary text-xs font-medium dark:text-white/90">
                      {runtimeProviderLabel ??
                        t("detail.liveFlow.provider.NONE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-muted text-xs">
                      {t("detail.liveFlow.facts.room")}
                    </p>
                    <p className="text-text-primary text-xs font-medium dark:text-white/90">
                      {runtimeRoomName ??
                        t("detail.liveFlow.facts.roomPending")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status messages + actions */}
              <div className="space-y-3">
                {joinResult?.canJoin && joinUrl && (
                  <div className="border-primary/15 bg-primary-light dark:border-primary/20 dark:bg-primary/10 rounded-xl border px-4 py-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      <p className="text-text-primary dark:text-white/90">
                        {t("detail.runtime.ready")}
                      </p>
                    </div>
                  </div>
                )}
                {prepareResult?.isPrepared && !joinResult?.canJoin && (
                  <div className="border-primary/15 bg-primary-light dark:border-primary/20 dark:bg-primary/10 rounded-xl border px-4 py-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      <p className="text-text-primary dark:text-white/90">
                        {t("detail.runtime.prepared")}
                      </p>
                    </div>
                  </div>
                )}
                {blockedJoinReason && !canJoinNow && (
                  <div className="space-y-3">
                    <div className="border-border-light bg-surface-tertiary text-text-secondary rounded-xl border px-4 py-3 text-sm dark:bg-white/5">
                      {t(
                        `detail.runtime.blocked.${getRuntimeBlockedReasonKey(blockedJoinReason)}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </div>
                    {blockedJoinReason === "SESSION_ROOM_CLOSED" && (
                      <div className="border-primary/15 bg-primary-light dark:border-primary/20 dark:bg-primary/10 rounded-xl border px-4 py-3 text-sm">
                        <p className="text-text-primary font-semibold dark:text-white/90">
                          {roomCloseSupportHeading}
                        </p>
                        <p className="text-text-secondary mt-1">
                          {roomCloseSupportNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {roomCloseFeedback && (
                  <div className="border-primary/15 bg-primary-light dark:border-primary/20 dark:bg-primary/10 rounded-xl border px-4 py-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      <p className="text-text-primary dark:text-white/90">
                        {roomCloseFeedback === "alreadyClosed"
                          ? t("detail.roomClose.alreadyClosed")
                          : t("detail.roomClose.success")}
                      </p>
                    </div>
                  </div>
                )}
                {prepareMutation.isError && (
                  <div className="border-accent/20 bg-accent/10 text-text-primary dark:border-accent/25 rounded-xl border px-4 py-3 text-sm dark:text-white/90">
                    {t("detail.runtime.prepareError")}
                  </div>
                )}
                {joinMutation.isError && (
                  <div className="border-accent/20 bg-accent/10 text-text-primary dark:border-accent/25 rounded-xl border px-4 py-3 text-sm dark:text-white/90">
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
                      ) : canJoinNow ? (
                        t("detail.runtime.actions.joinNow")
                      ) : (
                        t("detail.runtime.actions.checkAccess")
                      )}
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
            <div className="border-border-light bg-surface-primary rounded-2xl border p-5 shadow-sm dark:bg-white/5">
              <h3 className="text-text-primary mb-3 text-base font-semibold dark:text-white/90">
                {t("detail.ui.internalNotes")}
              </h3>
              <p className="text-text-secondary bg-surface-tertiary rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap dark:bg-white/5">
                {session.notesInternal}
              </p>
            </div>
          )}

          {/* Timeline Card */}
          {session.timeline && session.timeline.length > 0 && (
            <div className="border-border-light bg-surface-primary rounded-2xl border p-5 shadow-sm dark:bg-white/5">
              <h3 className="text-text-primary mb-4 text-base font-semibold dark:text-white/90">
                {t("detail.ui.timeline")}
              </h3>
              <div className="border-border-light relative ml-2 space-y-5 border-l pl-4 rtl:mr-2 rtl:border-r rtl:border-l-0 rtl:pr-4 rtl:pl-0 dark:border-white/10">
                {session.timeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle marker */}
                    <div className="border-primary bg-surface-primary absolute -left-[21px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 rtl:-right-[21px] rtl:-left-0 dark:bg-slate-900" />
                    <div>
                      <span className="text-text-muted font-mono text-[11px]">
                        {formatPractitionerOrViewerDateTime(
                          event.occurredAt,
                          practitionerTimeZone,
                        )}
                      </span>
                      <p className="text-text-primary mt-0.5 text-sm font-semibold dark:text-white/90">
                        {formatEventType(event.eventType, t)}
                      </p>
                      {formatCleanReason(event.reason) && (
                        <p className="text-text-secondary bg-surface-tertiary mt-1 inline-block rounded px-2 py-1 text-xs dark:bg-white/5">
                          {t("detail.ui.reason")} {" "}
                          {formatCleanReason(event.reason)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ??? RIGHT COLUMN: UNIFIED SIDEBAR (COMPACT) ??? */}
        <div className="space-y-4">
          <div className="border-border-light bg-surface-primary rounded-2xl border p-4 shadow-sm space-y-4 divide-y divide-border-light/60 dark:bg-white/5 dark:divide-white/10">
            {/* 1. Patient Profile */}
            <div>
              <h3 className="text-text-primary mb-3 text-sm font-bold dark:text-white/90">
                {t("detail.ui.patientProfile")}
              </h3>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold">
                  {session.patient?.displayName?.charAt(0).toUpperCase() ?? "P"}
                </div>
                <div className="min-w-0">
                  <p className="text-text-primary truncate text-sm font-bold dark:text-white/95">
                    {session.patient?.displayName ?? "�"}
                  </p>
                  <p className="text-text-muted text-[11px]">
                    ID: {session.patient?.id.substring(0, 8)}...
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {session.patientDetails?.gender && (
                  <div className="bg-surface-tertiary rounded-lg p-2 dark:bg-white/5">
                    <span className="text-text-muted block text-[10px]">
                      {t("detail.ui.gender")}
                    </span>
                    <span className="text-text-primary font-semibold dark:text-white/90">
                      {session.patientDetails.gender === "MALE"
                        ? t("detail.ui.male")
                        : session.patientDetails.gender === "FEMALE"
                          ? t("detail.ui.female")
                          : session.patientDetails.gender}
                    </span>
                  </div>
                )}
                {session.patientDetails?.dateOfBirth && (
                  <div className="bg-surface-tertiary rounded-lg p-2 dark:bg-white/5">
                    <span className="text-text-muted block text-[10px]">
                      {t("detail.ui.age")}
                    </span>
                    <span className="text-text-primary font-semibold dark:text-white/90">
                      {calculateAge(session.patientDetails.dateOfBirth)}{" "}
                      {t("detail.ui.years")}
                    </span>
                  </div>
                )}
                {session.patientDetails?.preferredLanguage && (
                  <div className="bg-surface-tertiary rounded-lg p-2 dark:bg-white/5">
                    <span className="text-text-muted block text-[10px]">
                      {t("detail.ui.preferredLanguage")}
                    </span>
                    <span className="text-text-primary font-semibold dark:text-white/90">
                      {session.patientDetails.preferredLanguage === "ar" ? t("detail.ui.arabic") : t("detail.ui.english")}
                    </span>
                  </div>
                )}
                {session.patientDetails?.country && (
                  <div className="bg-surface-tertiary rounded-lg p-2 dark:bg-white/5">
                    <span className="text-text-muted block text-[10px]">
                      {t("detail.ui.country")}
                    </span>
                    <span className="text-text-primary font-semibold dark:text-white/90 truncate block">
                      {locale === "ar" && session.patientDetails.country.nativeName
                        ? session.patientDetails.country.nativeName
                        : session.patientDetails.country.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Booking & Payment */}
            <div className="pt-3">
              <h3 className="text-text-primary mb-2 text-sm font-bold dark:text-white/90">
                {t("detail.ui.bookingPayment")}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">{t("detail.ui.coverage")}</span>
                  <span className="text-text-primary font-medium dark:text-white/90">
                    {session.paymentCoverageType === "PACKAGE"
                      ? t("detail.ui.package")
                      : session.paymentCoverageType === "CORPORATE_SPONSORSHIP"
                        ? t("detail.ui.corporate")
                        : t("detail.ui.directPayment")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">{t("detail.ui.paymentStatus")}</span>
                  <span className="text-text-primary font-semibold dark:text-white/90">
                    {session.paymentDetails
                      ? formatPaymentStatus(session.paymentDetails.status, t)
                      : session.paymentCoverageType === "PACKAGE"
                        ? t("detail.ui.packageCovered")
                        : t("detail.ui.unpaid")}
                  </span>
                </div>
                {session.paymentDetails && (
                  <div className="flex items-center justify-between border-t border-border-light/40 pt-2 dark:border-white/5">
                    <span className="text-text-muted">{t("detail.ui.total")}</span>
                    <span className="text-primary font-bold text-sm">
                      {formatMoney(locale, session.paymentDetails.amountTotal, session.paymentDetails.currencyCode)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Messaging Trigger */}
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-text-primary text-sm font-bold dark:text-white/90">
                  {t("detail.chatCard.heading")}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {canOpenSessionChat ? (
                  <>
                    <button
                      type="button"
                      onClick={() => dispatchOpenSessionChatInShell({ sessionId: session.id })}
                      className="bg-primary hover:bg-primary-hover flex-1 rounded-xl py-2 px-3 text-xs font-semibold text-white shadow-xs transition"
                    >
                      {openInMessagesLabel}
                    </button>
                    <Link
                      href={`/practitioner/sessions/${session.id}/chat` as never}
                      className="border border-border-light rounded-xl py-2 px-3 text-xs font-medium text-text-primary hover:bg-surface-tertiary transition dark:text-white/90"
                    >
                      {t("detail.chatCard.open")}
                    </Link>
                  </>
                ) : (
                  <p className="text-xs text-text-muted">
                    {t("detail.chatCard.disabledNote")}
                  </p>
                )}
              </div>
            </div>

            {/* 4. Session Closeout Actions */}
            <div className="pt-3">
              <h3 className="text-text-primary mb-2 text-sm font-bold dark:text-white/90">
                {t("detail.actions.heading")}
              </h3>

              {recentAction === "no-show" && !noShowMutation.isError && (
                <div className="bg-primary-light border border-primary/20 text-xs text-text-primary rounded-lg p-2 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-primary shrink-0" />
                  <span>{t("detail.actions.noShowSuccess")}</span>
                </div>
              )}

              {canMarkNoShow ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs py-2"
                    onClick={() => {
                      setConfirmingAction("no-show");
                      setRecentAction(null);
                    }}
                    disabled={isBusy}
                  >
                    {t("detail.actions.noShow")}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-text-muted">
                  {t("detail.actions.notAllowedYet")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back to sessions � inactive sessions only */}
      {!isActive && (
        <div className="pt-1">
          <Link
            href="/practitioner/sessions"
            className="border-border-light text-text-secondary hover:bg-surface-tertiary inline-flex items-center justify-center rounded-2xl border px-5 py-2.5 text-sm dark:hover:bg-white/5"
          >
            {t("detail.backToSessions")}
          </Link>
        </div>
      )}

      {/* ??? MODALS ??? */}
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
        <div className="border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300 rounded-xl border px-4 py-4 text-sm">
          <div className="flex items-start gap-3">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {session.patient?.displayName ?? "-"}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {session.scheduledStartAt
                  ? formatPractitionerOrViewerDateTime(
                      session.scheduledStartAt,
                      practitionerTimeZone,
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
        confirmDisabled={
          roomCloseRequiresReason && roomCloseReason.trim().length === 0
        }
      >
        <div className="space-y-4">
          {roomCloseRequiresReason ? (
            <div>
              <label className="text-text-primary block text-sm font-medium dark:text-white/90">
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
              <p className="text-text-secondary mt-2 text-xs leading-5">
                {t("detail.roomClose.reasonHelp")}
              </p>
            </div>
          ) : (
            <div className="border-border-light bg-surface-tertiary text-text-secondary rounded-xl border px-4 py-3 text-sm dark:bg-white/5">
              {t("detail.roomClose.afterEndHelper")}
            </div>
          )}

          {roomCloseError ? (
            <div className="border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-500/20 dark:bg-danger-500/10 dark:text-danger-200 rounded-xl border px-4 py-3 text-sm">
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

function formatCleanReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  if (reason.startsWith("sawiyaa.dev") || reason.includes(".v1:") || reason.includes("primary-immediately-joinable")) {
    return null;
  }
  return reason;
}

const EVENT_TYPE_KEYS = new Set([
  "SESSION_CREATED",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
  "PRACTITIONER_ACCEPTED",
  "PRACTITIONER_REJECTED",
  "SESSION_CONFIRMED",
  "SESSION_READY_TO_JOIN",
  "PATIENT_JOINED",
  "PRACTITIONER_JOINED",
  "SESSION_STARTED",
  "SESSION_AWAITING_COMPLETION_CONFIRMATION",
  "SESSION_COMPLETED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_PRACTITIONER",
  "EXPIRED_UNPAID",
  "NO_SHOW_PATIENT",
  "NO_SHOW_PRACTITIONER",
  "PROVIDER_ROOM_CREATED",
  "PROVIDER_ROOM_ENDED",
]);

function formatEventType(eventType: string, t: any) {
  return EVENT_TYPE_KEYS.has(eventType)
    ? t(`detail.eventTypes.${eventType}`)
    : eventType;
}

function formatPaymentStatus(status: string, t: any) {
  const knownStatuses = new Set(["CREATED", "CAPTURED", "FAILED", "CANCELLED", "REFUNDED"]);
  return knownStatuses.has(status) ? t(`detail.paymentStatuses.${status}`) : status;
}
