/**
 * Availability adapter for the canonical Backend temporal contract.
 * Availability-specific rules stay in this module; generic timezone and
 * wall-clock conversion semantics live in common/utils/timezone.util.ts.
 */
export {
  addDaysToCalendarDate,
  calendarDateToIsoDate,
  compareCalendarDates,
  getCalendarDateParts,
  getWeekdayIndex,
  getZonedDateTimeParts,
  isValidIanaTimeZone,
  resolveZonedDateTime,
  zonedDateTimeToUtc,
} from '@common/utils/timezone.util';

export type {
  CalendarDateParts,
  LocalWallClock,
  ZonedDateTimeParts,
  ZonedDateTimeResolution,
} from '@common/utils/timezone.util';
