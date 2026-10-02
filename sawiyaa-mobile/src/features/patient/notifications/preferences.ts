import type { SettingsNotificationPreferenceItem } from "../../settings/types";

export type PatientNotificationCategory =
  | "sessions"
  | "messages"
  | "payments"
  | "account"
  | "general";

export type PatientNotificationPreferenceGroup = {
  typeSlug: string;
  category: PatientNotificationCategory;
  channels: SettingsNotificationPreferenceItem[];
};

const EVENT_LABEL_KEYS: Record<string, string> = {
  "sessions.session-confirmed": "sessionConfirmed",
  "sessions.session-confirmed-practitioner": "sessionConfirmed",
  "sessions.session-join-available": "sessionJoinAvailable",
  "sessions.session-started": "sessionStarted",
  "sessions.session-completed": "sessionCompleted",
  "sessions.session-cancelled": "sessionCancelled",
  "sessions.session-cancelled-practitioner": "sessionCancelled",
  "sessions.session-reminder": "sessionReminder",
  "sessions.session-rescheduled": "sessionRescheduled",
  "messages.session-message-received": "sessionMessageReceived",
  "messages.support-message-received": "supportMessageReceived",
  "messages.follow-up-message-received": "followUpMessageReceived",
  "payments.payment-success": "paymentSuccess",
  "payments.payment-captured": "paymentCaptured",
  "payments.payment-failed": "paymentFailed",
  "payments.refund-processed": "refundProcessed",
  "account.security-alert": "securityAlert",
  "account.profile-updated": "profileUpdated",
  "auth.password-reset": "accountUpdate",
  "auth.patient-password-reset": "accountUpdate",
  "auth.patient-login-otp": "accountUpdate",
  "auth.login-otp": "accountUpdate",
  "auth.verify-email": "accountUpdate",
};

export function getPatientNotificationCategory(typeSlug: string): PatientNotificationCategory {
  if (typeSlug.startsWith("sessions.")) return "sessions";
  if (typeSlug.startsWith("messages.")) return "messages";
  if (typeSlug.startsWith("payments.")) return "payments";
  if (typeSlug.startsWith("account.") || typeSlug.startsWith("auth.") || typeSlug.startsWith("admin.")) return "account";
  return "general";
}

export function getPatientNotificationEventLabelKey(typeSlug: string): string {
  return EVENT_LABEL_KEYS[typeSlug] ?? "generalUpdate";
}

export function groupPatientNotificationPreferences(
  items: SettingsNotificationPreferenceItem[],
): PatientNotificationPreferenceGroup[] {
  const groups = new Map<string, PatientNotificationPreferenceGroup>();
  for (const item of items) {
    const existing = groups.get(item.typeSlug);
    if (existing) {
      existing.channels.push(item);
      continue;
    }
    groups.set(item.typeSlug, {
      typeSlug: item.typeSlug,
      category: getPatientNotificationCategory(item.typeSlug),
      channels: [item],
    });
  }
  return Array.from(groups.values());
}
