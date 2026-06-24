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
