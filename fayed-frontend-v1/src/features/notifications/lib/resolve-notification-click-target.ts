import type { UserNotificationItem } from "../types/user-notifications.types";
import { normalizeNotificationHref } from "./normalize-notification-href";

export type NotificationShellLane = "session" | "support" | "followup";

export type NotificationClickTarget =
  | {
      kind: "messages-shell";
      lane: NotificationShellLane;
      threadId?: string;
    }
  | {
      kind: "href";
      href: string;
    };

type ResolveNotificationClickTargetInput = {
  item: Pick<UserNotificationItem, "typeSlug" | "action" | "payload">;
  role: "patient" | "practitioner";
};

function buildRoleHomeHref(role: "patient" | "practitioner") {
  return role === "patient" ? "/patient" : "/practitioner";
}

function buildSessionFallbackHref(role: "patient" | "practitioner") {
  return role === "patient" ? "/patient/sessions" : "/practitioner/sessions";
}

function getStringField(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getMessageShellTarget(
  input: ResolveNotificationClickTargetInput,
): { lane: NotificationShellLane; threadId?: string } {
  const payload = input.item.payload;

  if (input.item.typeSlug === "messages.session-message-received") {
    return { lane: "session" };
  }

  if (input.item.typeSlug === "messages.support-message-received") {
    return {
      lane: "support",
      threadId:
        getStringField(payload, "threadId") ??
        getStringField(payload, "supportTicketId") ??
        undefined,
    };
  }

  if (input.item.typeSlug === "messages.follow-up-message-received") {
    return {
      lane: "followup",
      threadId:
        getStringField(payload, "threadId") ??
        getStringField(payload, "careRequestId") ??
        getStringField(payload, "conversationId") ??
        undefined,
    };
  }

  return { lane: "session" };
}

export function resolveNotificationClickTarget(
  input: ResolveNotificationClickTargetInput,
): NotificationClickTarget {
  if (
    input.item.typeSlug === "messages.session-message-received" ||
    input.item.typeSlug === "messages.support-message-received" ||
    input.item.typeSlug === "messages.follow-up-message-received"
  ) {
    return { kind: "messages-shell", ...getMessageShellTarget(input) };
  }

  const normalizedActionHref = normalizeNotificationHref(input.item.action?.href);
  const normalizedRoutePath = normalizeNotificationHref(
    typeof input.item.payload["routePath"] === "string"
      ? (input.item.payload["routePath"] as string)
      : null,
  );
  const href = normalizedActionHref ?? normalizedRoutePath;

  if (input.item.typeSlug.startsWith("sessions.session-")) {
    if (href) {
      return { kind: "href", href };
    }
    return { kind: "href", href: buildSessionFallbackHref(input.role) };
  }

  if (href) {
    return { kind: "href", href };
  }

  return { kind: "href", href: buildRoleHomeHref(input.role) };
}
