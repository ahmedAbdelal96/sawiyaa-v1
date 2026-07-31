export const SUPPORTED_COUNTRY_CODES = ["eg", "sa", "ae", "kw", "jo"] as const;

export const PROFESSIONAL_TITLE_OPTIONS = [
  { value: "PSYCHOLOGIST", label: { ar: "\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a", en: "Psychologist" } },
  { value: "PSYCHOTHERAPIST", label: { ar: "\u0645\u0639\u0627\u0644\u062c \u0646\u0641\u0633\u064a", en: "Psychotherapist" } },
  { value: "CLINICAL_PSYCHOLOGIST", label: { ar: "\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a \u0625\u0643\u0644\u064a\u0646\u064a\u0643\u064a", en: "Clinical Psychologist" } },
  { value: "COUNSELING_PSYCHOLOGIST", label: { ar: "\u0623\u062e\u0635\u0627\u0626\u064a \u0625\u0631\u0634\u0627\u062f \u0646\u0641\u0633\u064a", en: "Counseling Psychologist" } },
  { value: "MENTAL_HEALTH_COUNSELOR", label: { ar: "\u0645\u0631\u0634\u062f \u0635\u062d\u0629 \u0646\u0641\u0633\u064a\u0629", en: "Mental Health Counselor" } },
  { value: "FAMILY_THERAPIST", label: { ar: "\u0645\u0639\u0627\u0644\u062c \u0623\u0633\u0631\u064a \u0648\u0632\u0648\u0627\u062c\u064a", en: "Family and Marriage Therapist" } },
] as const;

export type ProfessionalTitle = (typeof PROFESSIONAL_TITLE_OPTIONS)[number]["value"];

const PROFESSIONAL_TITLE_ALIASES: Record<string, ProfessionalTitle> = {
  Psychologist: "PSYCHOLOGIST",
  Psychotherapist: "PSYCHOTHERAPIST",
  "Clinical psychologist": "CLINICAL_PSYCHOLOGIST",
  "Counseling psychologist": "COUNSELING_PSYCHOLOGIST",
  "Mental health counselor": "MENTAL_HEALTH_COUNSELOR",
  "Family counselor": "FAMILY_THERAPIST",
  "Family and Marriage Therapist": "FAMILY_THERAPIST",
  "\u0627\u062e\u0635\u0627\u0626\u064a \u0627\u0643\u0644\u064a\u0646\u064a\u0643\u064a": "CLINICAL_PSYCHOLOGIST",
};

function getCanonicalProfessionalTitle(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  if (PROFESSIONAL_TITLE_OPTIONS.some((option) => option.value === raw)) {
    return raw as ProfessionalTitle;
  }
  return PROFESSIONAL_TITLE_ALIASES[raw] ?? null;
}

export function getLocalizedProfessionalTitleOptions(locale: string) {
  const language = locale.startsWith("ar") ? "ar" : "en";
  return PROFESSIONAL_TITLE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label[language],
  }));
}

export function getProfessionalTitleLabel(value: string | null | undefined, locale: string) {
  const raw = value?.trim() ?? "";
  const canonical = getCanonicalProfessionalTitle(raw);
  const option = PROFESSIONAL_TITLE_OPTIONS.find((item) => item.value === canonical);
  if (option) return locale.startsWith("ar") ? option.label.ar : option.label.en;
  return raw;
}

export const SUPPORTED_LANGUAGE_CODES = ["ar", "en", "fr", "de", "es", "tr", "ru"] as const;

export const SUPPORTED_COUNTRY_CODE_OPTIONS = SUPPORTED_COUNTRY_CODES.map((code) => ({
  value: code.toUpperCase(),
  label: code.toUpperCase(),
}));

type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

type LanguageLabels = Record<
  SupportedLanguageCode,
  {
    ar: string;
    en: string;
  }
>;

const LANGUAGE_LABELS: LanguageLabels = {
  ar: { ar: "العربية", en: "Arabic" },
  en: { ar: "الإنجليزية", en: "English" },
  fr: { ar: "الفرنسية", en: "French" },
  de: { ar: "الألمانية", en: "German" },
  es: { ar: "الإسبانية", en: "Spanish" },
  tr: { ar: "التركية", en: "Turkish" },
  ru: { ar: "الروسية", en: "Russian" },
};

export const SUPPORTED_LANGUAGE_CODE_OPTIONS = SUPPORTED_LANGUAGE_CODES.map((code) => ({
  value: code,
  label: LANGUAGE_LABELS[code].en,
}));

export function getLocalizedLanguageLabel(code: string, locale: string): string {
  const normalized = code.trim().toLowerCase() as SupportedLanguageCode;
  const label = LANGUAGE_LABELS[normalized];
  if (!label) return code;
  return locale.startsWith("ar") ? label.ar : label.en;
}

export function getLocalizedLanguageOptions(locale: string) {
  return SUPPORTED_LANGUAGE_CODES.map((code) => ({
    value: code,
    text: getLocalizedLanguageLabel(code, locale),
  }));
}

export function normalizeSupportedLanguageCodes(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(SUPPORTED_LANGUAGE_CODES);
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value): value is SupportedLanguageCode => Boolean(value) && allowed.has(value as SupportedLanguageCode)),
    ),
  );
}
