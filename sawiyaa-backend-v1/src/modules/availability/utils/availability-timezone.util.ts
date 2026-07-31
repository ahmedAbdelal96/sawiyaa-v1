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

export type ZonedDateTimeResolution =
  | { status: 'valid'; date: Date }
  | { status: 'nonexistent' }
  | { status: 'ambiguous' };

const zonedDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

export { isValidIanaTimeZone } from '@common/utils/timezone.util';

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
  const resolution = resolveZonedDateTime(input, timeZone);
  if (resolution.status !== 'valid') {
    throw new RangeError(`Local time is ${resolution.status}`);
  }

  return resolution.date;
}

export function resolveZonedDateTime(
  input: CalendarDateParts & { hour: number; minute: number },
  timeZone: string,
): ZonedDateTimeResolution {
  const normalizedDate = input.hour === 24 && input.minute === 0
    ? addDaysToCalendarDate(input, 1)
    : input;
  const hour = normalizedDate === input ? input.hour : 0;
  const minute = normalizedDate === input ? input.minute : 0;
  const utcGuess = Date.UTC(
    normalizedDate.year,
    normalizedDate.month - 1,
    normalizedDate.day,
    hour,
    minute,
    0,
    0,
  );
  const candidates = new Set<number>();

  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    candidates.add(
      getTimeZoneOffsetMilliseconds(
        new Date(utcGuess + hours * 60 * 60 * 1000),
        timeZone,
      ),
    );
  }

  const matches = [...candidates]
    .map((offset) => new Date(utcGuess - offset))
    .filter((candidate) => {
      const parts = getZonedDateTimeParts(candidate, timeZone);
      return (
        parts.year === normalizedDate.year &&
        parts.month === normalizedDate.month &&
        parts.day === normalizedDate.day &&
        parts.hour === hour &&
        parts.minute === minute
      );
    });

  const uniqueMatches = new Map(matches.map((match) => [match.getTime(), match]));
  if (uniqueMatches.size === 0) return { status: 'nonexistent' };
  if (uniqueMatches.size > 1) return { status: 'ambiguous' };
  return { status: 'valid', date: [...uniqueMatches.values()][0] };
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
