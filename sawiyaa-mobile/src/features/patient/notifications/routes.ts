import type {
  UserNotificationContext,
  UserNotificationPrimaryAction,
} from "./types";

export type PatientNotificationRouteContext = {
  payload?: Record<string, unknown>;
  context?: UserNotificationContext | null;
  primaryAction?: UserNotificationPrimaryAction | null;
};

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isSafeInternalHref(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
  );
}

function normalizeCandidate(value: unknown) {
  const candidate = safeString(value);
  if (!candidate || !isSafeInternalHref(candidate)) {
    return null;
  }
  return candidate;
}

function routeFromPatientHref(href: string) {
  const segments = href.split("/").filter(Boolean);
  const patientIndex = segments.findIndex((segment) => segment === "patient");

  if (patientIndex === -1) {
    return null;
  }

  const target = segments.slice(patientIndex + 1);
  if (target.length === 0) {
    return null;
  }

  const [rawHead, second, third] = target;
  const [head] = rawHead.split("?");

  if (head === "sessions") {
    if (!second) {
      return "/(patient)/sessions";
    }
    if (third === "pay") {
      return `/(patient)/sessions/${second}/pay`;
    }
    if (third === "payment-return") {
      return `/(patient)/sessions/${second}/payment-return`;
    }
    return `/(patient)/sessions/${second}`;
  }

  if (head === "instant-booking") {
    const requestIdMatch = href.match(/[?&]requestId=([^&]+)/i);
    let requestId: string | null = null;
    if (requestIdMatch?.[1]) {
      try {
        requestId = decodeURIComponent(requestIdMatch[1]);
      } catch {
        requestId = null;
      }
    }
    return requestId
      ? `/(patient)/instant-booking?requestId=${encodeURIComponent(requestId)}`
      : "/(patient)/instant-booking";
  }

  if (head === "messages") {
    return second
      ? `/(patient)/messages/${second}`
      : "/(patient)/messages";
  }

  if (head === "payments") {
    return second === "transactions"
      ? "/(patient)/payments/transactions"
      : "/(patient)/payments";
  }

  if (head === "wallet") {
    return "/(patient)/payments";
  }

  if (head === "support") {
    return second ? `/(patient)/support/${second}` : "/(patient)/support";
  }

  if (head === "care-chat") {
    if (second === "conversations" && third) {
      return `/(patient)/care-chat/${third}`;
    }
    if (second === "requests" && third) {
      return `/(patient)/care-chat/request/${third}`;
    }
    return second ? `/(patient)/care-chat/${second}` : "/(patient)/care-chat";
  }

  if (head === "assessments") {
    return "/(patient)/assessments";
  }

  if (head === "profile" || head === "settings") {
    return "/(patient)/profile";
  }

  return null;
}

function isMessageNotification(typeSlug: string | null | undefined) {
  return typeSlug?.startsWith("messages.") ?? false;
}

function resolveMessageRoute(
  typeSlug: string | null | undefined,
  candidates: string[],
  context: PatientNotificationRouteContext,
) {
  for (const candidate of candidates) {
    const route = routeFromPatientHref(candidate);
    if (route?.startsWith("/(patient)/messages/")) {
      return route;
    }
    if (route === "/(patient)/messages") {
      return route;
    }
  }

  const payloadConversationId = safeString(context.payload?.conversationId);
  const actionConversationId =
    context.primaryAction?.kind === "messages"
      ? safeString(context.primaryAction.id)
      : null;
  const conversationId = payloadConversationId ?? actionConversationId;

  if (conversationId && isMessageNotification(typeSlug)) {
    return `/(patient)/messages/${conversationId}`;
  }

  return null;
}

export function resolvePatientNotificationRoute(
  href: string,
  typeSlug?: string | null,
  context: PatientNotificationRouteContext = {},
) {
  const actionHref = normalizeCandidate(context.primaryAction?.href);
  const notificationHref = normalizeCandidate(href);
  const payloadRoute = normalizeCandidate(context.payload?.routePath);
  const candidates = [
    notificationHref,
    actionHref,
    payloadRoute,
  ].filter((candidate): candidate is string => Boolean(candidate && candidate !== "/"));

  if (isMessageNotification(typeSlug)) {
    return resolveMessageRoute(typeSlug, candidates, context);
  }

  for (const candidate of candidates) {
    const route = routeFromPatientHref(candidate);
    if (route) {
      return route;
    }
  }

  const sessionId =
    safeString(context.payload?.sessionId) ??
    (context.primaryAction?.kind === "session"
      ? safeString(context.primaryAction.id)
      : null);

  if (sessionId) {
    return `/(patient)/sessions/${sessionId}`;
  }

  return null;
}
