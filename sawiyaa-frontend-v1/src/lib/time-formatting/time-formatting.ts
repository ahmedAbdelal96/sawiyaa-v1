export type DateLike = string | Date | null | undefined;

export interface TimeFormattingOptions {
  locale?: string;
  fallbackText?: string;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  hourCycle?: Intl.DateTimeFormatOptions["hourCycle"];
  timeZoneName?: Intl.DateTimeFormatOptions["timeZoneName"];
}

export interface TimeZoneLabelOptions {
  locale?: string;
  fallbackText?: string;
  includeOffset?: boolean;
  referenceDate?: Date;
}

const DEFAULT_FALLBACK = "—";
const UTC_TIME_ZONE = "UTC";
const UTC_ALIAS_TIME_ZONES = new Set(["UTC", "ETC/UTC"]);
const FIXED_OFFSET_TIME_ZONE_PATTERN =
  /^(?:[+-]\d{1,2}(?::?\d{2})?|UTC[+-]\d{1,2}(?::?\d{2})?|GMT[+-]\d{1,2}(?::?\d{2})?|Etc\/GMT[+-]\d{1,2})$/i;

let cachedIanaZones: Set<string> | null | undefined;

function resolveLocale(locale?: string): string {
  if (!locale) {
    return "en-US";
  }

  return locale.startsWith("ar") ? "ar-SA" : locale;
}

function getFallbackText(options?: { fallbackText?: string }): string {
  return options?.fallbackText ?? DEFAULT_FALLBACK;
}

function toDate(value: DateLike): Date | null {
  if (value == null || value === "") {
    return null;
  }

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSupportedIanaZones(): Set<string> | null {
  if (cachedIanaZones !== undefined) {
    return cachedIanaZones;
  }

  if (typeof Intl.supportedValuesOf !== "function") {
    cachedIanaZones = null;
    return cachedIanaZones;
  }

  try {
    cachedIanaZones = new Set(Intl.supportedValuesOf("timeZone"));
  } catch {
    cachedIanaZones = null;
  }

  return cachedIanaZones;
}

function canonicalizeTimeZone(timeZone: string): string | null {
  const trimmed = timeZone.trim();
  if (!trimmed) {
    return null;
  }

  if (UTC_ALIAS_TIME_ZONES.has(trimmed.toUpperCase())) {
    return UTC_TIME_ZONE;
  }

  if (FIXED_OFFSET_TIME_ZONE_PATTERN.test(trimmed)) {
    return null;
  }

  const supportedZones = getSupportedIanaZones();
  if (supportedZones?.has(trimmed)) {
    try {
      return (
        new Intl.DateTimeFormat("en-US", {
          timeZone: trimmed,
        }).resolvedOptions().timeZone ?? trimmed
      );
    } catch {
      return trimmed;
    }
  }

  try {
    const resolved = new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
    if (!resolved) {
      return null;
    }
    if (FIXED_OFFSET_TIME_ZONE_PATTERN.test(resolved)) {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}

function formatDateTime(
  value: DateLike,
  locale: string,
  options: TimeFormattingOptions = {},
  timeZone?: string,
): string {
  const date = toDate(value);
  if (!date) {
    return getFallbackText(options);
  }

  const resolvedLocale = resolveLocale(locale);
  const formatterOptions: Intl.DateTimeFormatOptions = {
    dateStyle: options.dateStyle ?? "medium",
    timeStyle: options.timeStyle ?? "short",
    ...(options.hourCycle ? { hourCycle: options.hourCycle } : null),
    ...(options.timeZoneName ? { timeZoneName: options.timeZoneName } : null),
    ...(timeZone ? { timeZone } : null),
  };

  try {
    return new Intl.DateTimeFormat(resolvedLocale, formatterOptions).format(
      date,
    );
  } catch {
    return getFallbackText(options);
  }
}

function formatDateOnly(
  value: DateLike,
  locale: string,
  options: TimeFormattingOptions = {},
  timeZone?: string,
): string {
  const date = toDate(value);
  if (!date) {
    return getFallbackText(options);
  }

  const resolvedLocale = resolveLocale(locale);
  const formatterOptions: Intl.DateTimeFormatOptions = {
    dateStyle: options.dateStyle ?? "medium",
    ...(options.timeZoneName ? { timeZoneName: options.timeZoneName } : null),
    ...(timeZone ? { timeZone } : null),
  };

  try {
    return new Intl.DateTimeFormat(resolvedLocale, formatterOptions).format(
      date,
    );
  } catch {
    return getFallbackText(options);
  }
}

function formatTimeOnly(
  value: DateLike,
  locale: string,
  options: TimeFormattingOptions = {},
  timeZone?: string,
): string {
  const date = toDate(value);
  if (!date) {
    return getFallbackText(options);
  }

  const resolvedLocale = resolveLocale(locale);
  const formatterOptions: Intl.DateTimeFormatOptions = {
    timeStyle: options.timeStyle ?? "short",
    ...(options.hourCycle ? { hourCycle: options.hourCycle } : null),
    ...(options.timeZoneName ? { timeZoneName: options.timeZoneName } : null),
    ...(timeZone ? { timeZone } : null),
  };

  try {
    return new Intl.DateTimeFormat(resolvedLocale, formatterOptions).format(
      date,
    );
  } catch {
    return getFallbackText(options);
  }
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  return normalizeIanaTimeZone(timeZone) !== null;
}

export function normalizeIanaTimeZone(
  timeZone: string | null | undefined,
): string | null {
  if (timeZone == null) {
    return null;
  }

  return canonicalizeTimeZone(timeZone);
}

function resolveBrowserTimeZone(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return normalizeIanaTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  } catch {
    return null;
  }
}

/**
 * Resolves the only timezone that Web display code may use for a viewer.
 * Profile data wins; browser data is an unauthenticated fallback; UTC keeps
 * SSR and malformed-profile rendering deterministic.
 */
export function resolveEffectiveViewerTimeZone(
  persistedTimeZone?: string | null,
  browserTimeZone?: string | null,
): string {
  const persisted = normalizeIanaTimeZone(persistedTimeZone);
  if (persisted) return persisted;

  const fallback =
    normalizeIanaTimeZone(browserTimeZone) ?? resolveBrowserTimeZone();
  if (fallback) return fallback;

  return UTC_TIME_ZONE;
}

export function resolvePatientDisplayTimeZone(
  persistedTimeZone: string | null | undefined,
  fallbackTimeZone?: string | null,
): string {
  return resolveEffectiveViewerTimeZone(persistedTimeZone, fallbackTimeZone);
}

export function formatPatientDateTime(
  value: DateLike,
  persistedTimeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  const timeZone = resolvePatientDisplayTimeZone(persistedTimeZone);
  return formatDateTime(value, options.locale ?? "en-US", options, timeZone);
}

export function formatEffectiveViewerDateTime(
  value: DateLike,
  persistedTimeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  return formatDateTime(
    value,
    options.locale ?? "en-US",
    options,
    resolveEffectiveViewerTimeZone(persistedTimeZone),
  );
}

export function formatEffectiveViewerDate(
  value: DateLike,
  persistedTimeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  return formatDateOnly(
    value,
    options.locale ?? "en-US",
    options,
    resolveEffectiveViewerTimeZone(persistedTimeZone),
  );
}

export function formatEffectiveViewerTime(
  value: DateLike,
  persistedTimeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  return formatTimeOnly(
    value,
    options.locale ?? "en-US",
    options,
    resolveEffectiveViewerTimeZone(persistedTimeZone),
  );
}

// Viewer helpers always select the canonical effective timezone. They never
// depend on the runtime's implicit DateTimeFormat timezone.
export function formatViewerDateTime(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatDateTime(
    value,
    locale,
    options,
    resolveEffectiveViewerTimeZone(),
  );
}

export function formatViewerDate(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatDateOnly(
    value,
    locale,
    options,
    resolveEffectiveViewerTimeZone(),
  );
}

export function formatViewerTime(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatTimeOnly(
    value,
    locale,
    options,
    resolveEffectiveViewerTimeZone(),
  );
}

/** Formats a date-only API value without allowing a timezone shift. */
export function formatCalendarDate(
  value: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getFallbackText(options);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return getFallbackText(options);
  }

  const locale = options.locale ?? "en-US";
  return formatDateOnly(date, locale, options, UTC_TIME_ZONE);
}

// Practitioner-local helpers require a validated IANA timezone and never fall back
// to the browser timezone when a named practitioner timezone is required.
export function formatPractitionerDateTime(
  value: DateLike,
  timeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (!normalizedTimeZone) {
    return getFallbackText(options);
  }

  const locale = options.locale ?? "en-US";
  return formatDateTime(value, locale, options, normalizedTimeZone);
}

export function formatPractitionerDate(
  value: DateLike,
  timeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (!normalizedTimeZone) {
    return getFallbackText(options);
  }

  const locale = options.locale ?? "en-US";
  return formatDateOnly(value, locale, options, normalizedTimeZone);
}

export function formatPractitionerTime(
  value: DateLike,
  timeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (!normalizedTimeZone) {
    return getFallbackText(options);
  }

  const locale = options.locale ?? "en-US";
  return formatTimeOnly(value, locale, options, normalizedTimeZone);
}

// UTC/audit helpers always pin the display timezone to UTC for operational or audit surfaces.
export function formatUtcAuditDateTime(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatDateTime(value, locale, options, UTC_TIME_ZONE);
}

export function formatUtcAuditDate(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatDateOnly(value, locale, options, UTC_TIME_ZONE);
}

export function formatUtcAuditTime(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatTimeOnly(value, locale, options, UTC_TIME_ZONE);
}

// Wall-time helpers keep minute-of-day labels stable for weekly schedule editors and
// recurring availability inputs.
export function formatMinuteOfDay(
  minuteOfDay: number,
  options: Omit<TimeFormattingOptions, "timeZoneName"> = {},
): string {
  if (
    !Number.isInteger(minuteOfDay) ||
    minuteOfDay < 0 ||
    minuteOfDay >= 24 * 60
  ) {
    return getFallbackText(options);
  }

  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const date = new Date(Date.UTC(1970, 0, 1, hours, minutes));

  try {
    return new Intl.DateTimeFormat(resolveLocale(options.locale), {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: options.hourCycle ?? "h23",
      timeZone: UTC_TIME_ZONE,
    }).format(date);
  } catch {
    return getFallbackText(options);
  }
}

export function formatWallTimeRange(
  startMinuteOfDay: number,
  endMinuteOfDay: number,
  options: Omit<TimeFormattingOptions, "timeZoneName"> = {},
): string {
  if (
    !Number.isInteger(startMinuteOfDay) ||
    !Number.isInteger(endMinuteOfDay) ||
    startMinuteOfDay < 0 ||
    endMinuteOfDay < 0 ||
    startMinuteOfDay >= 24 * 60 ||
    endMinuteOfDay >= 24 * 60 ||
    endMinuteOfDay < startMinuteOfDay
  ) {
    return getFallbackText(options);
  }

  return `${formatMinuteOfDay(startMinuteOfDay, options)} - ${formatMinuteOfDay(endMinuteOfDay, options)}`;
}

// Optional timezone labels remain safe for display-only contexts and never invent
// country-based assumptions when the timezone is invalid or missing.
export function formatTimeZoneLabel(
  timeZone: string | null | undefined,
  options: TimeZoneLabelOptions = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (!normalizedTimeZone) {
    return options.fallbackText ?? DEFAULT_FALLBACK;
  }

  if (normalizedTimeZone === UTC_TIME_ZONE) {
    return UTC_TIME_ZONE;
  }

  if (options.includeOffset === false) {
    return normalizedTimeZone;
  }

  const referenceDate =
    options.referenceDate ?? new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
  const resolvedLocale = resolveLocale(options.locale);

  try {
    const parts = new Intl.DateTimeFormat(resolvedLocale, {
      timeZone: normalizedTimeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(referenceDate);
    const offsetLabel = parts
      .find((part) => part.type === "timeZoneName")
      ?.value?.trim();
    if (offsetLabel) {
      return `${normalizedTimeZone} (${offsetLabel})`;
    }
  } catch {
    // Fall back to the canonical IANA identifier below.
  }

  return normalizedTimeZone;
}
