export interface CountryOption {
  code: string;
  labelAr: string;
  labelEn: string;
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: "EG", labelAr: "مصر", labelEn: "Egypt" },
  { code: "SA", labelAr: "المملكة العربية السعودية", labelEn: "Saudi Arabia" },
  { code: "AE", labelAr: "الإمارات العربية المتحدة", labelEn: "UAE" },
  { code: "KW", labelAr: "الكويت", labelEn: "Kuwait" },
  { code: "JO", labelAr: "الأردن", labelEn: "Jordan" },
  { code: "US", labelAr: "الولايات المتحدة", labelEn: "United States" },
  { code: "GB", labelAr: "المملكة المتحدة", labelEn: "United Kingdom" },
];

export function getCountryLabel(
  code: string | null | undefined,
  locale: string,
): string {
  if (!code) return "";
  const country = SUPPORTED_COUNTRIES.find((c) => c.code === code.toUpperCase());
  if (!country) return code.toUpperCase();
  return locale.startsWith("ar") ? country.labelAr : country.labelEn;
}
