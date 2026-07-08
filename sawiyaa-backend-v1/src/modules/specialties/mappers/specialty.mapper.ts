import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyViewModel } from '../types/specialty.types';

/**
 * Specialty mapper converts DB records into stable API response shape.
 * It also handles locale fallback between requested locale and english baseline.
 */
@Injectable()
export class SpecialtyMapper {
  private pickLocalizedName(
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
      ordered.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null
    );
  }

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
    const localized =
      input.translations.find((item) => item.locale === locale) ??
      input.translations.find((item) => item.locale === 'en') ??
      null;

      return {
      id: input.id,
      name:
        localized?.title ??
        this.pickLocalizedName(locale, {
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          fallback: input.slug,
        }),
      nameAr: input.nameAr ?? null,
      nameEn: input.nameEn ?? null,
      slug: input.slug,
      description: localized?.description ?? null,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      category: input.category
        ? {
            id: input.category.id,
            name:
              this.pickLocalizedName(locale, {
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
