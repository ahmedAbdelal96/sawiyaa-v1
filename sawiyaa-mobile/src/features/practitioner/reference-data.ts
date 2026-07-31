export const PROFESSIONAL_TITLE_OPTIONS = [
  { value: "PSYCHOLOGIST", ar: "\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a", en: "Psychologist" },
  { value: "PSYCHOTHERAPIST", ar: "\u0645\u0639\u0627\u0644\u062c \u0646\u0641\u0633\u064a", en: "Psychotherapist" },
  { value: "CLINICAL_PSYCHOLOGIST", ar: "\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a \u0625\u0643\u0644\u064a\u0646\u064a\u0643\u064a", en: "Clinical Psychologist" },
  { value: "COUNSELING_PSYCHOLOGIST", ar: "\u0623\u062e\u0635\u0627\u0626\u064a \u0625\u0631\u0634\u0627\u062f \u0646\u0641\u0633\u064a", en: "Counseling Psychologist" },
  { value: "MENTAL_HEALTH_COUNSELOR", ar: "\u0645\u0631\u0634\u062f \u0635\u062d\u0629 \u0646\u0641\u0633\u064a\u0629", en: "Mental Health Counselor" },
  { value: "FAMILY_THERAPIST", ar: "\u0645\u0639\u0627\u0644\u062c \u0623\u0633\u0631\u064a \u0648\u0632\u0648\u0627\u062c\u064a", en: "Family and Marriage Therapist" },
] as const;

const PROFESSIONAL_TITLE_ALIASES: Record<string, string> = {
  Psychologist: "PSYCHOLOGIST",
  Psychotherapist: "PSYCHOTHERAPIST",
  "Clinical psychologist": "CLINICAL_PSYCHOLOGIST",
  "Counseling psychologist": "COUNSELING_PSYCHOLOGIST",
  "Mental health counselor": "MENTAL_HEALTH_COUNSELOR",
  "Family counselor": "FAMILY_THERAPIST",
  "Family and Marriage Therapist": "FAMILY_THERAPIST",
  "\u0627\u062e\u0635\u0627\u0626\u064a \u0627\u0643\u0644\u064a\u0646\u064a\u0643\u064a": "CLINICAL_PSYCHOLOGIST",
};

export function getProfessionalTitleLabel(value: string | null | undefined, isArabic: boolean) {
  const raw = value?.trim() ?? "";
  const canonical = PROFESSIONAL_TITLE_OPTIONS.some((item) => item.value === raw)
    ? raw
    : PROFESSIONAL_TITLE_ALIASES[raw];
  const option = PROFESSIONAL_TITLE_OPTIONS.find((item) => item.value === canonical);
  return option ? (isArabic ? option.ar : option.en) : raw;
}
