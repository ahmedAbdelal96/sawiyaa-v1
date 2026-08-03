import { BadRequestException } from '@nestjs/common';

/**
 * Timezone validation is centralized so profile and availability write paths can share the same rules.
 * We intentionally rely on native Intl timezone validation to stay dependency-light.
 */
const timezoneFormatterCache = new Map<string, Intl.DateTimeFormat>();
const fixedOffsetTimezonePattern =
  /^(?:[+-]\d{2}(?::?\d{2})?|UTC[+-]\d{1,2}(?::?\d{2})?|GMT[+-]\d{1,2}(?::?\d{2})?|Etc\/GMT[+-]\d{1,2})$/i;

function getTimezoneFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = timezoneFormatterCache.get(timeZone);
  if (cached) {
    return cached;
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

  timezoneFormatterCache.set(timeZone, formatter);
  return formatter;
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  if (fixedOffsetTimezonePattern.test(timeZone.trim())) {
    return false;
  }

  try {
    getTimezoneFormatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export interface TimezoneValidationErrorOptions {
  messageKey: string;
  error: string;
}

/** Calendar date without a time or timezone. */
export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

/** Local wall-clock value; meaningful only together with an IANA timezone. */
export interface LocalWallClock extends CalendarDateParts {
  hour: number;
  minute: number;
}

export interface ZonedDateTimeParts extends LocalWallClock {
  second: number;
}

export type ZonedDateTimeResolution =
  | { status: 'valid'; date: Date }
  | { status: 'nonexistent' }
  | { status: 'ambiguous' };

const explicitOffsetPattern = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const zonedDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getZonedDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cacheKey = `date-time:${timeZone}`;
  const existing = zonedDateTimeFormatterCache.get(cacheKey);
  if (existing) return existing;

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
    if (part.type !== 'literal') accumulator[part.type] = part.value;
    return accumulator;
  }, {});
}

export function getZonedDateTimeParts(
  input: Date,
  timeZone: string,
): ZonedDateTimeParts {
  const rawParts = formatPartsToObject(
    getZonedDateTimeFormatter(timeZone).formatToParts(input),
  );
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
  return { year: parts.year, month: parts.month, day: parts.day };
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

export function resolveZonedDateTime(
  input: LocalWallClock,
  timeZone: string,
): ZonedDateTimeResolution {
  const normalizedDate =
    input.hour === 24 && input.minute === 0
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

  const uniqueMatches = new Map(
    matches.map((match) => [match.getTime(), match]),
  );
  if (uniqueMatches.size === 0) return { status: 'nonexistent' };
  if (uniqueMatches.size > 1) return { status: 'ambiguous' };
  return { status: 'valid', date: [...uniqueMatches.values()][0] };
}

export function zonedDateTimeToUtc(
  input: LocalWallClock,
  timeZone: string,
): Date {
  const resolution = resolveZonedDateTime(input, timeZone);
  if (resolution.status !== 'valid') {
    throw new RangeError(`Local time is ${resolution.status}`);
  }
  return resolution.date;
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
  return (
    Date.UTC(left.year, left.month - 1, left.day) -
    Date.UTC(right.year, right.month - 1, right.day)
  );
}

export function calendarDateToIsoDate(input: CalendarDateParts): string {
  return `${input.year.toString().padStart(4, '0')}-${input.month
    .toString()
    .padStart(2, '0')}-${input.day.toString().padStart(2, '0')}`;
}

export function getWeekdayIndex(input: CalendarDateParts): number {
  return new Date(Date.UTC(input.year, input.month - 1, input.day)).getUTCDay();
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function assertDateOnly(
  value: string,
  errorOptions: TimezoneValidationErrorOptions = {
    messageKey: 'common.errors.invalidDateOnly',
    error: 'INVALID_DATE_ONLY',
  },
): string {
  if (!isDateOnly(value)) throw new BadRequestException(errorOptions);
  return value;
}

export function isOffsetQualifiedIsoInstant(value: string): boolean {
  return (
    explicitOffsetPattern.test(value.trim()) &&
    !Number.isNaN(new Date(value).getTime())
  );
}

export function assertOffsetQualifiedIsoInstant(
  value: string,
  errorOptions: TimezoneValidationErrorOptions = {
    messageKey: 'common.errors.invalidInstant',
    error: 'INVALID_OFFSET_QUALIFIED_INSTANT',
  },
): Date {
  if (!isOffsetQualifiedIsoInstant(value)) {
    throw new BadRequestException(errorOptions);
  }
  return new Date(value);
}

export function normalizeIanaTimeZoneInput(
  input?: string | null,
  errorOptions?: TimezoneValidationErrorOptions,
): string | null | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (input === null) {
    return null;
  }

  const normalized = input.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (!isValidIanaTimeZone(normalized)) {
    throw new BadRequestException(
      errorOptions ?? {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'INVALID_TIMEZONE',
      },
    );
  }

  return normalized;
}

export function assertIanaTimeZoneInput(
  input: string | null | undefined,
  errorOptions?: TimezoneValidationErrorOptions,
): string {
  const normalized = normalizeIanaTimeZoneInput(input, errorOptions);

  if (typeof normalized !== 'string') {
    throw new BadRequestException(
      errorOptions ?? {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'INVALID_TIMEZONE',
      },
    );
  }

  return normalized;
}
