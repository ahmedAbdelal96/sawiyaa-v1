export type PractitionerCountryItem = {
  id: string;
  isoCode: string;
  name: string;
  nativeName: string | null;
};

export type PractitionerCountryLoadState = {
  countriesLoading: boolean;
  countriesLoadFailed: boolean;
  countriesEmpty: boolean;
  countrySelectionBlocked: boolean;
};

export function buildPractitionerCountryOptions(
  countries: PractitionerCountryItem[],
  locale: string,
) {
  return countries.map((country) => ({
    value: country.isoCode,
    label: `${locale === "ar" ? country.nativeName || country.name : country.name} (${country.isoCode})`,
    description:
      locale === "ar"
        ? country.name !== country.nativeName
          ? country.name
          : null
        : country.nativeName && country.nativeName !== country.name
          ? country.nativeName
          : null,
    searchText: [country.name, country.nativeName, country.isoCode].filter(Boolean).join(" "),
  }));
}

export function resolvePractitionerCountryLoadState(input: {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  optionsCount: number;
}): PractitionerCountryLoadState {
  const countriesLoading = input.isLoading;
  const countriesLoadFailed = input.isError;
  const countriesEmpty = input.isSuccess && input.optionsCount === 0;

  return {
    countriesLoading,
    countriesLoadFailed,
    countriesEmpty,
    countrySelectionBlocked:
      countriesLoading || countriesLoadFailed || countriesEmpty,
  };
}

export function buildCountryOptionsWithStaleSelection(
  options: Array<{ value: string; label: string; description?: string | null; searchText?: string | null }>,
  selectedValue: string,
  staleLabel: string,
) {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) {
    return options;
  }

  return [
    {
      value: selectedValue,
      label: `${selectedValue} (${staleLabel})`,
      searchText: selectedValue,
    },
    ...options,
  ];
}
