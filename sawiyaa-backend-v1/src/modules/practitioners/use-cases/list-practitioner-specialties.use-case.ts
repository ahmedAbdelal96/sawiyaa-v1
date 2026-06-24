import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyRepository } from '../repositories/specialty.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';

/**
 * Lists current practitioner's linked specialties only.
 * Specialty master data management remains out of module scope.
 */
@Injectable()
export class ListPractitionerSpecialtiesUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly specialtyRepository: SpecialtyRepository,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const profile = await this.practitionerProfileRepository.findByUserId(
      input.userId,
    );

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const links = await this.specialtyRepository.listByPractitionerId(
      profile.id,
      input.locale,
    );

    return {
      message: this.i18nService.t(
        'practitioners.success.specialtiesFetched',
        input.locale,
      ),
      specialties: links.map((link) => ({
        specialtyId: link.specialtyId,
        slug: link.specialty.slug,
        title:
          link.specialty.translations.find(
            (item) => item.locale === input.locale,
          )?.title ??
          link.specialty.translations.find((item) => item.locale === 'en')
            ?.title ??
          null,
        isPrimary: link.isPrimary,
      })),
    };
  }
}
