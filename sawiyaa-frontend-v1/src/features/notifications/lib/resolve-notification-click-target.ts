import type { UserNotificationItem, NotificationPrimaryAction, NotificationContext } from "../types/user-notifications.types";
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
  item: Pick<UserNotificationItem, "id" | "typeSlug" | "action" | "payload" | "context" | "primaryAction">;
  role: "patient" | "practitioner" | "admin";
};

function buildRoleHomeHref(role: "patient" | "practitioner" | "admin") {
  if (role === "admin") return "/admin";
  return role === "patient" ? "/patient" : "/practitioner";
}

function buildSessionFallbackHref(role: "patient" | "practitioner" | "admin") {
  if (role === "admin") return "/admin/sessions";
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
    return {
      lane: "session",
      threadId:
        getStringField(payload, "threadId") ??
        getStringField(payload, "sessionId") ??
        getStringField(payload, "conversationId") ??
        undefined,
    };
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
  const primaryAction = input.item.primaryAction;

  if (primaryAction) {
    if (primaryAction.kind === "messages") {
      if (input.role === "admin") {
        const lane = primaryAction.lane || "session";
        return {
          kind: "href",
          href: primaryAction.id
            ? `/admin/messages?lane=${lane}&id=${primaryAction.id}`
            : `/admin/messages?lane=${lane}`,
        };
      }
      const lane = primaryAction.lane === "care" ? "followup" : (primaryAction.lane || "session");
      return {
        kind: "messages-shell",
        lane: lane as NotificationShellLane,
        threadId: primaryAction.id || undefined,
      };
    }
    if (primaryAction.kind === "session") {
      return {
        kind: "href",
        href: primaryAction.id 
          ? `/${input.role}/sessions/${primaryAction.id}`
          : buildSessionFallbackHref(input.role),
      };
    }
    if (primaryAction.kind === "support") {
      if (input.role === "admin") {
        return {
          kind: "href",
          href: primaryAction.id
            ? `/admin/messages?lane=support&id=${primaryAction.id}`
            : "/admin/messages?lane=support",
        };
      }
      return {
        kind: "messages-shell",
        lane: "support",
        threadId: primaryAction.id || undefined,
      };
    }
    if (primaryAction.kind === "details") {
      if (input.role === "admin" && input.item.id) {
        return {
          kind: "href",
          href: `/admin/notifications/${input.item.id}`,
        };
      }
    }
  }

  if (
    input.item.typeSlug === "messages.support-message-received" ||
    input.item.typeSlug === "messages.session-message-received" ||
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
