import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyViewModel } from '../types/specialty.types';

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
      isActive: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      category: {
        id: string;
        name: string;
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
    const localized =
      input.translations.find((item) => item.locale === locale) ??
      input.translations.find((item) => item.locale === 'en') ??
      null;

    return {
      id: input.id,
      name: localized?.title ?? null,
      slug: input.slug,
      description: localized?.description ?? null,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      category: input.category
        ? {
            id: input.category.id,
            name: input.category.name,
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
