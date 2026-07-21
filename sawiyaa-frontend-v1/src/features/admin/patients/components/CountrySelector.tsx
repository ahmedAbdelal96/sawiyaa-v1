"use client";

import type { CountryListItem } from "../api/admin-patients.api";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";

interface CountrySelectorProps {
  countries: CountryListItem[];
  value: string | null;
  onChange: (country: CountryListItem) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  overflowMessage?: (count: number) => string;
  disabled?: boolean;
  error?: boolean;
}

export function CountrySelector({
  countries,
  value,
  onChange,
  placeholder = "Select a country",
  searchPlaceholder = "Search countries...",
  emptyMessage = "No countries found",
  overflowMessage = (count) => `+${count} more results — try refining your search`,
  disabled = false,
  error = false,
}: CountrySelectorProps) {
  const selectedCountry = countries.find((country) => country.isoCode === value) ?? null;

  return (
    <div>
      <SearchableCombobox
        options={countries.map((country) => ({
          value: country.isoCode,
          label: `${country.name} (${country.isoCode})`,
          description: country.nativeName ?? undefined,
        }))}
        value={selectedCountry?.isoCode ?? null}
        onChange={(countryCode) => {
          const nextCountry = countries.find((country) => country.isoCode === countryCode);
          if (nextCountry) {
            onChange(nextCountry);
          }
        }}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        disabled={disabled}
        error={error}
      />
    </div>
  );
}
