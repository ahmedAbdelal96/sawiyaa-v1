"use client";

import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";
import { previewPhoneE164, compactPhoneInput } from "@/features/auth/utils/phone-input";

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
  savedAsLabel,
  countryError,
  phoneError,
  disabled = false,
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
  helperText: string;
  savedAsLabel: string;
  countryError?: string;
  phoneError?: string;
  disabled?: boolean;
}) {
  const selected = countries.find((item) => item.value === countryCode);
  const preview = previewPhoneE164(phone, selected?.phoneCode);
  return (
    <div className="space-y-3">
      <div>
        <Label>{countryLabel}</Label>
        <SearchableCombobox
          options={countries.map((country) => ({
            value: country.value,
            label: `${country.label} ${country.phoneCode ?? ""}`.trim(),
            searchText: country.searchText,
          }))}
          value={countryCode || null}
          onChange={onCountryChange}
          placeholder={countryPlaceholder}
          searchPlaceholder={searchPlaceholder}
          error={Boolean(countryError)}
          disabled={disabled}
        />
        {countryError ? <p className="mt-1 text-xs text-error-500">{countryError}</p> : null}
      </div>
      <div>
        <Label>{phoneLabel}</Label>
        <InputField
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          dir="ltr"
          value={phone}
          onChange={(event) => onPhoneChange(compactPhoneInput(event.target.value))}
          placeholder={phonePlaceholder}
          error={Boolean(phoneError)}
          disabled={disabled}
        />
        {phoneError ? <p className="mt-1 text-xs text-error-500">{phoneError}</p> : null}
        <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
        {preview ? <p className="mt-1 text-xs text-primary" dir="ltr">{savedAsLabel.replace("{phone}", preview)}</p> : null}
      </div>
    </div>
  );
}
