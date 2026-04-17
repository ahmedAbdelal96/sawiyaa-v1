import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyMapper } from '../mappers/specialty.mapper';
import { SpecialtyRepository } from '../repositories/specialty.repository';

/**
 * Admin status toggle use case for specialty activation.
 * It prevents no-op toggles and returns a normalized specialty response after update.
 * Deactivation here is catalog-level visibility control only; it does not mutate
 * existing practitioner-specialty links.
 */
@Injectable()
export class ToggleSpecialtyStatusUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly specialtyMapper: SpecialtyMapper,
  ) {}

  async execute(input: { id: string; isActive: boolean; locale: SupportedLocale }) {
    const existing = await this.specialtyRepository.findById(input.id, input.locale);

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'specialties.errors.specialtyNotFound',
        error: 'SPECIALTY_NOT_FOUND',
      });
    }

    if (existing.isActive === input.isActive) {
      throw new BadRequestException({
        messageKey: input.isActive
          ? 'specialties.errors.specialtyAlreadyActive'
          : 'specialties.errors.specialtyAlreadyInactive',
        error: input.isActive
          ? 'SPECIALTY_ALREADY_ACTIVE'
          : 'SPECIALTY_ALREADY_INACTIVE',
      });
    }

    const updated = await this.specialtyRepository.toggleStatus(
      input.id,
      input.isActive,
      input.locale,
    );

    return {
      message: this.i18nService.t(
        'specialties.success.specialtyStatusUpdated',
        input.locale,
      ),
      specialty: this.specialtyMapper.toViewModel(updated, input.locale),
    };
  }
}
