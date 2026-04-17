/**
 * Availability V1 uses practitioner timezone as the source of truth for recurring weekly schedule interpretation.
 * This utility keeps timezone conversion logic centralized so Sessions/Booking can reuse the same semantics later.
 */
export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

interface ZonedDateTimeParts extends CalendarDateParts {
  hour: number;
  minute: number;
  second: number;
}

const zonedDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getZonedDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cacheKey = `date-time:${timeZone}`;
  const existing = zonedDateTimeFormatterCache.get(cacheKey);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  zonedDateTimeFormatterCache.set(cacheKey, formatter);
  return formatter;
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    getZonedDateTimeFormatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function formatPartsToObject(
  parts: Intl.DateTimeFormatPart[],
): Record<string, string> {
  return parts.reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
}

export function getZonedDateTimeParts(
  input: Date,
  timeZone: string,
): ZonedDateTimeParts {
  const formatter = getZonedDateTimeFormatter(timeZone);
  const rawParts = formatPartsToObject(formatter.formatToParts(input));

  return {
    year: Number(rawParts.year),
    month: Number(rawParts.month),
    day: Number(rawParts.day),
    hour: Number(rawParts.hour),
    minute: Number(rawParts.minute),
    second: Number(rawParts.second),
  };
}

export function getCalendarDateParts(
  input: Date,
  timeZone: string,
): CalendarDateParts {
  const parts = getZonedDateTimeParts(input, timeZone);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function getTimeZoneOffsetMilliseconds(input: Date, timeZone: string): number {
  const zoned = getZonedDateTimeParts(input, timeZone);
  const asUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  return asUtc - input.getTime();
}

export function zonedDateTimeToUtc(
  input: CalendarDateParts & { hour: number; minute: number },
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    0,
    0,
  );

  const firstOffset = getTimeZoneOffsetMilliseconds(new Date(utcGuess), timeZone);
  let resolved = new Date(utcGuess - firstOffset);
  const secondOffset = getTimeZoneOffsetMilliseconds(resolved, timeZone);

  if (secondOffset !== firstOffset) {
    resolved = new Date(utcGuess - secondOffset);
  }

  return resolved;
}

export function addDaysToCalendarDate(
  input: CalendarDateParts,
  days: number,
): CalendarDateParts {
  const working = new Date(Date.UTC(input.year, input.month - 1, input.day));
  working.setUTCDate(working.getUTCDate() + days);

  return {
    year: working.getUTCFullYear(),
    month: working.getUTCMonth() + 1,
    day: working.getUTCDate(),
  };
}

export function compareCalendarDates(
  left: CalendarDateParts,
  right: CalendarDateParts,
): number {
  const leftStamp = Date.UTC(left.year, left.month - 1, left.day);
  const rightStamp = Date.UTC(right.year, right.month - 1, right.day);

  return leftStamp - rightStamp;
}

export function calendarDateToIsoDate(input: CalendarDateParts): string {
  return `${input.year.toString().padStart(4, '0')}-${input.month
    .toString()
    .padStart(2, '0')}-${input.day.toString().padStart(2, '0')}`;
}

export function getWeekdayIndex(input: CalendarDateParts): number {
  return new Date(Date.UTC(input.year, input.month - 1, input.day)).getUTCDay();
}
