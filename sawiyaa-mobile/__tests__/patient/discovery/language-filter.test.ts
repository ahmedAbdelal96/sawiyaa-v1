import {
  getLocalizedLanguageOptions,
  normalizeSupportedLanguageCodes,
  SUPPORTED_LANGUAGE_CODES,
} from "../../../src/features/languages/reference-data";
import { toPublicPractitionerQueryParams } from "../../../src/features/patient/discovery/query";

describe("mobile practitioner discovery language filter", () => {
  it("exposes all seven canonical languages with localized labels", () => {
    expect(SUPPORTED_LANGUAGE_CODES).toEqual(["ar", "en", "fr", "de", "es", "tr", "ru"]);
    expect(getLocalizedLanguageOptions((key) => `ar:${key}`)).toHaveLength(7);
    expect(getLocalizedLanguageOptions((key) => `ar:${key}`)[0]).toEqual({
      id: "ar",
      label: "ar:matching.question.language.ar",
    });
  });

  it("normalizes multi-selection and sends the backend languageCodes contract", () => {
    const selected = normalizeSupportedLanguageCodes([" ar ", "en", "ar", "unsupported"]);
    expect(selected).toEqual(["ar", "en"]);
    expect(
      toPublicPractitionerQueryParams({ languageCodes: selected }),
    ).toMatchObject({ languageCodes: "ar,en" });
  });

  it("clears the language filter without leaving a legacy value", () => {
    expect(
      toPublicPractitionerQueryParams({ languageCodes: [] }),
    ).toMatchObject({ languageCodes: undefined });
  });
});
