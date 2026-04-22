import { Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyMapper } from '../mappers/specialty.mapper';
import { SpecialtyRepository } from '../repositories/specialty.repository';

/**
 * Public/shared read use case for active specialties.
 * It intentionally returns only active records to keep catalog consumption safe by default.
 */
@Injectable()
export class ListSpecialtiesUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly specialtyMapper: SpecialtyMapper,
  ) {}

  async execute(input: { locale: SupportedLocale; q?: string }) {
    const specialties = await this.specialtyRepository.listActive(
      input.locale,
      input.q,
    );

    return {
      message: this.i18nService.t(
        'specialties.success.specialtiesFetched',
        input.locale,
      ),
      specialties: specialties.map((item) =>
        this.specialtyMapper.toViewModel(item, input.locale),
      ),
    };
  }
}
