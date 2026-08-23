import type { UserNotificationItem } from "../../patient/notifications/types";
import { formatViewerDateTime } from "../../../lib/time-formatting";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function isArabicLocale(locale: string) {
  return locale.toLowerCase().startsWith("ar");
}

function safeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function contextName(item: UserNotificationItem) {
  return safeText(item.context?.senderName) || safeText(item.context?.patientName);
}

function feedTitle(t: Translate, key: string) {
  return t("practitionerNotifications.feedTypes." + key + "Title");
}

function feedBody(t: Translate, key: string, item: UserNotificationItem) {
  return t("practitionerNotifications.feedTypes." + key + "Body", {
    person:
      contextName(item) ||
      t("practitionerNotifications.feedTypes.personFallback"),
  });
}

function resolveNotificationBody(item: UserNotificationItem, t: Translate) {
  switch (item.typeSlug) {
    case "sessions.session-confirmed-practitioner":
      return feedBody(t, "sessionConfirmedPractitioner", item);
    case "sessions.session-join-available":
      return feedBody(t, "sessionJoinAvailable", item);
    case "sessions.session-cancelled-practitioner":
      return feedBody(t, "sessionCancelledPractitioner", item);
    case "sessions.session-reminder-60":
      return feedBody(t, "sessionReminder60", item);
    case "sessions.session-reminder-15":
      return feedBody(t, "sessionReminder15", item);
    case "sessions.session-starting-now":
      return feedBody(t, "sessionStartingNow", item);
    case "sessions.session-late-join":
      return feedBody(t, "sessionLateJoin", item);
    case "sessions.session-reminder-before-start":
      return feedBody(t, "sessionReminderBeforeStart", item);
    case "messages.session-message-received":
      return feedBody(t, "sessionMessage", item);
    case "messages.support-message-received":
      return feedBody(t, "supportMessage", item);
    case "messages.follow-up-message-received":
      return feedBody(t, "followUpMessage", item);
    case "care-chat.request-approved":
      return feedBody(t, "followUpApproved", item);
    case "care-chat.request-revoked":
      return feedBody(t, "followUpRevoked", item);
    case "instant-booking.request-created":
      return t("practitionerNotifications.feedTypes.instantBookingRequestBody");
    case "availability.week-ending-reminder":
      return t("practitionerNotifications.feedTypes.scheduleReminderBody");
    default:
      return t("practitionerNotifications.feedTypes.fallbackBody");
  }
}

function resolveNotificationTitle(item: UserNotificationItem, t: Translate) {
  switch (item.typeSlug) {
    case "sessions.session-confirmed-practitioner":
      return feedTitle(t, "sessionConfirmedPractitioner");
    case "sessions.session-join-available":
      return feedTitle(t, "sessionJoinAvailable");
    case "sessions.session-cancelled-practitioner":
      return feedTitle(t, "sessionCancelledPractitioner");
    case "sessions.session-reminder-60":
      return feedTitle(t, "sessionReminder60");
    case "sessions.session-reminder-15":
      return feedTitle(t, "sessionReminder15");
    case "sessions.session-starting-now":
      return feedTitle(t, "sessionStartingNow");
    case "sessions.session-late-join":
      return feedTitle(t, "sessionLateJoin");
    case "sessions.session-reminder-before-start":
      return feedTitle(t, "sessionReminderBeforeStart");
    case "messages.session-message-received":
      return feedTitle(t, "sessionMessage");
    case "messages.support-message-received":
      return feedTitle(t, "supportMessage");
    case "messages.follow-up-message-received":
      return feedTitle(t, "followUpMessage");
    case "care-chat.request-approved":
      return feedTitle(t, "followUpApproved");
    case "care-chat.request-revoked":
      return feedTitle(t, "followUpRevoked");
    case "instant-booking.request-created":
      return feedTitle(t, "instantBookingRequest");
    case "availability.week-ending-reminder":
      return feedTitle(t, "scheduleReminder");
    default:
      return t("practitionerNotifications.feedTypes.fallbackTitle");
  }
}

export function formatPractitionerNotificationDateTime(
  dateString: string,
  locale: string,
) {
  return formatViewerDateTime(dateString, {
    locale: isArabicLocale(locale) ? "ar-EG" : "en-US",
    fallbackText: "-",
  });
}

function resolvePractitionerMessagesLaneRoute(typeSlug: string | null | undefined) {
  if (typeSlug === "messages.session-message-received") {
    return "/(practitioner)/messages?tab=sessions";
  }

  if (typeSlug === "messages.support-message-received") {
    return "/(practitioner)/messages?tab=support";
  }

  if (typeSlug === "messages.follow-up-message-received") {
    return "/(practitioner)/messages?tab=followup";
  }

  return null;
}

export function resolvePractitionerNotificationRoute(
  href: string,
  typeSlug?: string | null,
  payload: Record<string, unknown> = {},
  primaryAction?: UserNotificationItem["primaryAction"],
) {
  const actionRoute = primaryAction?.href?.trim() || "";
  const payloadRoute =
    typeof payload.routePath === "string" ? payload.routePath : "";
  const trimmed = (
    href.trim() !== "/" ? href : actionRoute || payloadRoute
  ).trim();

  if (!trimmed) {
    return resolvePractitionerMessagesLaneRoute(typeSlug);
  }
  if (trimmed === "/") {
    return resolvePractitionerMessagesLaneRoute(typeSlug);
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  const segments = trimmed.split("/").filter(Boolean);
  const practitionerIndex = segments.findIndex(
    (segment) => segment === "practitioner",
  );

  if (practitionerIndex === -1) {
    return null;
  }

  const target = segments.slice(practitionerIndex + 1);
  if (target.length === 0) {
    return null;
  }

  const [rawHead, second, third] = target;
  const [head] = rawHead.split("?");

  if (head === "sessions") {
    return second
      ? "/(practitioner)/sessions/" + second
      : "/(practitioner)/sessions";
  }

  if (head === "instant-booking") {
    return "/(practitioner)/instant-booking";
  }

  if (head === "messages") {
    return second
      ? "/(practitioner)/messages/" + second
      : "/(practitioner)/messages";
  }

  if (head === "support") {
    return second
      ? "/(practitioner)/support/" + second
      : "/(practitioner)/support";
  }

  if (head === "care-chat") {
    if (second === "conversations" && third) {
      return "/(practitioner)/care-chat/" + third;
    }
    if (second === "requests" && third) {
      return "/(practitioner)/care-chat/request/" + third;
    }
    if (second) {
      return "/(practitioner)/care-chat/" + second;
    }
    return "/(practitioner)/care-chat";
  }

  if (head === "finance") {
    if (second === "wallet") {
      return "/(practitioner)/finance/wallet";
    }
    if (second === "ledger") {
      return "/(practitioner)/finance/ledger";
    }
    if (second === "settlements") {
      return "/(practitioner)/finance/settlements";
    }
    return "/(practitioner)/finance";
  }

  if (head === "availability") {
    return "/(practitioner)/availability";
  }

  if (head === "account") {
    return "/(practitioner)/account";
  }

  if (head === "promo-codes") {
    return "/(practitioner)/promo-codes";
  }

  if (head === "notifications") {
    return "/(practitioner)/notifications";
  }

  if (head === "more") {
    return "/(practitioner)/more";
  }

  return resolvePractitionerMessagesLaneRoute(typeSlug);
}

export function resolvePractitionerNotificationPresentation(
  item: UserNotificationItem,
  _locale: string,
  t: Translate,
) {
  return {
    title: resolveNotificationTitle(item, t),
    body: resolveNotificationBody(item, t),
  };
}
