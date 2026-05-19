import type { SupportedCountryCode } from "./country-options";

export type TimezoneOption = {
  value: string;
  countries: SupportedCountryCode[];
  label: {
    ar: string;
    en: string;
  };
};

export const PRACTITIONER_TIMEZONE_OPTIONS: TimezoneOption[] = [
  {
    value: "Africa/Cairo",
    countries: ["EG"],
    label: { ar: "القاهرة — مصر", en: "Cairo — Egypt" },
  },
  {
    value: "Asia/Riyadh",
    countries: ["SA"],
    label: { ar: "الرياض — السعودية", en: "Riyadh — Saudi Arabia" },
  },
  {
    value: "Asia/Dubai",
    countries: ["AE"],
    label: { ar: "دبي — الإمارات", en: "Dubai — United Arab Emirates" },
  },
  {
    value: "Asia/Kuwait",
    countries: ["KW"],
    label: { ar: "الكويت — الكويت", en: "Kuwait City — Kuwait" },
  },
  {
    value: "Asia/Amman",
    countries: ["JO"],
    label: { ar: "عمّان — الأردن", en: "Amman — Jordan" },
  },
];

export function getLocalizedTimezoneOptions(locale: string, countryCode?: string): Array<{ value: string; label: string }> {
  const normalizedLocale = locale === "ar" ? "ar" : "en";
  const normalizedCountry = (countryCode ?? "").trim().toUpperCase() as SupportedCountryCode | "";

  const filtered = normalizedCountry
    ? PRACTITIONER_TIMEZONE_OPTIONS.filter((option) => option.countries.includes(normalizedCountry))
    : PRACTITIONER_TIMEZONE_OPTIONS;

  return filtered.map((option) => ({
    value: option.value,
    label: option.label[normalizedLocale],
  }));
}

export function isTimezoneSupported(value: string) {
  return PRACTITIONER_TIMEZONE_OPTIONS.some((option) => option.value === value);
}

