import type { UserNotificationItem } from "./types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

type PatientNotificationCopyKey =
  | "sessionReminder"
  | "sessionConfirmed"
  | "sessionJoinAvailable"
  | "sessionStarted"
  | "sessionCompleted"
  | "sessionCancelled"
  | "sessionRescheduled"
  | "sessionMessage"
  | "supportMessage"
  | "followUpMessage"
  | "paymentSuccess"
  | "paymentCaptured"
  | "paymentFailed"
  | "refundProcessed"
  | "instantBookingRequest"
  | "instantBookingAccepted"
  | "instantBookingRejected"
  | "instantBookingExpired";

const COPY_KEYS: Record<string, PatientNotificationCopyKey> = {
  "sessions.session-reminder": "sessionReminder",
  "sessions.session-confirmed": "sessionConfirmed",
  "sessions.session-join-available": "sessionJoinAvailable",
  "sessions.session-started": "sessionStarted",
  "sessions.session-completed": "sessionCompleted",
  "sessions.session-cancelled": "sessionCancelled",
  "sessions.session-rescheduled": "sessionRescheduled",
  "messages.session-message-received": "sessionMessage",
  "messages.support-message-received": "supportMessage",
  "messages.follow-up-message-received": "followUpMessage",
  "payments.payment-success": "paymentSuccess",
  "payments.payment-captured": "paymentCaptured",
  "payments.payment-failed": "paymentFailed",
  "payments.refund-processed": "refundProcessed",
  "instant-booking.request-created": "instantBookingRequest",
  "instant-booking.request-accepted": "instantBookingAccepted",
  "instant-booking.request-rejected": "instantBookingRejected",
  "instant-booking.request-expired": "instantBookingExpired",
};

function contextName(item: UserNotificationItem) {
  return (
    item.context?.practitionerName?.trim() ||
    item.context?.senderName?.trim() ||
    ""
  );
}

function personContext(item: UserNotificationItem, isArabic: boolean) {
  const name = contextName(item);
  if (!name) {
    return "";
  }
  return isArabic ? ` مع ${name}` : ` with ${name}`;
}

function packageContext(item: UserNotificationItem, t: Translate) {
  const payload = item.payload ?? {};
  const index = payload.packageSessionIndex;
  const count = payload.packageSessionCount;
  if (index === undefined || count === undefined || Number(count) <= 0) {
    return "";
  }
  return ` ${t("patientNotifications.feedTypes.packageSessionContext", {
    packageSessionIndex: index,
    packageSessionCount: count,
  })}`;
}

export function resolvePatientNotificationPresentation(
  item: UserNotificationItem,
  locale: string,
  t: Translate,
) {
  const copyKey = COPY_KEYS[item.typeSlug];
  const isArabic = locale.toLowerCase().startsWith("ar");

  if (!copyKey) {
    return {
      title: t("patientNotifications.feedTypes.genericTitle"),
      body: t("patientNotifications.feedTypes.genericBody"),
    };
  }

  const options = {
    personContext: personContext(item, isArabic),
    packageContext: packageContext(item, t),
  };

  return {
    title: t(`patientNotifications.feedTypes.${copyKey}Title`),
    body: t(`patientNotifications.feedTypes.${copyKey}Body`, options),
  };
}
