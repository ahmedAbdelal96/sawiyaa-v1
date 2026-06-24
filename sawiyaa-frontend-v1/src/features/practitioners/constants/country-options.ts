export type SupportedCountryCode = "EG" | "SA" | "AE" | "KW" | "JO";

export type LocalizedOption = {
  value: string;
  label: string;
};

type CountryOption = {
  code: SupportedCountryCode;
  label: {
    ar: string;
    en: string;
  };
};

export const PRACTITIONER_COUNTRY_OPTIONS: CountryOption[] = [
  { code: "EG", label: { ar: "مصر", en: "Egypt" } },
  { code: "SA", label: { ar: "السعودية", en: "Saudi Arabia" } },
  { code: "AE", label: { ar: "الإمارات", en: "United Arab Emirates" } },
  { code: "KW", label: { ar: "الكويت", en: "Kuwait" } },
  { code: "JO", label: { ar: "الأردن", en: "Jordan" } },
];

export function getLocalizedCountryOptions(locale: string): LocalizedOption[] {
  const normalized = locale === "ar" ? "ar" : "en";
  return PRACTITIONER_COUNTRY_OPTIONS.map((option) => ({
    value: option.code,
    label: option.label[normalized],
  }));
}

