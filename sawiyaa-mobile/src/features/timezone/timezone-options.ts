import { normalizeIanaTimeZone } from "../../lib/time-formatting";

export type TimeZoneLocale = "ar" | "en";

export type TimeZoneOption = {
  value: string;
  label: string;
  region: string;
  city: string;
  searchText: string;
};

const COMMON_TIME_ZONES = [
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Amman",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
] as const;

const ALIASES: Record<string, { ar: string; en: string }> = {
  "Africa/Cairo": { ar: "القاهرة مصر", en: "Cairo Egypt" },
  "Asia/Riyadh": { ar: "الرياض السعودية", en: "Riyadh Saudi Arabia" },
  "Asia/Dubai": { ar: "دبي الإمارات", en: "Dubai United Arab Emirates" },
  "Asia/Kuwait": { ar: "الكويت الكويت", en: "Kuwait Kuwait" },
  "Asia/Amman": { ar: "عمان الأردن", en: "Amman Jordan" },
  "Europe/London": { ar: "لندن المملكة المتحدة", en: "London United Kingdom" },
  "Europe/Paris": { ar: "باريس فرنسا", en: "Paris France" },
  "America/New_York": {
    ar: "نيويورك الولايات المتحدة",
    en: "New York United States",
  },
};

let cachedIdentifiers: string[] | null = null;
const cachedOptionsByLocale: Partial<Record<TimeZoneLocale, TimeZoneOption[]>> =
  {};

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getIdentifiers(): string[] {
  if (cachedIdentifiers) return cachedIdentifiers;
  const supportedValuesOf = (
    Intl as unknown as { supportedValuesOf?: (key: "timeZone") => string[] }
  ).supportedValuesOf;
  const discovered =
    typeof supportedValuesOf === "function"
      ? supportedValuesOf("timeZone")
      : [];
  const valid = discovered
    .map((value) => normalizeIanaTimeZone(value))
    .filter((value): value is string => Boolean(value));
  cachedIdentifiers = [
    ...new Set([
      ...valid,
      ...COMMON_TIME_ZONES.map((value) => normalizeIanaTimeZone(value)).filter(
        (value): value is string => Boolean(value),
      ),
    ]),
  ].sort();
  return cachedIdentifiers;
}

function readableParts(value: string) {
  const segments = value.split("/");
  const city = segments[segments.length - 1]?.replace(/_/g, " ") ?? value;
  const region =
    segments.length > 1
      ? segments.slice(0, -1).join(" / ").replace(/_/g, " ")
      : "";
  return { city, region };
}

export function createTimeZoneOption(
  value: string,
  locale: TimeZoneLocale,
): TimeZoneOption | null {
  const normalized = normalizeIanaTimeZone(value);
  if (!normalized) return null;
  const { city, region } = readableParts(normalized);
  const alias = ALIASES[normalized]?.[locale] ?? "";
  return {
    value: normalized,
    city,
    region,
    label: region ? `${city} — ${region}` : city,
    searchText: normalizeSearch(`${normalized} ${city} ${region} ${alias}`),
  };
}

function getBaseOptions(locale: TimeZoneLocale): TimeZoneOption[] {
  const cached = cachedOptionsByLocale[locale];
  if (cached) return cached;
  const options = getIdentifiers()
    .map((value) => createTimeZoneOption(value, locale))
    .filter((option): option is TimeZoneOption => Boolean(option));
  cachedOptionsByLocale[locale] = options;
  return options;
}

export function buildTimeZoneOptions({
  locale,
  selectedTimeZone,
  detectedTimeZone,
  query = "",
}: {
  locale: TimeZoneLocale;
  selectedTimeZone?: string | null;
  detectedTimeZone?: string | null;
  query?: string;
}): TimeZoneOption[] {
  const preferred = [selectedTimeZone, detectedTimeZone, ...COMMON_TIME_ZONES]
    .map((value) => (value ? normalizeIanaTimeZone(value) : null))
    .filter((value): value is string => Boolean(value));
  const normalizedQuery = normalizeSearch(query);
  const preferredOptions = [...new Set(preferred)]
    .map((value) => createTimeZoneOption(value, locale))
    .filter((option): option is TimeZoneOption => Boolean(option));
  const preferredValues = new Set(
    preferredOptions.map((option) => option.value),
  );
  return [
    ...preferredOptions,
    ...getBaseOptions(locale).filter(
      (option) => !preferredValues.has(option.value),
    ),
  ].filter(
    (option) => !normalizedQuery || option.searchText.includes(normalizedQuery),
  );
}

export function getTimeZoneSnapshot(
  value: string | null | undefined,
  locale: TimeZoneLocale,
): string | null {
  const timeZone = value ? normalizeIanaTimeZone(value) : null;
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "shortOffset",
    }).format(new Date());
  } catch {
    return null;
  }
}

export function resetTimeZoneOptionCacheForTests() {
  cachedIdentifiers = null;
  delete cachedOptionsByLocale.ar;
  delete cachedOptionsByLocale.en;
}
