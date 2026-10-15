import { SessionReminderType } from '@prisma/client';

const FRESHNESS_WINDOW_MS: Record<SessionReminderType, number> = {
  [SessionReminderType.REMINDER_60]: 15 * 60_000,
  [SessionReminderType.REMINDER_15]: 5 * 60_000,
  [SessionReminderType.STARTING_NOW]: 90_000,
  [SessionReminderType.LATE_JOIN]: 2 * 60_000,
  [SessionReminderType.PRE_START]: 5 * 60_000,
};

export function getSessionReminderFreshnessWindowMs(
  reminderType: SessionReminderType,
): number {
  return FRESHNESS_WINDOW_MS[reminderType];
}

export function isSessionReminderStale(input: {
  reminderType: SessionReminderType;
  dueAt: Date;
  now: Date;
}): boolean {
  return (
    input.now.getTime() >
    input.dueAt.getTime() +
      getSessionReminderFreshnessWindowMs(input.reminderType)
  );
}
