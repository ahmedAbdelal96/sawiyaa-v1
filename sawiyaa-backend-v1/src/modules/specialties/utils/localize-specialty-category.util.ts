import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyCategoryViewModel } from '../types/specialty.types';

export function localizeSpecialtyCategoryName(
  locale: SupportedLocale,
  values: {
    nameAr?: string | null;
    nameEn?: string | null;
    fallback?: string | null;
  },
) {
  const ordered =
    locale === 'ar'
      ? [values.nameAr, values.nameEn, values.fallback]
      : [values.nameEn, values.nameAr, values.fallback];

  return (
    ordered
      .find((value) => typeof value === 'string' && value.trim().length > 0)
      ?.trim() ?? null
  );
}

export function localizeSpecialtyCategory(
  category: SpecialtyCategoryViewModel,
  locale: SupportedLocale,
): SpecialtyCategoryViewModel {
  const name =
    localizeSpecialtyCategoryName(locale, {
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      fallback: category.name,
    }) ?? category.name;

  return {
    ...category,
    name,
  };
}
