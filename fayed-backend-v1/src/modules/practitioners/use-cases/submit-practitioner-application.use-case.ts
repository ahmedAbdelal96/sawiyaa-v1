import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PractitionerApplicationStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationEligibilityPolicy } from '../policies/practitioner-application-eligibility.policy';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerLanguageRepository } from '../repositories/practitioner-language.repository';
import { PractitionerPayoutDestinationRepository } from '../repositories/practitioner-payout-destination.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { SpecialtyRepository } from '../repositories/specialty.repository';
import { PractitionerApplicationSnapshotService } from '../services/practitioner-application-snapshot.service';
import { GetPractitionerApplicationStatusUseCase } from './get-practitioner-application-status.use-case';
import { GetPractitionerProfileReadinessUseCase } from './get-practitioner-profile-readiness.use-case';
import { CreatePractitionerProfileUseCase } from './create-practitioner-profile.use-case';
import { UpdatePractitionerProfileUseCase } from './update-practitioner-profile.use-case';
import { SetPractitionerSpecialtiesUseCase } from './set-practitioner-specialties.use-case';
import { SubmitPractitionerApplicationDto } from '../dto/submit-practitioner-application.dto';

/**
 * Practitioner self-submission is allowed only when readiness and application-state policies pass.
 * This use case does not perform admin review/approval logic.
 */
@Injectable()
export class SubmitPractitionerApplicationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly createPractitionerProfileUseCase: CreatePractitionerProfileUseCase,
    private readonly updatePractitionerProfileUseCase: UpdatePractitionerProfileUseCase,
    private readonly setPractitionerSpecialtiesUseCase: SetPractitionerSpecialtiesUseCase,
    private readonly practitionerApplicationRepository: PractitionerApplicationRepository,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerUserRepository: PractitionerUserRepository,
    private readonly practitionerLanguageRepository: PractitionerLanguageRepository,
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerPayoutDestinationRepository: PractitionerPayoutDestinationRepository,
    private readonly practitionerApplicationSnapshotService: PractitionerApplicationSnapshotService,
    private readonly practitionerApplicationEligibilityPolicy: PractitionerApplicationEligibilityPolicy,
    private readonly getPractitionerProfileReadinessUseCase: GetPractitionerProfileReadinessUseCase,
    private readonly getPractitionerApplicationStatusUseCase: GetPractitionerApplicationStatusUseCase,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
    data: SubmitPractitionerApplicationDto;
  }) {
    const hasProfilePayload =
      input.data.displayName !== undefined ||
      input.data.professionalTitle !== undefined ||
      input.data.bio !== undefined ||
      input.data.countryCode !== undefined ||
      input.data.yearsOfExperience !== undefined ||
      input.data.practitionerType !== undefined ||
      input.data.practitionerGender !== undefined ||
      input.data.locale !== undefined ||
      input.data.timezone !== undefined ||
      input.data.languageCodes !== undefined ||
      input.data.payoutDestination !== undefined;

    if (hasProfilePayload) {
      await this.updatePractitionerProfileUseCase.execute({
        userId: input.userId,
        locale: input.locale,
        currentUser: input.currentUser,
        data: {
          displayName: input.data.displayName,
          professionalTitle: input.data.professionalTitle,
          bio: input.data.bio,
          countryCode: input.data.countryCode,
          yearsOfExperience: input.data.yearsOfExperience,
          practitionerType: input.data.practitionerType,
          practitionerGender: input.data.practitionerGender,
          locale: input.data.locale,
          timezone: input.data.timezone,
          languageCodes: input.data.languageCodes,
          payoutDestination: input.data.payoutDestination,
        },
      });
    }

    if (input.data.specialtySelection) {
      await this.setPractitionerSpecialtiesUseCase.execute({
        userId: input.userId,
        locale: input.locale,
        primarySpecialtyCategoryId:
          input.data.specialtySelection.primarySpecialtyCategoryId,
        specialtyIds: input.data.specialtySelection.specialtyIds,
      });
    }

    const profile = await this.createPractitionerProfileUseCase.execute(
      input.userId,
    );

    const [
      profileState,
      userState,
      languageLinks,
      specialtyLinks,
      credentials,
      payoutDestination,
    ] = await Promise.all([
      this.practitionerProfileRepository.findByUserId(input.userId),
      this.practitionerUserRepository.findProfileSeed(input.userId),
      this.practitionerLanguageRepository.listCodesByPractitionerId(profile.id),
      this.specialtyRepository.listByPractitionerId(profile.id, input.locale),
      this.practitionerCredentialRepository.listByPractitionerId(profile.id),
      this.practitionerPayoutDestinationRepository.findByPractitionerId(
        profile.id,
      ),
    ]);

    if (!profileState || !userState) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const submissionSnapshot =
      this.practitionerApplicationSnapshotService.build({
        user: userState,
        profile: {
          practitionerType: profileState.practitionerType,
          practitionerGender: profileState.practitionerGender,
          professionalTitle: profileState.professionalTitle ?? null,
          bio: profileState.bio ?? null,
          yearsOfExperience: profileState.yearsOfExperience ?? null,
          countryCode: profileState.country?.isoCode ?? null,
          primarySpecialtyCategoryId:
            profileState.primarySpecialtyCategoryId ?? null,
        },
        languageCodes: languageLinks.map((item) => item.language.code),
        specialties: specialtyLinks.map((link) => ({
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
          categoryId: link.specialty.categoryId ?? null,
        })),
        credentials: credentials.map((credential) => ({
          credentialId: credential.id,
          credentialType: credential.credentialType,
          fileUrl: credential.fileUrl,
          reviewStatus: credential.reviewStatus,
          expiresAt: credential.expiresAt,
          uploadedAt: credential.createdAt,
          reviewedAt: credential.reviewedAt ?? null,
          reviewNotes: credential.reviewNotes ?? null,
        })),
        payoutDestination: payoutDestination
          ? {
              methodType: payoutDestination.methodType,
              accountHolderName: payoutDestination.accountHolderName ?? null,
              bankName: payoutDestination.bankName ?? null,
              bankAccountNumber: payoutDestination.bankAccountNumber ?? null,
              iban: payoutDestination.iban ?? null,
              walletProvider: payoutDestination.walletProvider ?? null,
              walletIdentifier: payoutDestination.walletIdentifier ?? null,
              otherDetails: payoutDestination.otherDetails ?? null,
            }
          : null,
      });

    const [readiness, latestApplicationBeforeTx] = await Promise.all([
      this.getPractitionerProfileReadinessUseCase.evaluate({
        userId: input.userId,
        currentUser: input.currentUser,
      }),
      this.practitionerApplicationRepository.findLatestByPractitionerId(
        profile.id,
      ),
    ]);

    const eligibility = this.practitionerApplicationEligibilityPolicy.evaluate({
      readiness,
      latestApplicationStatus: latestApplicationBeforeTx?.status ?? null,
    });

    if (!eligibility.canSubmit) {
      const alreadySubmitted =
        latestApplicationBeforeTx?.status ===
          PractitionerApplicationStatus.SUBMITTED ||
        latestApplicationBeforeTx?.status ===
          PractitionerApplicationStatus.UNDER_REVIEW ||
        latestApplicationBeforeTx?.status ===
          PractitionerApplicationStatus.APPROVED;

      if (alreadySubmitted) {
        throw new ConflictException({
          messageKey: 'practitioners.errors.applicationAlreadySubmitted',
          error: 'PRACTITIONER_APPLICATION_ALREADY_SUBMITTED',
        });
      }

      throw new BadRequestException({
        messageKey: 'practitioners.errors.applicationNotEligible',
        messageParams: {
          missing: readiness.missingRequirements.join(', '),
        },
        error: 'PRACTITIONER_APPLICATION_NOT_ELIGIBLE',
      });
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const latestApplication =
        await this.practitionerApplicationRepository.findLatestByPractitionerId(
          profile.id,
          tx,
        );

      const blockedStatuses: PractitionerApplicationStatus[] = [
        PractitionerApplicationStatus.SUBMITTED,
        PractitionerApplicationStatus.UNDER_REVIEW,
        PractitionerApplicationStatus.APPROVED,
      ];

      if (
        latestApplication &&
        blockedStatuses.includes(latestApplication.status)
      ) {
        throw new ConflictException({
          messageKey: 'practitioners.errors.applicationAlreadySubmitted',
          error: 'PRACTITIONER_APPLICATION_ALREADY_SUBMITTED',
        });
      }

      const resubmittableStatuses: PractitionerApplicationStatus[] = [
        PractitionerApplicationStatus.DRAFT,
        PractitionerApplicationStatus.CHANGES_REQUESTED,
        PractitionerApplicationStatus.REJECTED,
        PractitionerApplicationStatus.ARCHIVED,
      ];

      if (
        latestApplication &&
        resubmittableStatuses.includes(latestApplication.status)
      ) {
        await this.practitionerApplicationRepository.resubmit(
          latestApplication.id,
          submissionSnapshot,
          tx,
        );
        return;
      }

      await this.practitionerApplicationRepository.createSubmitted(
        profile.id,
        submissionSnapshot,
        tx,
      );
    });

    const status = await this.getPractitionerApplicationStatusUseCase.execute({
      userId: input.userId,
      locale: input.locale,
      currentUser: input.currentUser,
    });

    return {
      message: this.i18nService.t(
        'practitioners.success.applicationSubmitted',
        input.locale,
      ),
      application: status.application,
    };
  }
}
