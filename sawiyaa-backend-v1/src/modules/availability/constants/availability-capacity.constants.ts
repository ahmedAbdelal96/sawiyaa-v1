/**
 * Weekly availability stores session start windows, not an expanded calendar.
 * With 30-minute granularity, the supported 30-minute and 60-minute products
 * expose at most 48 + 24 starts per day, across seven days: 504 rows/week.
 * This is the mathematical upper bound for the canonical model; multiple
 * windows cannot create more starts than the full-day grid itself.
 */
export const AVAILABILITY_WEEK_DAYS = 7;
export const AVAILABILITY_DAY_MINUTES = 24 * 60;
export const AVAILABILITY_SLOT_GRANULARITY_MINUTES = 30;
export const AVAILABILITY_SUPPORTED_DURATIONS_MINUTES = [30, 60] as const;
export const AVAILABILITY_MAX_SLOTS_PER_DAY =
  AVAILABILITY_SUPPORTED_DURATIONS_MINUTES.reduce(
    (total, duration) => total + AVAILABILITY_DAY_MINUTES / duration,
    0,
  );
export const AVAILABILITY_WEEK_MAX_SLOTS =
  AVAILABILITY_WEEK_DAYS * AVAILABILITY_MAX_SLOTS_PER_DAY;
