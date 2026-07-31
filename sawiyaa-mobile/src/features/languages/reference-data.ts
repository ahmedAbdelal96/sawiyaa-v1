export const SUPPORTED_LANGUAGE_CODES = [
  "ar",
  "en",
  "fr",
  "de",
  "es",
  "tr",
  "ru",
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export function normalizeSupportedLanguageCodes(values: string[]): SupportedLanguageCode[] {
  const supported = new Set<string>(SUPPORTED_LANGUAGE_CODES);
  return [...new Set(values.map((value) => value.trim().toLowerCase()))].filter(
    (value): value is SupportedLanguageCode => supported.has(value),
  );
}

export function getLocalizedLanguageOptions(
  translate: (key: string) => string,
) {
  return SUPPORTED_LANGUAGE_CODES.map((code) => ({
    id: code,
    label: translate(`matching.question.language.${code}`),
  }));
}
