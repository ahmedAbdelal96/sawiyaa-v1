import type {
  SessionJoinBlockedReason,
  SessionJoinItem,
  SessionProviderRuntime,
  SessionRuntimeItem,
  SessionProvider,
} from "../types/sessions.types";

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

  // Daily private rooms require the provider meeting token. The backend may
  // describe the launch as a redirect, but that must not discard the token.
  if (runtime.name === "DAILY") {
    return runtime.token
      ? buildTokenizedSessionRoomUrl(runtime.roomUrl, runtime.token)
      : null;
  }

  if (
    runtime.joinMode === "redirect_url" ||
    runtime.joinMode === "embedded" ||
    runtime.joinMode === "external_url"
  ) {
    return runtime.roomUrl;
  }

  return runtime.roomUrl;
}

export function canLaunchProviderRuntime(source: RuntimeSource): boolean {
  return Boolean(buildProviderLaunchUrl(source));
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
