import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyViewModel } from '../types/specialty.types';
import { localizeSpecialtyCategoryName } from '../utils/localize-specialty-category.util';
import { localizeSpecialtyTitle } from '../utils/localize-specialty-title.util';

/**
 * Specialty mapper converts DB records into stable API response shape.
 * It also handles locale fallback between requested locale and english baseline.
 */
@Injectable()
export class SpecialtyMapper {
  toViewModel(
    input: {
      id: string;
      slug: string;
      nameAr?: string | null;
      nameEn?: string | null;
      isActive: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      category: {
        id: string;
        name: string;
        nameAr?: string | null;
        nameEn?: string | null;
        slug: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
      } | null;
      translations: Array<{
        locale: string;
        title: string;
        description: string | null;
      }>;
    },
    locale: SupportedLocale,
  ): SpecialtyViewModel {
    return {
      id: input.id,
      name: localizeSpecialtyTitle({
        locale,
        translations: input.translations,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        fallback: input.slug,
      }),
      nameAr: input.nameAr ?? null,
      nameEn: input.nameEn ?? null,
      slug: input.slug,
      description:
        input.translations.find((item) => item.locale === locale)?.description ??
        input.translations.find((item) => item.locale === 'en')?.description ??
        null,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      category: input.category
        ? {
            id: input.category.id,
            name:
              localizeSpecialtyCategoryName(locale, {
                nameAr: input.category.nameAr,
                nameEn: input.category.nameEn,
                fallback: input.category.name,
              }) ?? input.category.name,
            nameAr: input.category.nameAr ?? null,
            nameEn: input.category.nameEn ?? null,
            slug: input.category.slug,
            description: input.category.description,
            isActive: input.category.isActive,
            sortOrder: input.category.sortOrder,
          }
        : null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }
}
