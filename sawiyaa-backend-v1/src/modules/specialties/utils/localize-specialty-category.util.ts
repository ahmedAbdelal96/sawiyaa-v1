import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyCategoryViewModel } from '../types/specialty.types';

export function localizeSpecialtyCategory(
  category: SpecialtyCategoryViewModel,
  locale: SupportedLocale,
): SpecialtyCategoryViewModel {
  const name =
    locale === 'ar'
      ? category.nameAr ?? category.nameEn ?? category.name
      : category.nameEn ?? category.nameAr ?? category.name;

  return {
    ...category,
    name,
  };
}
