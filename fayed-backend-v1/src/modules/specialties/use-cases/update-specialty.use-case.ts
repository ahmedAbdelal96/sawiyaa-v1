import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyMapper } from '../mappers/specialty.mapper';
import { SpecialtyCategoryRepository } from '../repositories/specialty-category.repository';
import { SpecialtyRepository } from '../repositories/specialty.repository';
import { normalizeSpecialtySlug } from '../utils/normalize-specialty-slug.util';

/**
 * Admin update use case for specialties baseline data.
 * It keeps canonical slug consistency and locale translation updates in one flow.
 */
@Injectable()
export class UpdateSpecialtyUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly specialtyCategoryRepository: SpecialtyCategoryRepository,
    private readonly specialtyMapper: SpecialtyMapper,
  ) {}

  async execute(input: {
    id: string;
    locale: SupportedLocale;
    categoryId?: string;
    slug?: string;
    title?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const existing = await this.specialtyRepository.findById(input.id, input.locale);

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'specialties.errors.specialtyNotFound',
        error: 'SPECIALTY_NOT_FOUND',
      });
    }

    const normalizedSlug =
      input.slug !== undefined ? normalizeSpecialtySlug(input.slug) : undefined;

    if (normalizedSlug && normalizedSlug !== existing.slug) {
      const slugOwner = await this.specialtyRepository.findByCanonicalSlug(
        normalizedSlug,
      );
      if (slugOwner && slugOwner.id !== input.id) {
        throw new ConflictException({
          messageKey: 'specialties.errors.specialtySlugAlreadyExists',
          error: 'SPECIALTY_SLUG_ALREADY_EXISTS',
        });
      }
    }

    if (input.categoryId) {
      const category = await this.specialtyCategoryRepository.findActiveById(
        input.categoryId,
      );
      if (!category) {
        throw new BadRequestException({
          messageKey: 'specialties.errors.specialtyCategoryNotFound',
          error: 'SPECIALTY_CATEGORY_NOT_FOUND',
        });
      }
    }

    const localeTranslation = existing.translations.find(
      (item) => item.locale === input.locale,
    );
    const fallbackTitle =
      localeTranslation?.title ??
      existing.translations.find((item) => item.locale === 'en')?.title ??
      null;

    const translationNeeded =
      input.title !== undefined ||
      input.description !== undefined ||
      normalizedSlug !== undefined;

    if (translationNeeded && !input.title && !fallbackTitle) {
      throw new BadRequestException({
        messageKey: 'specialties.errors.invalidSpecialtyState',
        error: 'SPECIALTY_TRANSLATION_TITLE_REQUIRED',
      });
    }

    let updated;
    try {
      updated = await this.specialtyRepository.update(input.id, {
        locale: input.locale,
        slug: normalizedSlug,
        categoryId: input.categoryId,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        translation: translationNeeded
          ? {
              createTitle: input.title?.trim() ?? fallbackTitle ?? '',
              updateTitle:
                input.title === undefined ? undefined : input.title.trim(),
              updateDescription:
                input.description === undefined
                  ? undefined
                  : input.description?.trim() ?? null,
              translationSlug: normalizedSlug ?? existing.slug,
            }
          : undefined,
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
        'specialties.success.specialtyUpdated',
        input.locale,
      ),
      specialty: this.specialtyMapper.toViewModel(updated, input.locale),
    };
  }
}
