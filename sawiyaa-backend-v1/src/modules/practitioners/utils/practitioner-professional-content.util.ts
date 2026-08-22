import {
  SUPPORTED_LOCALES,
  SupportedLocale,
} from '@common/i18n/types/locale.types';

export type PractitionerProfessionalContentValue = {
  professionalTitle?: string | null;
  bio?: string | null;
};

/**
 * Boolean search can include every currently supported authored locale. The
 * requested locale is kept first to make the policy explicit, although this
 * order never affects result ranking.
 */
export function getProfessionalContentSearchLocales(
  requestedLocale: SupportedLocale,
): SupportedLocale[] {
  return [
    requestedLocale,
    ...SUPPORTED_LOCALES.filter((locale) => locale !== requestedLocale),
  ];
}

function normalizeContentValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

/**
 * Completeness is a derived authoring/readiness concern. The storage layer
 * intentionally permits partial locale drafts and does not persist this
 * boolean.
 */
export function isProfessionalContentLocaleComplete(
  content?: PractitionerProfessionalContentValue | null,
): boolean {
  return Boolean(
    normalizeContentValue(content?.professionalTitle) &&
    normalizeContentValue(content?.bio),
  );
}

export function normalizeProfessionalContentValue(
  value?: string | null,
): string | null {
  return normalizeContentValue(value);
}
