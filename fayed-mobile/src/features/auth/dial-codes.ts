export interface DialCodeOption {
  dialCode: string;
  labelAr: string;
  labelEn: string;
  countryCode: string;
}

export const DIAL_CODES: DialCodeOption[] = [
  { dialCode: "+20", labelAr: "مصر", labelEn: "Egypt", countryCode: "EG" },
  { dialCode: "+966", labelAr: "المملكة العربية السعودية", labelEn: "Saudi Arabia", countryCode: "SA" },
  { dialCode: "+971", labelAr: "الإمارات العربية المتحدة", labelEn: "UAE", countryCode: "AE" },
  { dialCode: "+965", labelAr: "الكويت", labelEn: "Kuwait", countryCode: "KW" },
  { dialCode: "+973", labelAr: "البحرين", labelEn: "Bahrain", countryCode: "BH" },
  { dialCode: "+974", labelAr: "قطر", labelEn: "Qatar", countryCode: "QA" },
  { dialCode: "+962", labelAr: "الأردن", labelEn: "Jordan", countryCode: "JO" },
  { dialCode: "+961", labelAr: "لبنان", labelEn: "Lebanon", countryCode: "LB" },
  { dialCode: "+212", labelAr: "المغرب", labelEn: "Morocco", countryCode: "MA" },
  { dialCode: "+964", labelAr: "العراق", labelEn: "Iraq", countryCode: "IQ" },
  { dialCode: "+216", labelAr: "تونس", labelEn: "Tunisia", countryCode: "TN" },
  { dialCode: "+213", labelAr: "الجزائر", labelEn: "Algeria", countryCode: "DZ" },
  { dialCode: "+249", labelAr: "السودان", labelEn: "Sudan", countryCode: "SD" },
  { dialCode: "+218", labelAr: "ليبيا", labelEn: "Libya", countryCode: "LY" },
  { dialCode: "+970", labelAr: "فلسطين", labelEn: "Palestine", countryCode: "PS" },
  { dialCode: "+1", labelAr: "الولايات المتحدة", labelEn: "United States", countryCode: "US" },
  { dialCode: "+44", labelAr: "المملكة المتحدة", labelEn: "United Kingdom", countryCode: "GB" },
];

export function getDialCodeLabel(dialCode: string, locale: string): string {
  const entry = DIAL_CODES.find((d) => d.dialCode === dialCode);
  if (!entry) return dialCode;
  return locale.startsWith("ar") ? entry.labelAr : entry.labelEn;
}
