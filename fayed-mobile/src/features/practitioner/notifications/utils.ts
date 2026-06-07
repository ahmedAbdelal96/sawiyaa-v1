import type { UserNotificationItem } from "../../patient/notifications/types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function isArabicLocale(locale: string) {
  return locale.toLowerCase().startsWith("ar");
}

function safeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function readNumberPayload(
  payload: Record<string, unknown>,
  key: string,
): number | null {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildPackageContextText(
  payload: Record<string, unknown>,
  t: Translate,
) {
  const packageSessionIndex = readNumberPayload(
    payload,
    "packageSessionIndex",
  );
  const packageSessionCount = readNumberPayload(
    payload,
    "packageSessionCount",
  );

  if (
    packageSessionIndex === null ||
    packageSessionCount === null ||
    packageSessionCount <= 0
  ) {
    return "";
  }

  return t("practitionerNotifications.feedTypes.packageSessionContext", {
    packageSessionIndex,
    packageSessionCount,
  });
}

function resolveNotificationBody(
  item: UserNotificationItem,
  locale: string,
  t: Translate,
) {
  if (!isArabicLocale(locale)) {
    return safeText(item.body);
  }

  const payload = item.payload ?? {};
  const packageContext = buildPackageContextText(payload, t);
  const suffix = packageContext ? ` ${packageContext}` : "";

  switch (item.typeSlug) {
    case "sessions.session-confirmed-practitioner":
      return t(
        "practitionerNotifications.feedTypes.sessionConfirmedPractitionerBody",
        { packageContext: suffix },
      );
    case "sessions.session-confirmed":
      return t("practitionerNotifications.feedTypes.sessionConfirmedBody", {
        packageContext: suffix,
      });
    case "sessions.session-join-available":
      return t("practitionerNotifications.feedTypes.sessionJoinAvailableBody", {
        packageContext: suffix,
      });
    case "sessions.session-cancelled-practitioner":
      return t(
        "practitionerNotifications.feedTypes.sessionCancelledPractitionerBody",
        { packageContext: suffix },
      );
    default:
      return safeText(item.body);
  }
}

function resolveNotificationTitle(
  item: UserNotificationItem,
  locale: string,
  t: Translate,
) {
  if (!isArabicLocale(locale)) {
    return safeText(item.title) || safeText(item.typeSlug);
  }

  switch (item.typeSlug) {
    case "sessions.session-confirmed-practitioner":
      return t(
        "practitionerNotifications.feedTypes.sessionConfirmedPractitionerTitle",
      );
    case "sessions.session-confirmed":
      return t("practitionerNotifications.feedTypes.sessionConfirmedTitle");
    case "sessions.session-join-available":
      return t("practitionerNotifications.feedTypes.sessionJoinAvailableTitle");
    case "sessions.session-cancelled-practitioner":
      return t(
        "practitionerNotifications.feedTypes.sessionCancelledPractitionerTitle",
      );
    default:
      return safeText(item.title) || safeText(item.typeSlug);
  }
}

export function formatPractitionerNotificationDateTime(
  dateString: string,
  locale: string,
) {
  const resolvedLocale = isArabicLocale(locale) ? "ar-EG" : "en-US";

  return new Date(dateString).toLocaleString(resolvedLocale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !isArabicLocale(locale),
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
) {
  const messageLaneRoute = resolvePractitionerMessagesLaneRoute(typeSlug);
  if (messageLaneRoute) {
    return messageLaneRoute;
  }

  const trimmed = href.trim();
  if (!trimmed) {
    return null;
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

  const [head, second, third] = target;

  if (head === "sessions") {
    if (second) {
      return `/(practitioner)/sessions/${second}`;
    }
    return "/(practitioner)/sessions";
  }

  if (head === "messages") {
    if (second) {
      return `/(practitioner)/messages/${second}`;
    }
    return "/(practitioner)/messages";
  }

  if (head === "support") {
    if (second) {
      return `/(practitioner)/support/${second}`;
    }
    return "/(practitioner)/support";
  }

  if (head === "care-chat") {
    if (second === "conversations" && third) {
      return `/(practitioner)/care-chat/${third}`;
    }
    if (second === "requests" && third) {
      return `/(practitioner)/care-chat/request/${third}`;
    }
    if (second) {
      return `/(practitioner)/care-chat/${second}`;
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

  return null;
}

export function resolvePractitionerNotificationPresentation(
  item: UserNotificationItem,
  locale: string,
  t: Translate,
) {
  return {
    title: resolveNotificationTitle(item, locale, t),
    body: resolveNotificationBody(item, locale, t),
  };
}
