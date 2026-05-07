import type {
  SessionItem,
  SessionJoinBlockedReason,
  SessionJoinItem,
  SessionProviderRuntime,
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

export function formatProviderDisplayName(provider: string | null): string | null {
  if (!provider || provider === "NONE") {
    return null;
  }

  return provider
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

type RuntimeSource =
  | SessionJoinItem
  | SessionRuntimeItem
  | SessionProviderRuntime
  | null
  | undefined;

function isProviderRuntime(value: RuntimeSource): value is SessionProviderRuntime {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      "roomId" in value &&
      "roomUrl" in value &&
      "token" in value,
  );
}

function hasLaunchableRuntime(runtime: SessionProviderRuntime | null): boolean {
  return Boolean(runtime && (runtime.roomId || runtime.roomUrl));
}

function normalizeLegacyRuntime(source: SessionJoinItem | SessionRuntimeItem): SessionProviderRuntime | null {
  const hasLegacyData =
    Boolean(source.roomName) ||
    Boolean(source.roomUrl) ||
    ("joinToken" in source && Boolean(source.joinToken)) ||
    Boolean(source.providerRuntime);

  if (!hasLegacyData) {
    return null;
  }

  return {
    name: source.provider,
    roomId: source.roomName ?? null,
    roomUrl: source.roomUrl ?? null,
    token: "joinToken" in source ? source.joinToken ?? null : null,
    tokenExpiresAt: null,
    joinMode: null,
    payload: {},
  };
}

export function getSessionProviderRuntime(source: RuntimeSource): SessionProviderRuntime | null {
  if (!source) {
    return null;
  }

  if (isProviderRuntime(source)) {
    return source;
  }

  if (source.providerRuntime) {
    return source.providerRuntime;
  }

  return normalizeLegacyRuntime(source) ?? null;
}

export function buildProviderLaunchUrl(source: RuntimeSource): string | null {
  const runtime = getSessionProviderRuntime(source);

  if (!runtime?.roomUrl) {
    return null;
  }

  if (
    runtime.joinMode === "redirect_url" ||
    runtime.joinMode === "embedded" ||
    runtime.joinMode === "external_url"
  ) {
    return runtime.roomUrl;
  }

  if (runtime.name === "DAILY" && runtime.token) {
    return buildTokenizedSessionRoomUrl(runtime.roomUrl, runtime.token);
  }

  return runtime.roomUrl;
}

export function canLaunchProviderRuntime(source: RuntimeSource): boolean {
  return Boolean(buildProviderLaunchUrl(source));
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
    hasLaunchableRuntime(getSessionProviderRuntime(params.prepareResult)) ||
    hasLaunchableRuntime(getSessionProviderRuntime(params.joinResult))
  );
}

export function getRuntimeProvider(params: {
  prepareResult: SessionRuntimeItem | null;
  joinResult: SessionJoinItem | null;
}): SessionProvider | null {
  return (
    getSessionProviderRuntime(params.joinResult)?.name ??
    getSessionProviderRuntime(params.prepareResult)?.name ??
    params.joinResult?.provider ??
    params.prepareResult?.provider ??
    null
  );
}

export function getRuntimeRoomName(params: {
  prepareResult: SessionRuntimeItem | null;
  joinResult: SessionJoinItem | null;
}): string | null {
  return (
    getSessionProviderRuntime(params.joinResult)?.roomId ??
    params.joinResult?.roomName ??
    getSessionProviderRuntime(params.prepareResult)?.roomId ??
    params.prepareResult?.roomName ??
    null
  );
}
