"use client";

import { InternationalPhoneField } from "./InternationalPhoneField";
import type { PhoneCountryOption } from "@/features/auth/phone/phone.types";
import { PHONE_COUNTRIES } from "@/features/auth/phone/phone-countries";

export type PractitionerPhoneCountry = {
  value: string;
  label: string;
  phoneCode: string | null;
  searchText?: string;
};

export function PractitionerPhoneField({
  countryCode,
  phone,
  countries,
  onCountryChange,
  onPhoneChange,
  countryLabel,
  phoneLabel,
  countryPlaceholder,
  searchPlaceholder,
  phonePlaceholder,
  helperText,
  countryError,
  phoneError,
  disabled = false,
  required = false,
}: {
  countryCode: string;
  phone: string;
  countries: PractitionerPhoneCountry[];
  onCountryChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  countryLabel: string;
  phoneLabel: string;
  countryPlaceholder: string;
  searchPlaceholder: string;
  phonePlaceholder: string;
  helperText?: string;
  countryError?: string;
  phoneError?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const normalizedCountries: PhoneCountryOption[] = countries.map((country) => {
    const found = PHONE_COUNTRIES.find((c) => c.isoCode === country.value);
    return {
      isoCode: country.value,
      name: found?.name ?? country.label.replace(/\s*\([^)]*\)\s*$/, ""),
      nativeName: found?.nativeName,
      callingCode: found?.callingCode ?? country.phoneCode ?? "",
    };
  });

  return <InternationalPhoneField countries={normalizedCountries} countryIso2={countryCode} value={phone} onCountryChange={onCountryChange} onValueChange={onPhoneChange} label={phoneLabel} countryLabel={countryLabel} countryPlaceholder={countryPlaceholder} searchPlaceholder={searchPlaceholder} phonePlaceholder={phonePlaceholder} helperText={helperText} countryError={countryError} phoneError={phoneError} disabled={disabled} required={required} />;
}
