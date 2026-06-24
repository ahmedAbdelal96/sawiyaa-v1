import { ConflictException, Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyCategoryRepository } from '../repositories/specialty-category.repository';
import { normalizeSpecialtySlug } from '../utils/normalize-specialty-slug.util';

function buildCategoryBaseSlug(title: string) {
  const normalized = normalizeSpecialtySlug(title);
  if (normalized.length > 0) return normalized;
  return 'category';
}

/**
 * Admin create use case for primary specialty categories.
 * Category slug is generated server-side to keep admin flow simple and deterministic.
 */
@Injectable()
export class CreateSpecialtyCategoryUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyCategoryRepository: SpecialtyCategoryRepository,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    title: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const title = input.title.trim();
    const baseSlug = buildCategoryBaseSlug(title);
    let slug = baseSlug;
    let suffix = 2;

    // Keep trying deterministic suffixes to avoid slug collisions.
    while (await this.specialtyCategoryRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
      if (suffix > 5000) {
        throw new ConflictException({
          messageKey: 'specialties.errors.specialtyCategorySlugAlreadyExists',
          error: 'SPECIALTY_CATEGORY_SLUG_ALREADY_EXISTS',
        });
      }
    }

    const sortOrder =
      typeof input.sortOrder === 'number'
        ? input.sortOrder
        : await this.specialtyCategoryRepository.getNextSortOrder();

    const category = await this.specialtyCategoryRepository.create({
      slug,
      name: title,
      description: input.description?.trim() ?? null,
      sortOrder,
      isActive: input.isActive ?? true,
    });

    return {
      message: this.i18nService.t(
        'specialties.success.specialtyCategoryCreated',
        input.locale,
      ),
      category,
    };
  }
}
