import { expect, test } from "@playwright/test";
import {
  buildCountryOptionsWithStaleSelection,
  buildPractitionerCountryOptions,
  resolvePractitionerCountryLoadState,
} from "../src/features/practitioners/utils/country-source";

test.describe("Practitioner country source contract", () => {
  test("builds options from backend countries response", () => {
    const options = buildPractitionerCountryOptions(
      [
        { id: "country-eg", isoCode: "EG", name: "Egypt", nativeName: "مصر" },
        { id: "country-sa", isoCode: "SA", name: "Saudi Arabia", nativeName: "السعودية" },
      ],
      "ar",
    );

    expect(options).toEqual([
      {
        value: "EG",
        label: "مصر (EG)",
        description: "Egypt",
        searchText: "Egypt مصر EG",
      },
      {
        value: "SA",
        label: "السعودية (SA)",
        description: "Saudi Arabia",
        searchText: "Saudi Arabia السعودية SA",
      },
    ]);
  });

  test("blocks selection when source is loading, failed, or empty", () => {
    expect(
      resolvePractitionerCountryLoadState({
        isLoading: true,
        isError: false,
        isSuccess: false,
        optionsCount: 0,
      }).countrySelectionBlocked,
    ).toBeTruthy();

    expect(
      resolvePractitionerCountryLoadState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        optionsCount: 0,
      }).countrySelectionBlocked,
    ).toBeTruthy();

    expect(
      resolvePractitionerCountryLoadState({
        isLoading: false,
        isError: false,
        isSuccess: true,
        optionsCount: 0,
      }).countrySelectionBlocked,
    ).toBeTruthy();
  });

  test("preserves stale selected country as non-canonical marker option", () => {
    const options = buildCountryOptionsWithStaleSelection(
      [{ value: "EG", label: "Egypt (EG)" }],
      "ZZ",
      "currently unavailable",
    );

    expect(options[0]).toEqual({
      value: "ZZ",
      label: "ZZ (currently unavailable)",
      searchText: "ZZ",
    });
  });
});
