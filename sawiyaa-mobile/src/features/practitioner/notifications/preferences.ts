import type { SettingsNotificationPreferenceItem } from "../../settings/types";

export type PractitionerNotificationCategory =
  | "sessions"
  | "bookings"
  | "messages"
  | "schedule";

export type PractitionerNotificationEventDefinition = {
  typeSlug: string;
  category: PractitionerNotificationCategory;
  titleKey: string;
};

export type PractitionerNotificationPreferenceGroup = {
  typeSlug: string;
  definition: PractitionerNotificationEventDefinition;
  channels: SettingsNotificationPreferenceItem[];
};

export const PRACTITIONER_NOTIFICATION_EVENT_DEFINITIONS: readonly PractitionerNotificationEventDefinition[] = [
  {
    typeSlug: "sessions.session-confirmed-practitioner",
    category: "sessions",
    titleKey: "sessionConfirmed",
  },
  {
    typeSlug: "sessions.session-cancelled-practitioner",
    category: "sessions",
    titleKey: "sessionCancelled",
  },
  {
    typeSlug: "sessions.session-join-available",
    category: "sessions",
    titleKey: "sessionJoinAvailable",
  },
  {
    typeSlug: "sessions.session-reminder-60",
    category: "sessions",
    titleKey: "sessionReminder60",
  },
  {
    typeSlug: "sessions.session-reminder-15",
    category: "sessions",
    titleKey: "sessionReminder15",
  },
  {
    typeSlug: "sessions.session-starting-now",
    category: "sessions",
    titleKey: "sessionStartingNow",
  },
  {
    typeSlug: "sessions.session-late-join",
    category: "sessions",
    titleKey: "sessionLateJoin",
  },
  {
    typeSlug: "sessions.session-reminder-before-start",
    category: "sessions",
    titleKey: "sessionReminderBeforeStart",
  },
  {
    typeSlug: "instant-booking.request-created",
    category: "bookings",
    titleKey: "instantBookingRequest",
  },
  {
    typeSlug: "messages.session-message-received",
    category: "messages",
    titleKey: "sessionMessage",
  },
  {
    typeSlug: "messages.support-message-received",
    category: "messages",
    titleKey: "supportMessage",
  },
  {
    typeSlug: "messages.follow-up-message-received",
    category: "messages",
    titleKey: "followUpMessage",
  },
  {
    typeSlug: "care-chat.request-approved",
    category: "messages",
    titleKey: "followUpApproved",
  },
  {
    typeSlug: "care-chat.request-revoked",
    category: "messages",
    titleKey: "followUpRevoked",
  },
  {
    typeSlug: "availability.week-ending-reminder",
    category: "schedule",
    titleKey: "scheduleReminder",
  },
];

const definitionsBySlug = new Map(
  PRACTITIONER_NOTIFICATION_EVENT_DEFINITIONS.map((definition) => [
    definition.typeSlug,
    definition,
  ]),
);

export function getPractitionerNotificationDefinition(typeSlug: string) {
  return definitionsBySlug.get(typeSlug) ?? null;
}

export function groupPractitionerNotificationPreferences(
  items: SettingsNotificationPreferenceItem[],
) {
  const grouped = new Map<
    PractitionerNotificationCategory,
    PractitionerNotificationPreferenceGroup[]
  >();

  for (const definition of PRACTITIONER_NOTIFICATION_EVENT_DEFINITIONS) {
    const eventItems = items.filter(
      (item) => item.typeSlug === definition.typeSlug,
    );

    if (eventItems.length > 0) {
      grouped.set(definition.category, [
        ...(grouped.get(definition.category) ?? []),
        {
          typeSlug: definition.typeSlug,
          definition,
          channels: eventItems,
        },
      ]);
    }
  }

  return grouped;
}
