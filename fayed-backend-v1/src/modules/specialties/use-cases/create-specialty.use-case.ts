import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyMapper } from '../mappers/specialty.mapper';
import { SpecialtyCategoryRepository } from '../repositories/specialty-category.repository';
import { SpecialtyRepository } from '../repositories/specialty.repository';
import { normalizeSpecialtySlug } from '../utils/normalize-specialty-slug.util';

/**
 * Admin create use case for practitioner specialties catalog.
 * It enforces canonical slug uniqueness and writes the locale-specific translation baseline.
 */
@Injectable()
export class CreateSpecialtyUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly specialtyCategoryRepository: SpecialtyCategoryRepository,
    private readonly specialtyMapper: SpecialtyMapper,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    categoryId: string;
    slug: string;
    title: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const category = await this.specialtyCategoryRepository.findActiveById(
      input.categoryId,
    );
    if (!category) {
      throw new BadRequestException({
        messageKey: 'specialties.errors.specialtyCategoryNotFound',
        error: 'SPECIALTY_CATEGORY_NOT_FOUND',
      });
    }

    const normalizedSlug = normalizeSpecialtySlug(input.slug);

    const existing = await this.specialtyRepository.findByCanonicalSlug(
      normalizedSlug,
    );

    if (existing) {
      throw new ConflictException({
        messageKey: 'specialties.errors.specialtySlugAlreadyExists',
        error: 'SPECIALTY_SLUG_ALREADY_EXISTS',
      });
    }

    let created;
    try {
      created = await this.specialtyRepository.create({
        slug: normalizedSlug,
        categoryId: input.categoryId,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        locale: input.locale,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({
          messageKey: 'specialties.errors.specialtySlugAlreadyExists',
          error: 'SPECIALTY_SLUG_ALREADY_EXISTS',
        });
      }
      throw error;
    }

    return {
      message: this.i18nService.t(
        'specialties.success.specialtyCreated',
        input.locale,
      ),
      specialty: this.specialtyMapper.toViewModel(created, input.locale),
    };
  }
}
