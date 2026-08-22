import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PractitionerApplicationStatus,
  Prisma,
  SecurityAuditOutcome,
} from '@prisma/client';
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
import { SubmitPractitionerApplicationDto } from '../dto/submit-practitioner-application.dto';
import { normalizeIanaTimeZoneInput } from '@common/utils/timezone.util';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { PractitionerPayoutDestinationValidationService } from '../services/practitioner-payout-destination-validation.service';
import { PractitionerRequiredDocumentsService } from '../services/practitioner-required-documents.service';
import { normalizeProfessionalTitle } from '../constants/professional-title.constants';
import { PractitionerReviewCaseService } from '../services/practitioner-review-case.service';
import { PractitionerProfessionalContentRepository } from '../repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentAuthoringService } from '../services/practitioner-professional-content-authoring.service';
import { PractitionerSpecialtyIntegrityService } from '../services/practitioner-specialty-integrity.service';

/**
 * Practitioner self-submission is review-gated and snapshot-based.
 * It records the requested state without mutating live approved profile truth directly.
 */
@Injectable()
export class SubmitPractitionerApplicationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly createPractitionerProfileUseCase: CreatePractitionerProfileUseCase,
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
    private readonly practitionerPayoutDestinationValidationService: PractitionerPayoutDestinationValidationService,
    private readonly practitionerReviewCaseService: PractitionerReviewCaseService,
    private readonly practitionerSpecialtyIntegrityService: PractitionerSpecialtyIntegrityService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
    @Optional()
    private readonly professionalContentRepository?: PractitionerProfessionalContentRepository,
    @Optional()
    private readonly professionalContentAuthoringService?: PractitionerProfessionalContentAuthoringService,
  ) {}

  private readonly practitionerRequiredDocumentsService =
    new PractitionerRequiredDocumentsService();

  private assertRequiredDocumentsComplete(
    records: Array<{
      credentialType: string;
      reviewStatus: string;
      expiresAt: Date | null;
      fileUrl: string;
    }>,
    countryCode?: string | null,
  ) {
    const result = this.practitionerRequiredDocumentsService.evaluate(records, {
      countryCode,
    });
    if (result.complete) return;
    throw new UnprocessableEntityException({
      code: 'PRACTITIONER_REQUIRED_DOCUMENTS_INCOMPLETE',
      error: 'PRACTITIONER_REQUIRED_DOCUMENTS_INCOMPLETE',
      missingRequirements: result.missingRequirements,
      missingDocumentTypes: result.missingDocumentTypes,
    });
  }

  private async submitApplicationOwned(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
    data: SubmitPractitionerApplicationDto;
  }) {
    const current = await this.practitionerApplicationRepository.findLatestByUserId(input.userId);
    const user = await this.practitionerUserRepository.findProfileSeed(input.userId);
    if (!current || !user) {
      throw new BadRequestException({ error: 'PRACTITIONER_APPLICATION_NOT_FOUND' });
    }
    const currentSnapshot = (current.submissionSnapshot ?? {}) as Record<string, any>;
    const currentProfile = (currentSnapshot.profile ?? {}) as Record<string, any>;
    const currentSpecialties = (currentSnapshot.specialtySelection ?? {}) as Record<string, any>;
    const mergedProfile = {
      ...currentProfile,
      practitionerType: input.data.practitionerType ?? currentProfile.practitionerType ?? 'OTHER',
      practitionerTypeExplicit:
        input.data.practitionerType !== undefined
          ? true
          : currentProfile.practitionerTypeExplicit === true,
      practitionerGender: input.data.practitionerGender !== undefined ? input.data.practitionerGender : currentProfile.practitionerGender ?? null,
      professionalTitle: input.data.professionalTitle !== undefined ? input.data.professionalTitle : currentProfile.professionalTitle ?? null,
      bio: input.data.bio !== undefined ? input.data.bio : currentProfile.bio ?? null,
      yearsOfExperience: input.data.yearsOfExperience !== undefined ? input.data.yearsOfExperience : currentProfile.yearsOfExperience ?? null,
      countryCode: input.data.countryCode !== undefined ? input.data.countryCode?.trim().toUpperCase() ?? null : currentProfile.countryCode ?? null,
      primaryContentLocale: input.data.primaryContentLocale !== undefined ? input.data.primaryContentLocale : currentProfile.primaryContentLocale ?? null,
      professionalContent: input.data.professionalContent !== undefined ? input.data.professionalContent : currentProfile.professionalContent ?? null,
    };
    const mergedSpecialtySelection = input.data.specialtySelection
      ? {
          primarySpecialtyCategoryId: input.data.specialtySelection.primarySpecialtyCategoryId,
          specialties: input.data.specialtySelection.specialtyIds.map((specialtyId, index) => ({ specialtyId, isPrimary: index === 0 })),
        }
      : currentSpecialties;
    const specialtyIds = Array.isArray(mergedSpecialtySelection.specialtyIds)
      ? mergedSpecialtySelection.specialtyIds
      : Array.isArray(mergedSpecialtySelection.specialties)
        ? mergedSpecialtySelection.specialties
            .map((item: { specialtyId?: unknown }) => item.specialtyId)
            .filter((id: unknown): id is string => typeof id === 'string')
        : [];
    if (mergedSpecialtySelection.primarySpecialtyCategoryId) {
      await this.practitionerSpecialtyIntegrityService.validateSelection({
        primarySpecialtyCategoryId:
          mergedSpecialtySelection.primarySpecialtyCategoryId,
        specialtyIds,
      });
    }
    const mergedUser = {
      ...((currentSnapshot.applicant ?? {}) as Record<string, any>),
      displayName: input.data.displayName !== undefined ? input.data.displayName : user.displayName,
      timezone: input.data.timezone !== undefined ? input.data.timezone : user.timezone,
      locale: input.data.locale !== undefined ? input.data.locale : user.defaultLocale,
    };
    const languageCodes = input.data.languageCodes ?? currentSnapshot.languageCodes ?? [];
    const credentials = await this.practitionerCredentialRepository.listByApplicationId(current.id);
    this.assertRequiredDocumentsComplete(credentials.map((credential) => ({
      credentialType: credential.credentialType,
      reviewStatus: credential.reviewStatus,
      expiresAt: credential.expiresAt,
      fileUrl: credential.fileUrl,
    })), mergedProfile.countryCode);
    const missing: string[] = [];
    if (!mergedUser.displayName?.trim()) missing.push('displayName');
    if (!mergedProfile.countryCode?.trim()) missing.push('countryCode');
    if (!mergedProfile.professionalTitle?.trim()) missing.push('professionalTitle');
    if (!mergedProfile.bio?.trim()) missing.push('bio');
    if (mergedProfile.yearsOfExperience === null || mergedProfile.yearsOfExperience === undefined) missing.push('yearsOfExperience');
    if (!Array.isArray(languageCodes) || languageCodes.length === 0) missing.push('languages');
    if (!mergedSpecialtySelection.primarySpecialtyCategoryId) missing.push('primarySpecialtyCategoryId');
    if (!Array.isArray(mergedSpecialtySelection.specialties) || mergedSpecialtySelection.specialties.length === 0) missing.push('specialties');
    if (!input.currentUser.isActive) missing.push('activeAccount');
    if (input.currentUser.isPractitionerOtpVerified === false) missing.push('practitionerOtpVerified');
    if (missing.length) {
      throw new UnprocessableEntityException({ error: 'PRACTITIONER_APPLICATION_NOT_ELIGIBLE', missingRequirements: missing });
    }
    const snapshot = {
      applicant: mergedUser,
      profile: mergedProfile,
      languageCodes,
      specialtySelection: mergedSpecialtySelection,
      credentials: credentials.map((credential) => ({
        credentialId: credential.id,
        credentialType: credential.credentialType,
        reviewStatus: credential.reviewStatus,
        expiresAt: credential.expiresAt,
        uploadedAt: credential.createdAt,
        reviewedAt: credential.reviewedAt,
        reviewNotes: credential.reviewNotes,
      })),
    } as Prisma.InputJsonValue;
    const blockedStatuses: PractitionerApplicationStatus[] = [PractitionerApplicationStatus.SUBMITTED, PractitionerApplicationStatus.UNDER_REVIEW, PractitionerApplicationStatus.APPROVED, PractitionerApplicationStatus.ARCHIVED];
    if (blockedStatuses.includes(current.status)) {
      throw new ConflictException({ error: 'PRACTITIONER_APPLICATION_ALREADY_SUBMITTED' });
    }
    await this.prisma.$transaction(async (tx) => {
      const latest = await this.practitionerApplicationRepository.findLatestByUserId(input.userId, tx);
      if (!latest || blockedStatuses.includes(latest.status)) throw new ConflictException({ error: 'PRACTITIONER_APPLICATION_ALREADY_SUBMITTED' });
      await this.practitionerApplicationRepository.resubmit(latest.id, snapshot, tx);
      await this.practitionerReviewCaseService.ensureOnboardingCase({ applicationId: latest.id, userId: input.userId, proposedSnapshot: snapshot, tx });
      await this.practitionerReviewCaseService.resubmitApplicationCase({ applicationId: latest.id, proposedSnapshot: snapshot, tx });
    });
    return this.getPractitionerApplicationStatusUseCase.execute({ userId: input.userId, locale: input.locale, currentUser: input.currentUser });
  }

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
    data: SubmitPractitionerApplicationDto;
  }) {
    const existingProfile = await this.practitionerProfileRepository.findByUserId(input.userId);
    if (!existingProfile) return this.submitApplicationOwned(input);
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
      professionalContentState,
    ] = await Promise.all([
      this.practitionerProfileRepository.findByUserId(input.userId),
      this.practitionerUserRepository.findProfileSeed(input.userId),
      this.practitionerLanguageRepository.listCodesByPractitionerId(profile.id),
      this.specialtyRepository.listByPractitionerId(profile.id, input.locale),
      this.practitionerCredentialRepository.listByPractitionerId(profile.id),
      this.practitionerPayoutDestinationRepository.findByPractitionerId(
        profile.id,
      ),
      this.professionalContentRepository?.findByPractitionerProfileId(
        profile.id,
      ),
    ]);

    if (!profileState || !userState) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const contentPlan = this.professionalContentAuthoringService
      ? this.professionalContentAuthoringService.plan(
          professionalContentState ?? {
            professionalTitle: profileState.professionalTitle,
            bio: profileState.bio,
          },
          {
            professionalTitle: input.data.professionalTitle,
            bio: input.data.bio,
            professionalContent: input.data.professionalContent,
            primaryContentLocale: input.data.primaryContentLocale,
          },
        )
      : null;

    const requestedTimezone = normalizeIanaTimeZoneInput(input.data.timezone, {
      messageKey: 'availability.errors.invalidTimezone',
      error: 'AVAILABILITY_INVALID_TIMEZONE',
    });

    const mergedUser = {
      displayName:
        input.data.displayName !== undefined
          ? input.data.displayName
          : userState.displayName,
      defaultLocale:
        input.data.locale !== undefined
          ? input.data.locale
          : userState.defaultLocale,
      timezone:
        requestedTimezone !== undefined
          ? requestedTimezone
          : userState.timezone,
    };

    const mergedProfile = {
      practitionerType:
        input.data.practitionerType ?? profileState.practitionerType,
      practitionerGender:
        input.data.practitionerGender !== undefined
          ? input.data.practitionerGender
          : (profileState.practitionerGender ?? null),
      professionalTitle:
        contentPlan?.state.professionalTitle ??
        normalizeProfessionalTitle(
          input.data.professionalTitle !== undefined
            ? input.data.professionalTitle
            : (profileState.professionalTitle ?? null),
        ),
      bio:
        contentPlan?.state.bio ??
        (input.data.bio !== undefined
          ? input.data.bio
          : (profileState.bio ?? null)),
      ...(contentPlan
        ? {
            professionalContent:
              this.professionalContentAuthoringService!.toSnapshot(contentPlan),
            primaryContentLocale: contentPlan.state.primaryContentLocale,
          }
        : {}),
      yearsOfExperience:
        input.data.yearsOfExperience !== undefined
          ? input.data.yearsOfExperience
          : (profileState.yearsOfExperience ?? null),
      countryCode:
        input.data.countryCode !== undefined
          ? input.data.countryCode
          : (profileState.country?.isoCode ?? null),
      primarySpecialtyCategoryId:
        profileState.primarySpecialtyCategoryId ?? null,
    };

    const requestedPayoutDestination = input.data.payoutDestination;
    const mergedPayoutDestination =
      requestedPayoutDestination === null
        ? null
        : requestedPayoutDestination !== undefined
          ? {
              methodType: requestedPayoutDestination.methodType,
              countryCode: requestedPayoutDestination.countryCode ?? null,
              accountHolderName:
                requestedPayoutDestination.accountHolderName ?? null,
              bankName: requestedPayoutDestination.bankName ?? null,
              bankAccountNumber:
                requestedPayoutDestination.bankAccountNumber ?? null,
              iban: requestedPayoutDestination.iban ?? null,
              walletProvider: requestedPayoutDestination.walletProvider ?? null,
              walletIdentifier:
                requestedPayoutDestination.walletIdentifier ?? null,
              otherDetails: requestedPayoutDestination.otherDetails ?? null,
            }
          : payoutDestination
            ? {
                methodType: payoutDestination.methodType,
                countryCode: payoutDestination.countryCode ?? null,
                accountHolderName: payoutDestination.accountHolderName ?? null,
                bankName: payoutDestination.bankName ?? null,
                bankAccountNumber: payoutDestination.bankAccountNumber ?? null,
                iban: payoutDestination.iban ?? null,
                walletProvider: payoutDestination.walletProvider ?? null,
                walletIdentifier: payoutDestination.walletIdentifier ?? null,
                otherDetails: payoutDestination.otherDetails ?? null,
              }
            : null;

    this.practitionerPayoutDestinationValidationService.validate(
      mergedPayoutDestination,
    );
    const submissionSnapshot =
      this.practitionerApplicationSnapshotService.build({
        user: mergedUser,
        profile: mergedProfile,
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
        payoutDestination: mergedPayoutDestination,
        avatarUrl:
          input.data.avatarUrl !== undefined
            ? input.data.avatarUrl
            : (profileState.avatarUrl ?? null),
      });

    const [readiness, latestApplicationBeforeTx] = await Promise.all([
      this.getPractitionerProfileReadinessUseCase.evaluate({
        userId: input.userId,
        currentUser: input.currentUser,
        draft: {
          displayName: mergedUser.displayName,
          professionalTitle: mergedProfile.professionalTitle,
          bio: mergedProfile.bio,
          countryCode: mergedProfile.countryCode,
          yearsOfExperience: mergedProfile.yearsOfExperience,
          hasPayoutDestination: Boolean(mergedPayoutDestination),
          hasPayoutAccountHolderName: Boolean(
            mergedPayoutDestination?.accountHolderName?.trim(),
          ),
          payoutDestination:
            mergedPayoutDestination === null
              ? null
              : mergedPayoutDestination === undefined
                ? undefined
                : {
                    methodType: mergedPayoutDestination.methodType,
                    accountHolderName:
                      mergedPayoutDestination.accountHolderName ?? null,
                    bankName: mergedPayoutDestination.bankName ?? null,
                    bankAccountNumber:
                      mergedPayoutDestination.bankAccountNumber ?? null,
                    iban: mergedPayoutDestination.iban ?? null,
                    walletProvider:
                      mergedPayoutDestination.walletProvider ?? null,
                    walletIdentifier:
                      mergedPayoutDestination.walletIdentifier ?? null,
                    otherDetails: mergedPayoutDestination.otherDetails ?? null,
                  },
        },
      }),
      this.practitionerApplicationRepository.findLatestByPractitionerId(
        profile.id,
      ),
    ]);

    const eligibility = this.practitionerApplicationEligibilityPolicy.evaluate({
      readiness,
      latestApplicationStatus: latestApplicationBeforeTx?.status ?? null,
    });

    this.assertRequiredDocumentsComplete(
      credentials.map((credential) => ({
        credentialType: credential.credentialType,
        reviewStatus: credential.reviewStatus,
        expiresAt: credential.expiresAt,
        fileUrl: credential.fileUrl,
      })),
      profileState.country?.isoCode ?? null,
    );

    if (!eligibility.canSubmit) {
      const alreadySubmitted =
        latestApplicationBeforeTx?.status ===
          PractitionerApplicationStatus.SUBMITTED ||
        latestApplicationBeforeTx?.status ===
          PractitionerApplicationStatus.UNDER_REVIEW ||
        latestApplicationBeforeTx?.status ===
          PractitionerApplicationStatus.APPROVED ||
        latestApplicationBeforeTx?.status ===
          PractitionerApplicationStatus.ARCHIVED;

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
      const transactionCredentials =
        await this.practitionerCredentialRepository.listByPractitionerId(
          profile.id,
          tx,
        );
      this.assertRequiredDocumentsComplete(
        transactionCredentials.map((credential) => ({
          credentialType: credential.credentialType,
          reviewStatus: credential.reviewStatus,
          expiresAt: credential.expiresAt,
          fileUrl: credential.fileUrl,
        })),
        profileState.country?.isoCode ?? null,
      );
      const latestApplication =
        await this.practitionerApplicationRepository.findLatestByPractitionerId(
          profile.id,
          tx,
        );

      const blockedStatuses: PractitionerApplicationStatus[] = [
        PractitionerApplicationStatus.SUBMITTED,
        PractitionerApplicationStatus.UNDER_REVIEW,
        PractitionerApplicationStatus.APPROVED,
        PractitionerApplicationStatus.ARCHIVED,
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
      ];

      if (
        latestApplication &&
        resubmittableStatuses.includes(latestApplication.status)
      ) {
        const decision = await this.practitionerApplicationRepository.resubmit(
          latestApplication.id,
          submissionSnapshot,
          tx,
        );
        await this.securityAuditService?.recordRequired(tx, {
          action: 'security.practitioner.application.resubmit',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.userId,
          actorRoles: input.currentUser.roles,
          resourceType: 'PractitionerApplication',
          resourceId: decision.id,
          targetUserId: input.userId,
          metadata: {
            previousStatus: latestApplication.status,
            status: decision.status,
          },
        });
        await this.practitionerReviewCaseService.ensureOnboardingCase({
          practitionerId: profile.id,
          proposedSnapshot: submissionSnapshot as Prisma.InputJsonValue,
          tx,
        });
        await this.practitionerReviewCaseService.resubmitChangeCase({
          practitionerId: profile.id,
          proposedSnapshot: submissionSnapshot as Prisma.InputJsonValue,
          tx,
        });
        return;
      }

      const decision =
        await this.practitionerApplicationRepository.createSubmitted(
          profile.id,
          submissionSnapshot,
          tx,
        );
      await this.securityAuditService?.recordRequired(tx, {
        action: 'security.practitioner.application.submit',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId: input.userId,
        actorRoles: input.currentUser.roles,
        resourceType: 'PractitionerApplication',
        resourceId: decision.id,
        targetUserId: input.userId,
        metadata: { previousStatus: null, status: decision.status },
      });
      await this.practitionerReviewCaseService.ensureOnboardingCase({
        practitionerId: profile.id,
        proposedSnapshot: submissionSnapshot as Prisma.InputJsonValue,
        tx,
      });
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
