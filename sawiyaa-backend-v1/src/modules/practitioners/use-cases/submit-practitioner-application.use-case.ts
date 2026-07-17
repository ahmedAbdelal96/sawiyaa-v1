import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
} from '@nestjs/common';
import {
  PractitionerApplicationStatus,
  PractitionerPayoutMethodType,
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
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';

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
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
    data: SubmitPractitionerApplicationDto;
  }) {
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

    const requestedTimezone = normalizeIanaTimeZoneInput(
      input.data.timezone,
      {
        messageKey: 'availability.errors.invalidTimezone',
        error: 'AVAILABILITY_INVALID_TIMEZONE',
      },
    );

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
        requestedTimezone !== undefined ? requestedTimezone : userState.timezone,
    };

    const mergedProfile = {
      practitionerType:
        input.data.practitionerType ?? profileState.practitionerType,
      practitionerGender:
        input.data.practitionerGender !== undefined
          ? input.data.practitionerGender
          : (profileState.practitionerGender ?? null),
      professionalTitle:
        input.data.professionalTitle !== undefined
          ? input.data.professionalTitle
          : (profileState.professionalTitle ?? null),
      bio:
        input.data.bio !== undefined
          ? input.data.bio
          : (profileState.bio ?? null),
      yearsOfExperience:
        input.data.yearsOfExperience !== undefined
          ? input.data.yearsOfExperience
          : (profileState.yearsOfExperience ?? null),
      countryCode:
        input.data.countryCode !== undefined
          ? input.data.countryCode
          : (profileState.country?.isoCode ?? null),
      sessionPrice30Egp:
        input.data.sessionPrice30Egp !== undefined
          ? input.data.sessionPrice30Egp
          : (profileState.sessionPrice30Egp ?? null),
      sessionPrice30Usd:
        input.data.sessionPrice30Usd !== undefined
          ? input.data.sessionPrice30Usd
          : (profileState.sessionPrice30Usd ?? null),
      sessionPrice60Egp:
        input.data.sessionPrice60Egp !== undefined
          ? input.data.sessionPrice60Egp
          : (profileState.sessionPrice60Egp ?? null),
      sessionPrice60Usd:
        input.data.sessionPrice60Usd !== undefined
          ? input.data.sessionPrice60Usd
          : (profileState.sessionPrice60Usd ?? null),
      instantBookingPrice30Egp:
        input.data.instantBookingPrice30Egp !== undefined
          ? input.data.instantBookingPrice30Egp
          : (profileState.instantBookingPrice30Egp ?? null),
      instantBookingPrice30Usd:
        input.data.instantBookingPrice30Usd !== undefined
          ? input.data.instantBookingPrice30Usd
          : (profileState.instantBookingPrice30Usd ?? null),
      instantBookingPrice60Egp:
        input.data.instantBookingPrice60Egp !== undefined
          ? input.data.instantBookingPrice60Egp
          : (profileState.instantBookingPrice60Egp ?? null),
      instantBookingPrice60Usd:
        input.data.instantBookingPrice60Usd !== undefined
          ? input.data.instantBookingPrice60Usd
          : (profileState.instantBookingPrice60Usd ?? null),
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
                accountHolderName: payoutDestination.accountHolderName ?? null,
                bankName: payoutDestination.bankName ?? null,
                bankAccountNumber: payoutDestination.bankAccountNumber ?? null,
                iban: payoutDestination.iban ?? null,
                walletProvider: payoutDestination.walletProvider ?? null,
                walletIdentifier: payoutDestination.walletIdentifier ?? null,
                otherDetails: payoutDestination.otherDetails ?? null,
              }
            : null;

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
          metadata: { previousStatus: latestApplication.status, status: decision.status },
        });
        return;
      }

      const decision = await this.practitionerApplicationRepository.createSubmitted(
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
