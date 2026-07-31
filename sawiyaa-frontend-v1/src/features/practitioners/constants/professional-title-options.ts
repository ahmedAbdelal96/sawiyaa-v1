import {
  getLocalizedProfessionalTitleOptions,
  PROFESSIONAL_TITLE_OPTIONS,
  type ProfessionalTitle,
} from "@/constants/reference-data";

export { PROFESSIONAL_TITLE_OPTIONS };
export type ProfessionalTitleOption = (typeof PROFESSIONAL_TITLE_OPTIONS)[number];

export { getLocalizedProfessionalTitleOptions };

export function normalizeProfessionalTitle(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const aliases: Record<string, ProfessionalTitle> = {
    psychologist: "PSYCHOLOGIST",
    psychotherapist: "PSYCHOTHERAPIST",
    "clinical psychologist": "CLINICAL_PSYCHOLOGIST",
    "counseling psychologist": "COUNSELING_PSYCHOLOGIST",
    "mental health counselor": "MENTAL_HEALTH_COUNSELOR",
    "family and marriage therapist": "FAMILY_THERAPIST",
  };

  return aliases[trimmed.toLowerCase()] ??
    (PROFESSIONAL_TITLE_OPTIONS.some((option) => option.value === trimmed) ? trimmed : "");
}
