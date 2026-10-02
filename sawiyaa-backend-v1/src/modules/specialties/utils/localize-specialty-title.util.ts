import { SupportedLocale } from '@common/i18n/types/locale.types';

type SpecialtyTranslationValue = {
  locale: string;
  title?: string | null;
};

type LocalizedSpecialtyTitleInput = {
  locale: SupportedLocale;
  translations?: SpecialtyTranslationValue[] | null;
  nameAr?: string | null;
  nameEn?: string | null;
  fallback?: string | null;
};

function firstNonEmpty(values: Array<string | null | undefined>) {
  return (
    values
      .find((value) => typeof value === 'string' && value.trim().length > 0)
      ?.trim() ?? null
  );
}

/**
 * Resolves the human-readable specialty title for a request locale.
 * SpecialtyTranslation is canonical; direct name fields are compatibility
 * projections/fallbacks, and the final fallback is only a legacy identifier.
 */
export function localizeSpecialtyTitle(input: LocalizedSpecialtyTitleInput) {
  const requestedTitle = input.translations?.find(
    (translation) => translation.locale === input.locale,
  )?.title;
  const englishTitle = input.translations?.find(
    (translation) => translation.locale === 'en',
  )?.title;
  const arabicTitle = input.translations?.find(
    (translation) => translation.locale === 'ar',
  )?.title;

  return input.locale === 'ar'
    ? firstNonEmpty([
        requestedTitle,
        input.nameAr,
        englishTitle,
        input.nameEn,
        input.fallback,
      ])
    : firstNonEmpty([
        requestedTitle,
        input.nameEn,
        englishTitle,
        arabicTitle,
        input.nameAr,
        input.fallback,
      ]);
}
