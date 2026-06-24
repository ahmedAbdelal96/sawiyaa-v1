import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyMapper } from '../mappers/specialty.mapper';
import { SpecialtyRepository } from '../repositories/specialty.repository';

/**
 * Public slug-based read for one active specialty.
 * Slug resolution supports canonical specialty slug and localized translation slug fallback.
 */
@Injectable()
export class GetSpecialtyBySlugUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly specialtyMapper: SpecialtyMapper,
  ) {}

  async execute(input: { slug: string; locale: SupportedLocale }) {
    const specialty = await this.specialtyRepository.findActiveBySlug(
      input.slug,
      input.locale,
    );

    if (!specialty) {
      throw new NotFoundException({
        messageKey: 'specialties.errors.specialtyNotFound',
        error: 'SPECIALTY_NOT_FOUND',
      });
    }

    return {
      message: this.i18nService.t(
        'specialties.success.specialtyFetched',
        input.locale,
      ),
      specialty: this.specialtyMapper.toViewModel(specialty, input.locale),
    };
  }
}
