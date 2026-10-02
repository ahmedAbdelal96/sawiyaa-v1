import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { UpdatePractitionerApplicationDraftDto } from '../dto/update-practitioner-application-draft.dto';
import { PractitionerSpecialtyIntegrityService } from '../services/practitioner-specialty-integrity.service';

/** Saves applicant-owned draft data without creating or mutating an operational profile. */
@Injectable()
export class UpdatePractitionerApplicationDraftUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationRepository: PractitionerApplicationRepository,
    private readonly practitionerUserRepository: PractitionerUserRepository,
    private readonly practitionerSpecialtyIntegrityService: PractitionerSpecialtyIntegrityService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    data: UpdatePractitionerApplicationDraftDto;
  }) {
    const application = await this.applicationRepository.findLatestByUserId(input.userId);
    const user = await this.practitionerUserRepository.findProfileSeed(input.userId);
    if (!application || !user) {
      throw new NotFoundException({ error: 'PRACTITIONER_APPLICATION_NOT_FOUND' });
    }
    if (
      application.status !== PractitionerApplicationStatus.DRAFT &&
      application.status !== PractitionerApplicationStatus.CHANGES_REQUESTED
    ) {
      throw new ConflictException({ error: 'PRACTITIONER_APPLICATION_LOCKED' });
    }
    if (input.data.specialtySelection) {
      await this.practitionerSpecialtyIntegrityService.validateSelection({
        primarySpecialtyCategoryId:
          input.data.specialtySelection.primarySpecialtyCategoryId,
        specialtyIds: input.data.specialtySelection.specialtyIds,
      });
    }

    const current = (application.submissionSnapshot ?? {}) as Record<string, any>;
    const currentProfile = (current.profile ?? {}) as Record<string, any>;
    const nextSnapshot: Record<string, any> = {
      ...current,
      applicant: {
        ...((current.applicant ?? {}) as Record<string, any>),
        displayName: input.data.displayName ?? current.applicant?.displayName ?? user.displayName,
        locale: input.data.locale ?? current.applicant?.locale ?? user.defaultLocale,
        timezone: input.data.timezone ?? current.applicant?.timezone ?? user.timezone,
      },
      profile: {
        ...currentProfile,
        ...(input.data.practitionerType !== undefined ? { practitionerType: input.data.practitionerType } : {}),
        ...(input.data.practitionerType !== undefined ? { practitionerTypeExplicit: true } : {}),
        ...(input.data.practitionerGender !== undefined ? { practitionerGender: input.data.practitionerGender } : {}),
        ...(input.data.professionalTitle !== undefined ? { professionalTitle: input.data.professionalTitle } : {}),
        ...(input.data.bio !== undefined ? { bio: input.data.bio } : {}),
        ...(input.data.professionalContent !== undefined ? { professionalContent: input.data.professionalContent } : {}),
        ...(input.data.primaryContentLocale !== undefined ? { primaryContentLocale: input.data.primaryContentLocale } : {}),
        ...(input.data.yearsOfExperience !== undefined ? { yearsOfExperience: input.data.yearsOfExperience } : {}),
        ...(input.data.countryCode !== undefined ? { countryCode: input.data.countryCode?.trim().toUpperCase() ?? null } : {}),
      },
      ...(input.data.languageCodes !== undefined ? { languageCodes: input.data.languageCodes } : {}),
      ...(input.data.specialtySelection !== undefined
        ? {
            specialtySelection: {
              primarySpecialtyCategoryId: input.data.specialtySelection.primarySpecialtyCategoryId,
              specialties: input.data.specialtySelection.specialtyIds.map((specialtyId, index) => ({
                specialtyId,
                isPrimary: index === 0,
              })),
            },
          }
        : {}),
    };

    delete nextSnapshot.profile.pricing;
    delete nextSnapshot.profile.instantBookingPrice30Egp;
    delete nextSnapshot.profile.instantBookingPrice30Usd;
    delete nextSnapshot.profile.instantBookingPrice60Egp;
    delete nextSnapshot.profile.instantBookingPrice60Usd;
    delete nextSnapshot.payoutDestination;

    const updated = await this.prisma.$transaction((tx: Prisma.TransactionClient) =>
      this.applicationRepository.updateSubmissionSnapshot(
        application.id,
        nextSnapshot as Prisma.InputJsonValue,
        tx,
      ),
    );

    return {
      application: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    };
  }
}
