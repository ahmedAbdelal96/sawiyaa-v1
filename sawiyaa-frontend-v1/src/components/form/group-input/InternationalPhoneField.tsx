"use client";

import { useMemo } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { useLocale, useTranslations } from "next-intl";
import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";
import { countryFlag, localizedCountryName } from "@/features/auth/phone/phone-countries";
import type { PhoneCountryOption } from "@/features/auth/phone/phone.types";

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0));
}

export function sanitizePhoneInput(value: string) {
  return normalizeDigits(value).replace(/[\s().-]/g, "");
}

export function InternationalPhoneField({
  countries,
  countryIso2,
  value,
  onCountryChange,
  onValueChange,
  label,
  countryLabel,
  countryPlaceholder,
  searchPlaceholder,
  phonePlaceholder,
  helperText,
  countryError,
  phoneError,
  disabled = false,
  required = false,
}: {
  countries: PhoneCountryOption[];
  countryIso2: string;
  value: string;
  onCountryChange: (value: string) => void;
  onValueChange: (value: string) => void;
  label: string;
  countryLabel: string;
  countryPlaceholder: string;
  searchPlaceholder: string;
  phonePlaceholder: string;
  helperText?: string;
  countryError?: string;
  phoneError?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const selected = countries.find((country) => country.isoCode === countryIso2) ?? countries[0];
  const options = useMemo(() => countries.map((country) => ({
    value: country.isoCode,
    label: `${countryFlag(country.isoCode)} ${localizedCountryName(country, locale)} ${country.callingCode}`,
    searchText: `${country.name} ${country.nativeName ?? ""} ${country.isoCode} ${country.callingCode}`,
  })), [countries, locale]);

  function handleValueChange(nextValue: string) {
    const sanitized = sanitizePhoneInput(nextValue);
    const international = sanitized.startsWith("+") || sanitized.startsWith("00");
    if (international) {
      const parsed = parsePhoneNumberFromString(sanitized.startsWith("00") ? `+${sanitized.slice(2)}` : sanitized);
      const detected = parsed?.country ? countries.find((country) => country.isoCode === parsed.country) : undefined;
      if (parsed && detected) {
        onCountryChange(detected.isoCode);
        onValueChange(parsed.nationalNumber);
        return;
      }
    }
    onValueChange(sanitized);
  }

  return (
    <div className="space-y-1.5">
      <Label>{label} {required ? <span className="text-error-500">*</span> : <span className="text-xs font-normal text-text-muted">({t("optional")})</span>}</Label>
      <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <span className="sr-only">{countryLabel}</span>
          <SearchableCombobox options={options} value={selected?.isoCode ?? null} onChange={onCountryChange} placeholder={countryPlaceholder} searchPlaceholder={searchPlaceholder} error={Boolean(countryError)} disabled={disabled} />
        </div>
        <div className="min-w-0">
          <InputField type="tel" inputMode="tel" autoComplete="tel-national" dir="ltr" value={value} onChange={(event) => handleValueChange(event.target.value)} placeholder={phonePlaceholder} error={Boolean(phoneError)} disabled={disabled} aria-label={label} />
        </div>
      </div>
      {phoneError ? <p className="mt-1 text-xs text-error-500" role="alert">{phoneError}</p> : null}
      {countryError ? <p className="mt-1 text-xs text-error-500" role="alert">{countryError}</p> : null}
      {helperText ? <p className="mt-1 text-xs text-text-secondary">{helperText}</p> : null}
      {selected ? <p className="sr-only">{t("phoneCountrySelected", { country: localizedCountryName(selected, locale), code: selected.callingCode })}</p> : null}
    </div>
  );
}
