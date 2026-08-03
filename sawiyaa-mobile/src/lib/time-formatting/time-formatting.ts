export type DateLike = string | Date | null | undefined;

export interface TimeFormattingOptions {
  locale?: string;
  fallbackText?: string;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  weekday?: Intl.DateTimeFormatOptions["weekday"];
  year?: Intl.DateTimeFormatOptions["year"];
  month?: Intl.DateTimeFormatOptions["month"];
  day?: Intl.DateTimeFormatOptions["day"];
  hour?: Intl.DateTimeFormatOptions["hour"];
  minute?: Intl.DateTimeFormatOptions["minute"];
  hourCycle?: Intl.DateTimeFormatOptions["hourCycle"];
  timeZoneName?: Intl.DateTimeFormatOptions["timeZoneName"];
}

export interface TimeZoneLabelOptions {
  locale?: string;
  fallbackText?: string;
  includeOffset?: boolean;
  referenceDate?: Date;
}

export interface TimeZoneCalendarParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  minuteOfDay: number;
  weekdayIndex: number;
}

const DEFAULT_FALLBACK = "—";
const UTC_TIME_ZONE = "UTC";
const UTC_ALIAS_TIME_ZONES = new Set(["UTC", "ETC/UTC"]);
const FIXED_OFFSET_TIME_ZONE_PATTERN =
  /^(?:[+-]\d{1,2}(?::?\d{2})?|UTC[+-]\d{1,2}(?::?\d{2})?|GMT[+-]\d{1,2}(?::?\d{2})?|Etc\/GMT[+-]\d{1,2})$/i;

let cachedIanaZones: Set<string> | null | undefined;
let authenticatedProfileTimeZone: string | null = null;
let deviceTimeZoneOverride: string | null | undefined;

function resolveLocale(locale?: string): string {
  if (!locale) {
    return "en-US";
  }

  return locale.startsWith("ar") ? "ar-EG" : locale;
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

  const supportedValuesOf = (
    Intl as unknown as {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;

  if (typeof supportedValuesOf !== "function") {
    cachedIanaZones = null;
    return cachedIanaZones;
  }

  try {
    cachedIanaZones = new Set(supportedValuesOf("timeZone"));
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
  const hasDateParts = Boolean(
    options.weekday || options.year || options.month || options.day,
  );
  const hasTimeParts = Boolean(options.hour || options.minute);
  const formatterOptions: Intl.DateTimeFormatOptions = {
    ...(hasDateParts ? {} : { dateStyle: options.dateStyle ?? "medium" }),
    ...(hasTimeParts ? {} : { timeStyle: options.timeStyle ?? "short" }),
    ...(options.weekday ? { weekday: options.weekday } : null),
    ...(options.year ? { year: options.year } : null),
    ...(options.month ? { month: options.month } : null),
    ...(options.day ? { day: options.day } : null),
    ...(options.hour ? { hour: options.hour } : null),
    ...(options.minute ? { minute: options.minute } : null),
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
  const hasDateParts = Boolean(
    options.weekday || options.year || options.month || options.day,
  );
  const formatterOptions: Intl.DateTimeFormatOptions = {
    ...(hasDateParts ? {} : { dateStyle: options.dateStyle ?? "medium" }),
    ...(options.weekday ? { weekday: options.weekday } : null),
    ...(options.year ? { year: options.year } : null),
    ...(options.month ? { month: options.month } : null),
    ...(options.day ? { day: options.day } : null),
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
  const hasTimeParts = Boolean(options.hour || options.minute);
  const formatterOptions: Intl.DateTimeFormatOptions = {
    ...(hasTimeParts ? {} : { timeStyle: options.timeStyle ?? "short" }),
    ...(options.hour ? { hour: options.hour } : null),
    ...(options.minute ? { minute: options.minute } : null),
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

function parseWeekdayIndex(value: string): number | null {
  switch (value) {
    case "Sun":
      return 0;
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return null;
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

export function resolvePatientDisplayTimeZone(
  persistedTimeZone: string | null | undefined,
  fallbackTimeZone?: string | null,
): string | null {
  return resolveEffectiveViewerTimeZone(persistedTimeZone, fallbackTimeZone);
}

export function resolveDeviceTimeZone(): string | null {
  if (deviceTimeZoneOverride !== undefined) {
    return normalizeIanaTimeZone(deviceTimeZoneOverride);
  }

  try {
    return normalizeIanaTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  } catch {
    return null;
  }
}

export function isMissingPersistedTimeZone(
  timeZone: string | null | undefined,
): boolean {
  return timeZone == null || timeZone.trim().length === 0;
}

export function resolveEffectiveViewerTimeZone(
  persistedProfileTimeZone?: string | null,
  deviceTimeZone?: string | null,
): string {
  const profile = normalizeIanaTimeZone(persistedProfileTimeZone);
  if (profile) return profile;

  const device = normalizeIanaTimeZone(
    deviceTimeZone ?? resolveDeviceTimeZone(),
  );
  return device ?? UTC_TIME_ZONE;
}

export function setMobileTimeZoneContext({
  profileTimeZone,
  deviceTimeZone,
}: {
  profileTimeZone?: string | null;
  deviceTimeZone?: string | null;
}): void {
  authenticatedProfileTimeZone = normalizeIanaTimeZone(profileTimeZone);
  deviceTimeZoneOverride =
    deviceTimeZone === undefined
      ? undefined
      : normalizeIanaTimeZone(deviceTimeZone);
}

export function getEffectiveViewerTimeZone(): string {
  return resolveEffectiveViewerTimeZone(
    authenticatedProfileTimeZone,
    deviceTimeZoneOverride,
  );
}

export function formatPatientDateTime(
  value: DateLike,
  persistedTimeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  const timeZone = resolvePatientDisplayTimeZone(persistedTimeZone);
  return timeZone
    ? formatDateTime(value, options.locale ?? "en-US", options, timeZone)
    : formatViewerDateTime(value, options);
}

// Viewer-local helpers intentionally leave the timezone implicit, so the device/runtime
// controls the display timezone for patient history and normal browsing surfaces.
export function formatViewerDateTime(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatDateTime(value, locale, options, getEffectiveViewerTimeZone());
}

export function formatViewerDate(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatDateOnly(value, locale, options, getEffectiveViewerTimeZone());
}

export function formatViewerTime(
  value: DateLike,
  options: TimeFormattingOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  return formatTimeOnly(value, locale, options, getEffectiveViewerTimeZone());
}

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

  return formatDateOnly(
    date,
    options.locale ?? "en-US",
    options,
    UTC_TIME_ZONE,
  );
}

// Practitioner-local helpers require a validated IANA timezone and never fall back
// to the device timezone when the schedule/session must follow practitioner context.
export function formatPractitionerDateTime(
  value: DateLike,
  timeZone: string | null | undefined,
  options: TimeFormattingOptions = {},
): string {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (!normalizedTimeZone) {
    return formatViewerDateTime(value, options);
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
    return formatViewerDate(value, options);
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
    return formatViewerTime(value, options);
  }

  const locale = options.locale ?? "en-US";
  return formatTimeOnly(value, locale, options, normalizedTimeZone);
}

// UTC/audit helpers pin the display timezone to UTC for technical or audit surfaces only.
// backend-state-only: these helpers format output, they must not drive join/payment unlock decisions.
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

// Wall-time helpers keep minute-of-day labels stable for recurring availability and weekly editors.
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

// Timezone labels stay display-only and never invent country assumptions when the value is invalid.
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
    // Fall through to the canonical IANA identifier below.
  }

  return normalizedTimeZone;
}

// Calendar parts extracted in a named timezone are used for schedule-day counters,
// so weekly summary logic can stay aligned with the practitioner availability timezone.
export function getDatePartsInTimeZone(
  value: DateLike,
  timeZone: string | null | undefined,
): TimeZoneCalendarParts | null {
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone);
  if (!normalizedTimeZone) {
    return null;
  }

  const date = toDate(value);
  if (!date) {
    return null;
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: normalizedTimeZone,
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const lookup = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    ) as Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

    const weekdayIndex = lookup.weekday
      ? parseWeekdayIndex(lookup.weekday)
      : null;
    const year = lookup.year ? Number(lookup.year) : NaN;
    const month = lookup.month ? Number(lookup.month) : NaN;
    const day = lookup.day ? Number(lookup.day) : NaN;
    const hour = lookup.hour ? Number(lookup.hour) : NaN;
    const minute = lookup.minute ? Number(lookup.minute) : NaN;

    if (
      weekdayIndex === null ||
      [year, month, day, hour, minute].some((part) => !Number.isFinite(part))
    ) {
      return null;
    }

    return {
      year,
      month,
      day,
      hour,
      minute,
      minuteOfDay: hour * 60 + minute,
      weekdayIndex,
    };
  } catch {
    return null;
  }
}
