const STATIC_COUNTRIES: Record<string, { ar: string; en: string }> = {
  EG: { ar: "مصر", en: "Egypt" },
  QA: { ar: "قطر", en: "Qatar" },
  KW: { ar: "الكويت", en: "Kuwait" },
  AE: { ar: "الإمارات", en: "United Arab Emirates" },
  UAE: { ar: "الإمارات", en: "United Arab Emirates" },
  SA: { ar: "السعودية", en: "Saudi Arabia" },
  JO: { ar: "الأردن", en: "Jordan" },
};

export function resolveCountryLabel(
  code: string | null | undefined,
  countries: Array<{ isoCode: string; name: string; nativeName: string | null }> | null | undefined,
  locale: string
): string {
  if (!code) return "-";
  const upperCode = code.toUpperCase().trim();

  // 1. Try static GCC/used codes first to ensure consistency for primary countries
  if (STATIC_COUNTRIES[upperCode]) {
    return locale === "ar" ? STATIC_COUNTRIES[upperCode].ar : STATIC_COUNTRIES[upperCode].en;
  }

  // 2. Try the API countries list next
  if (countries && countries.length > 0) {
    const match = countries.find((c) => c.isoCode.toUpperCase() === upperCode);
    if (match) {
      if (locale === "ar") {
        return match.nativeName || match.name || upperCode;
      } else {
        return match.name || upperCode;
      }
    }
  }

  // 3. Fallback to uppercase code
  return upperCode;
}
