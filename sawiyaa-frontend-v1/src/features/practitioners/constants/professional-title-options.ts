export type ProfessionalTitleOption = {
  value: string;
  label: {
    ar: string;
    en: string;
  };
};

export const PROFESSIONAL_TITLE_OPTIONS: ProfessionalTitleOption[] = [
  { value: "Psychologist", label: { ar: "أخصائي نفسي", en: "Psychologist" } },
  { value: "Psychotherapist", label: { ar: "معالج نفسي", en: "Psychotherapist" } },
  {
    value: "Mental Health Consultant",
    label: { ar: "استشاري نفسي", en: "Mental Health Consultant" },
  },
  { value: "Family Counselor", label: { ar: "أخصائي إرشاد أسري", en: "Family Counselor" } },
  { value: "Behavioral Specialist", label: { ar: "أخصائي تعديل سلوك", en: "Behavioral Specialist" } },
  { value: "Speech Therapist", label: { ar: "أخصائي تخاطب", en: "Speech Therapist" } },
  { value: "Nutrition Specialist", label: { ar: "أخصائي تغذية", en: "Nutrition Specialist" } },
  { value: "Life Coach", label: { ar: "كوتش حياة", en: "Life Coach" } },
];

export function getLocalizedProfessionalTitleOptions(locale: string): Array<{ value: string; label: string }> {
  const normalized = locale === "ar" ? "ar" : "en";
  return PROFESSIONAL_TITLE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label[normalized],
  }));
}

export function normalizeProfessionalTitle(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();

  const matched = PROFESSIONAL_TITLE_OPTIONS.find(
    (option) =>
      option.value.toLowerCase() === lowered ||
      option.label.en.toLowerCase() === lowered ||
      option.label.ar.toLowerCase() === lowered,
  );

  return matched?.value ?? "";
}

