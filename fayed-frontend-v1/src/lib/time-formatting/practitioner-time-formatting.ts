import {
  formatPractitionerDate,
  formatPractitionerDateTime,
  formatPractitionerTime,
  formatViewerDate,
  formatViewerDateTime,
  formatViewerTime,
  normalizeIanaTimeZone,
} from "./time-formatting";

export function formatPractitionerOrViewerDateTime(
  value: string | Date | null | undefined,
  timeZone: string | null | undefined,
  options: Parameters<typeof formatPractitionerDateTime>[2] = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (normalizedTimeZone) {
    return formatPractitionerDateTime(value, normalizedTimeZone, options);
  }

  return formatViewerDateTime(value, options);
}

export function formatPractitionerOrViewerDate(
  value: string | Date | null | undefined,
  timeZone: string | null | undefined,
  options: Parameters<typeof formatPractitionerDate>[2] = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (normalizedTimeZone) {
    return formatPractitionerDate(value, normalizedTimeZone, options);
  }

  return formatViewerDate(value, options);
}

export function formatPractitionerOrViewerTime(
  value: string | Date | null | undefined,
  timeZone: string | null | undefined,
  options: Parameters<typeof formatPractitionerTime>[2] = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (normalizedTimeZone) {
    return formatPractitionerTime(value, normalizedTimeZone, options);
  }

  return formatViewerTime(value, options);
}
