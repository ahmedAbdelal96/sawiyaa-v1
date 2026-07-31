import { BadRequestException } from '@nestjs/common';

export const PROFESSIONAL_TITLE_VALUES = [
  'PSYCHOLOGIST',
  'PSYCHOTHERAPIST',
  'CLINICAL_PSYCHOLOGIST',
  'COUNSELING_PSYCHOLOGIST',
  'MENTAL_HEALTH_COUNSELOR',
  'FAMILY_THERAPIST',
] as const;

export type ProfessionalTitle = (typeof PROFESSIONAL_TITLE_VALUES)[number];

const LEGACY_TITLE_ALIASES: Record<string, ProfessionalTitle> = {
  psychologist: 'PSYCHOLOGIST',
  psychotherapist: 'PSYCHOTHERAPIST',
  'clinical psychologist': 'CLINICAL_PSYCHOLOGIST',
  'counseling psychologist': 'COUNSELING_PSYCHOLOGIST',
  'mental health counselor': 'MENTAL_HEALTH_COUNSELOR',
  'family and marriage therapist': 'FAMILY_THERAPIST',
  'أخصائي نفسي': 'PSYCHOLOGIST',
  'معالج نفسي': 'PSYCHOTHERAPIST',
  'أخصائي نفسي إكلينيكي': 'CLINICAL_PSYCHOLOGIST',
  'أخصائي إرشاد نفسي': 'COUNSELING_PSYCHOLOGIST',
  'مرشد صحة نفسية': 'MENTAL_HEALTH_COUNSELOR',
  'معالج أسري وزواجي': 'FAMILY_THERAPIST',
};

export function normalizeProfessionalTitle(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  if ((PROFESSIONAL_TITLE_VALUES as readonly string[]).includes(trimmed)) {
    return trimmed as ProfessionalTitle;
  }
  return LEGACY_TITLE_ALIASES[trimmed.toLowerCase()] ?? null;
}

export function assertProfessionalTitle(value: string | null | undefined, options?: { required?: boolean }) {
  if (value === null || value === undefined || value.trim() === '') {
    if (options?.required) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.professionalTitleRequired',
        error: 'PROFESSIONAL_TITLE_REQUIRED',
      });
    }
    return null;
  }

  const normalized = normalizeProfessionalTitle(value);
  if (!normalized) {
    throw new BadRequestException({
      messageKey: 'practitioners.errors.invalidProfessionalTitle',
      error: 'INVALID_PROFESSIONAL_TITLE',
      allowedValues: PROFESSIONAL_TITLE_VALUES,
    });
  }
  return normalized;
}
