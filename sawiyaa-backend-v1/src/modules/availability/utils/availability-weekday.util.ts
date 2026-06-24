import { AvailabilityWeekday } from '@prisma/client';

/**
 * Public/self-service contracts use numeric day-of-week values (0-6) for frontend friendliness.
 * Prisma keeps an explicit enum for storage readability.
 */
export const WEEKDAY_INDEX_TO_ENUM: Record<number, AvailabilityWeekday> = {
  0: AvailabilityWeekday.SUNDAY,
  1: AvailabilityWeekday.MONDAY,
  2: AvailabilityWeekday.TUESDAY,
  3: AvailabilityWeekday.WEDNESDAY,
  4: AvailabilityWeekday.THURSDAY,
  5: AvailabilityWeekday.FRIDAY,
  6: AvailabilityWeekday.SATURDAY,
};

export const WEEKDAY_ENUM_TO_INDEX: Record<AvailabilityWeekday, number> = {
  [AvailabilityWeekday.SUNDAY]: 0,
  [AvailabilityWeekday.MONDAY]: 1,
  [AvailabilityWeekday.TUESDAY]: 2,
  [AvailabilityWeekday.WEDNESDAY]: 3,
  [AvailabilityWeekday.THURSDAY]: 4,
  [AvailabilityWeekday.FRIDAY]: 5,
  [AvailabilityWeekday.SATURDAY]: 6,
};
