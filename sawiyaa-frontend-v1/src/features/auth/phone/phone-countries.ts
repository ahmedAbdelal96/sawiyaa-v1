import type { PhoneCountryOption } from "./phone.types";

export const PHONE_COUNTRIES: PhoneCountryOption[] = [
  { isoCode: "EG", name: "Egypt", nativeName: "مصر", callingCode: "+20" },
  { isoCode: "SA", name: "Saudi Arabia", nativeName: "المملكة العربية السعودية", callingCode: "+966" },
  { isoCode: "AE", name: "United Arab Emirates", nativeName: "الإمارات العربية المتحدة", callingCode: "+971" },
  { isoCode: "KW", name: "Kuwait", nativeName: "الكويت", callingCode: "+965" },
  { isoCode: "QA", name: "Qatar", nativeName: "قطر", callingCode: "+974" },
  { isoCode: "JO", name: "Jordan", nativeName: "الأردن", callingCode: "+962" },
  { isoCode: "US", name: "United States", nativeName: "الولايات المتحدة", callingCode: "+1" },
  { isoCode: "GB", name: "United Kingdom", nativeName: "المملكة المتحدة", callingCode: "+44" },
];

export function countryFlag(isoCode: string) {
  return isoCode.toUpperCase().replace(/[A-Z]/g, (letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397));
}

export function localizedCountryName(country: PhoneCountryOption, locale: string) {
  return locale.startsWith("ar") ? country.nativeName || country.name : country.name;
}
