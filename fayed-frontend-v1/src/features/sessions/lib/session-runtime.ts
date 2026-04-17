import type {
  SessionItem,
  SessionJoinBlockedReason,
  SessionJoinItem,
  SessionRuntimeItem,
  SessionProvider,
  SessionStatus,
} from "../types/sessions.types";

export const SESSION_RUNTIME_STATUSES: SessionStatus[] = [
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
];

export const SESSION_RUNTIME_PREPARE_LEAD_MINUTES = 24 * 60;
export const SESSION_RUNTIME_JOIN_LEAD_MINUTES = 15;
export const SESSION_RUNTIME_JOIN_LAG_MINUTES = 120;

export function hasSessionRuntimeAccess(status: SessionStatus): boolean {
  return SESSION_RUNTIME_STATUSES.includes(status);
}

export function buildTokenizedSessionRoomUrl(
  roomUrl: string,
  joinToken: string,
): string {
  const separator = roomUrl.includes("?") ? "&" : "?";
  return `${roomUrl}${separator}t=${encodeURIComponent(joinToken)}`;
}

export function getRuntimeBlockedReasonKey(
  blockedReason: SessionJoinBlockedReason | null,
): SessionJoinBlockedReason {
  return blockedReason ?? "SESSION_NOT_JOINABLE_STATUS";
}

function getWindowTimes(session: SessionItem) {
  const start = session.scheduledStartAt ? new Date(session.scheduledStartAt) : null;
  const end = session.scheduledEndAt ? new Date(session.scheduledEndAt) : null;

  if (!start || !end) {
    return null;
  }

  return {
    prepareOpensAt: new Date(
      start.getTime() - SESSION_RUNTIME_PREPARE_LEAD_MINUTES * 60_000,
    ),
    joinOpensAt: new Date(
      start.getTime() - SESSION_RUNTIME_JOIN_LEAD_MINUTES * 60_000,
    ),
    joinClosesAt: new Date(end.getTime() + SESSION_RUNTIME_JOIN_LAG_MINUTES * 60_000),
  };
}

export function canPrepareSessionRuntime(
  session: SessionItem,
  now: Date = new Date(),
): boolean {
  if (!hasSessionRuntimeAccess(session.status)) {
    return false;
  }

  const windows = getWindowTimes(session);
  if (!windows) {
    return false;
  }

  return now >= windows.prepareOpensAt && now <= windows.joinClosesAt;
}

export function isJoinWindowOpen(
  session: SessionItem,
  now: Date = new Date(),
): boolean {
  const windows = getWindowTimes(session);
  if (!windows || !hasSessionRuntimeAccess(session.status)) {
    return false;
  }

  return now >= windows.joinOpensAt && now <= windows.joinClosesAt;
}

export function getRuntimePreparedState(params: {
  prepareResult: SessionRuntimeItem | null;
  joinResult: SessionJoinItem | null;
}): boolean {
  return (
    Boolean(params.prepareResult?.isPrepared) ||
    Boolean(params.joinResult?.roomName && params.joinResult?.roomUrl)
  );
}

export function getRuntimeProvider(params: {
  prepareResult: SessionRuntimeItem | null;
  joinResult: SessionJoinItem | null;
}): SessionProvider | null {
  return params.joinResult?.provider ?? params.prepareResult?.provider ?? null;
}

export function getRuntimeRoomName(params: {
  prepareResult: SessionRuntimeItem | null;
  joinResult: SessionJoinItem | null;
}): string | null {
  return params.joinResult?.roomName ?? params.prepareResult?.roomName ?? null;
}
