import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyCategoryRepository } from '../repositories/specialty-category.repository';
import { normalizeSpecialtySlug } from '../utils/normalize-specialty-slug.util';

function buildCategoryBaseSlug(nameEn: string, nameAr: string) {
  const normalized = normalizeSpecialtySlug(nameEn) || normalizeSpecialtySlug(nameAr);
  if (normalized.length > 0) return normalized;
  return 'category';
}

/**
 * Admin update use case for primary specialty categories.
 */
@Injectable()
export class UpdateSpecialtyCategoryUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyCategoryRepository: SpecialtyCategoryRepository,
  ) {}

  async execute(input: {
    id: string;
    locale: SupportedLocale;
    nameAr?: string;
    nameEn?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const existing = await this.specialtyCategoryRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'specialties.errors.specialtyCategoryNotFound',
        error: 'SPECIALTY_CATEGORY_NOT_FOUND',
      });
    }

    const nextNameAr = input.nameAr?.trim();
    const nextNameEn = input.nameEn?.trim();

    if (
      (typeof input.nameAr === 'string' && nextNameAr?.length === 0) ||
      (typeof input.nameEn === 'string' && nextNameEn?.length === 0)
    ) {
      throw new BadRequestException({
        messageKey: 'specialties.errors.invalidSpecialtyState',
        error: 'INVALID_SPECIALTY_CATEGORY_TITLE',
      });
    }

    const resolvedNameAr = nextNameAr ?? existing.nameAr ?? existing.name;
    const resolvedNameEn = nextNameEn ?? existing.nameEn ?? existing.name;

    let slugToSave: string | undefined;
    if (nextNameAr !== undefined || nextNameEn !== undefined) {
      const baseSlug = buildCategoryBaseSlug(resolvedNameEn, resolvedNameAr);
      let candidate = baseSlug;
      let suffix = 2;
      while (true) {
        const found = await this.specialtyCategoryRepository.findBySlug(candidate);
        if (!found || found.id === existing.id) break;
        candidate = `${baseSlug}-${suffix}`;
        suffix += 1;
        if (suffix > 5000) {
          throw new ConflictException({
            messageKey: 'specialties.errors.specialtyCategorySlugAlreadyExists',
            error: 'SPECIALTY_CATEGORY_SLUG_ALREADY_EXISTS',
          });
        }
      }
      slugToSave = candidate;
    }

    const category = await this.specialtyCategoryRepository.update(input.id, {
      slug: slugToSave,
      name: resolvedNameEn || resolvedNameAr,
      nameAr: resolvedNameAr,
      nameEn: resolvedNameEn,
      description: input.description,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });

    return {
      message: this.i18nService.t(
        'specialties.success.specialtyCategoryUpdated',
        input.locale,
      ),
      category,
    };
  }
}
