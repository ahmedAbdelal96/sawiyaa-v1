import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CreatePractitionerProfileUseCase } from './create-practitioner-profile.use-case';
import { PractitionerSpecialtyRepository } from '../repositories/practitioner-specialty.repository';
import { ListPractitionerSpecialtiesUseCase } from './list-practitioner-specialties.use-case';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerSpecialtyIntegrityService } from '../services/practitioner-specialty-integrity.service';

/**
 * Sets practitioner specialties deterministically in one replace operation.
 * Validation and primary-specialty normalization happen before persistence.
 */
@Injectable()
export class SetPractitionerSpecialtiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly createPractitionerProfileUseCase: CreatePractitionerProfileUseCase,
    private readonly practitionerSpecialtyRepository: PractitionerSpecialtyRepository,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly listPractitionerSpecialtiesUseCase: ListPractitionerSpecialtiesUseCase,
    private readonly practitionerSpecialtyIntegrityService: PractitionerSpecialtyIntegrityService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    primarySpecialtyCategoryId: string;
    specialtyIds: string[];
  }) {
    const normalizedIds = Array.from(
      new Set(input.specialtyIds.map((item) => item.trim()).filter(Boolean)),
    );

    if (normalizedIds.length !== input.specialtyIds.length) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.invalidSpecialtyPayload',
        error: 'PRACTITIONER_DUPLICATE_SPECIALTY_IDS',
      });
    }

    await this.practitionerSpecialtyIntegrityService.validateSelection({
      primarySpecialtyCategoryId: input.primarySpecialtyCategoryId,
      specialtyIds: normalizedIds,
    });

    await this.prisma.$transaction(async (tx) => {
      const profile = await this.createPractitionerProfileUseCase.execute(
        input.userId,
        tx,
      );

      await this.practitionerProfileRepository.updateByUserId(
        input.userId,
        {
          primarySpecialtyCategoryId: input.primarySpecialtyCategoryId,
        },
        tx,
      );

      await this.practitionerSpecialtyRepository.replaceAll(
        profile.id,
        normalizedIds.map((specialtyId, index) => ({
          specialtyId,
          isPrimary: index === 0,
        })),
        tx,
      );
    });

    const result = await this.listPractitionerSpecialtiesUseCase.execute({
      userId: input.userId,
      locale: input.locale,
    });

    return {
      message: this.i18nService.t(
        'practitioners.success.specialtiesUpdated',
        input.locale,
      ),
      specialties: result.specialties,
    };
  }
}
