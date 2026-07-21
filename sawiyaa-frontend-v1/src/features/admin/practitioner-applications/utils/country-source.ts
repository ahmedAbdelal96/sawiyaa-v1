export type AdminCountryItem = {
  id: string;
  isoCode: string;
  name: string;
  nativeName: string | null;
};

export type CountryLoadState = {
  countriesLoading: boolean;
  countriesLoadFailed: boolean;
  countriesEmpty: boolean;
  countrySelectionBlocked: boolean;
};

export const normalizeDirectCreateTranslationKey = (key: string) =>
  key
    .replace(/^applications\.directCreate\.validation\./, "applications.validation.")
    .replace(
      /^applications\.directCreate\.validation(CategoryRequired|SpecialtiesRequired)$/,
      "applications.validation$1",
    );

export function buildCountryOptions(countries: AdminCountryItem[]) {
  return countries.map((country) => ({
    value: country.isoCode,
    label: `${country.name} (${country.isoCode})`,
    description: country.nativeName && country.nativeName !== country.name ? country.nativeName : null,
    searchText: [country.name, country.nativeName, country.isoCode].filter(Boolean).join(" "),
  }));
}

export function resolveCountryLoadState(input: {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  optionsCount: number;
}): CountryLoadState {
  const countriesLoading = input.isLoading;
  const countriesLoadFailed = input.isError;
  const countriesEmpty = input.isSuccess && input.optionsCount === 0;
  const countrySelectionBlocked =
    countriesLoading || countriesLoadFailed || countriesEmpty;

  return {
    countriesLoading,
    countriesLoadFailed,
    countriesEmpty,
    countrySelectionBlocked,
  };
}
