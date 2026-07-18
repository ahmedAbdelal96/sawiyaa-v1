import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerType,
  PractitionerStatus,
  Prisma,
} from '@prisma/client';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { PractitionerApplicationReviewPolicy } from '../policies/practitioner-application-review.policy';
import { PractitionerApplicationTransitionPolicy } from '../policies/practitioner-application-transition.policy';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from '../repositories/admin-practitioner-credential.repository';
import { AdminPractitionerProfileRepository } from '../repositories/admin-practitioner-profile.repository';
import { AdminPractitionerSpecialtyRepository } from '../repositories/admin-practitioner-specialty.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AdminPractitionerApplicationNotificationService } from '../services/admin-practitioner-application-notification.service';

type SubmissionSnapshot = {
  applicant?: {
    displayName?: string | null;
    locale?: string | null;
    timezone?: string | null;
  };
  profile?: {
    practitionerType?: string | null;
    practitionerGender?: string | null;
    professionalTitle?: string | null;
    bio?: string | null;
    yearsOfExperience?: number | null;
    countryCode?: string | null;
    avatarUrl?: string | null;
  };
  languageCodes?: string[] | null;
  specialtySelection?: {
    primarySpecialtyCategoryId?: string | null;
    specialties?: Array<{
      specialtyId?: string | null;
      isPrimary?: boolean | null;
    }> | null;
  } | null;
  credentials?: Array<{
    credentialId?: string | null;
    reviewStatus?: string | null;
  }> | null;
  payoutDestination?: {
    methodType?: string | null;
    accountHolderName?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    iban?: string | null;
    walletProvider?: string | null;
    walletIdentifier?: string | null;
    otherDetails?: string | null;
  } | null;
};

/**
 * Approves a practitioner application after transition-policy checks.
 * The approved snapshot becomes the live practitioner truth at this point.
 */
@Injectable()
export class ApprovePractitionerApplicationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly reviewPolicy: PractitionerApplicationReviewPolicy,
    private readonly transitionPolicy: PractitionerApplicationTransitionPolicy,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly profileRepository: AdminPractitionerProfileRepository,
    private readonly practitionerSpecialtyRepository: AdminPractitionerSpecialtyRepository,
    private readonly credentialRepository: AdminPractitionerCredentialRepository,
    private readonly userRepository: AdminUserRepository,
    private readonly notificationService: AdminPractitionerApplicationNotificationService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    id: string;
    locale: SupportedLocale;
    adminUserId: string;
    operatorRoles: string[];
    reason?: string;
    note?: string;
  }) {
    const existing = await this.applicationRepository.findById(input.id);

    if (!existing) {
      this.securityAuditService.logAsync({
        action: 'security.practitioner.application.approve',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.adminUserId,
        actorRoles: input.operatorRoles,
        resourceType: 'PractitionerApplication',
        resourceId: input.id,
        reason: 'APPLICATION_NOT_FOUND',
      });
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    this.transitionPolicy.assertCanApprove(existing.status);

    const [profile, user, specialtyLinks, credentials] = await Promise.all([
      this.profileRepository.findById(existing.practitioner.id),
      this.userRepository.findApplicantSummary(existing.practitioner.userId),
      this.practitionerSpecialtyRepository.listByPractitionerId(
        existing.practitioner.id,
      ),
      this.credentialRepository.listByPractitionerId(existing.practitioner.id),
    ]);

    if (!profile || !user) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_INVALID_RELATION',
      });
    }

    const snapshot = (existing.submissionSnapshot ??
      null) as SubmissionSnapshot | null;

    const requestedDisplayName =
      snapshot?.applicant?.displayName ?? user.displayName;
    const requestedProfessionalTitle =
      snapshot?.profile?.professionalTitle ?? profile.professionalTitle;
    const requestedBio = snapshot?.profile?.bio ?? profile.bio;
    const requestedCountryCode =
      snapshot?.profile?.countryCode ?? profile.country?.isoCode ?? null;
    const requestedYearsOfExperience =
      snapshot?.profile?.yearsOfExperience ?? profile.yearsOfExperience ?? null;
    const requestedPayoutDestination =
      snapshot?.payoutDestination ?? profile.payoutDestination ?? null;
    const requestedLanguageCodes =
      Array.isArray(snapshot?.languageCodes) &&
      snapshot.languageCodes.some(
        (code) => typeof code === 'string' && code.trim().length > 0,
      )
        ? snapshot.languageCodes
            .filter((code): code is string => typeof code === 'string')
            .map((code) => code.trim())
            .filter(Boolean)
        : profile.languages.map((item) => item.language.code);
    const requestedSpecialties =
      Array.isArray(snapshot?.specialtySelection?.specialties) &&
      snapshot.specialtySelection.specialties.length > 0
        ? snapshot.specialtySelection.specialties
            .filter((item) => typeof item?.specialtyId === 'string')
            .map((item) => ({
              specialtyId: item.specialtyId!,
              isPrimary: item?.isPrimary === true,
            }))
        : specialtyLinks.map((item) => ({
            specialtyId: item.specialtyId,
            isPrimary: item.isPrimary,
          }));
    const requestedCredentials =
      Array.isArray(snapshot?.credentials) && snapshot.credentials.length > 0
        ? snapshot.credentials
        : credentials.map((item) => ({
            credentialId: item.id,
            reviewStatus: item.reviewStatus,
          }));

    const readiness = this.reviewPolicy.evaluateReadiness({
      hasDisplayName: Boolean(requestedDisplayName?.trim()),
      hasProfessionalTitle: Boolean(requestedProfessionalTitle?.trim()),
      hasBio: Boolean(requestedBio?.trim()),
      hasCountry: Boolean(requestedCountryCode),
      hasYearsOfExperience:
        typeof requestedYearsOfExperience === 'number' &&
        requestedYearsOfExperience > 0,
      hasLanguage: requestedLanguageCodes.length > 0,
      hasRequiredSpecialties: requestedSpecialties.length > 0,
      hasRequiredCredentials:
        requestedCredentials.length > 0 &&
        requestedCredentials.every((item) => item.reviewStatus === 'APPROVED'),
      hasPayoutDestination: Boolean(requestedPayoutDestination),
      status: existing.status,
    });

    if (!readiness.canBeApproved) {
      const missingRequirements = [
        !readiness.isProfileCompleted ? 'PROFILE_INCOMPLETE' : null,
        !readiness.hasRequiredSpecialties ? 'SPECIALTIES_REQUIRED' : null,
        !readiness.hasRequiredCredentials
          ? 'APPROVED_CREDENTIALS_REQUIRED'
          : null,
        !readiness.hasPayoutDestination ? 'PAYOUT_DESTINATION_REQUIRED' : null,
        !readiness.canBeReviewed ? 'APPLICATION_NOT_REVIEWABLE' : null,
      ].filter((item): item is string => Boolean(item));

      this.securityAuditService.logAsync({
        action: 'security.practitioner.application.approve',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.adminUserId,
        actorRoles: input.operatorRoles,
        resourceType: 'PractitionerApplication',
        resourceId: input.id,
        reason: 'APPLICATION_NOT_APPROVABLE',
        metadata: { missingRequirements },
      });
      throw new BadRequestException({
        messageKey:
          'admin.practitionerApplications.errors.invalidApplicationState',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_APPROVABLE',
        details: {
          missingRequirements,
        },
      });
    }

    const reviewNotes = input.note?.trim() || null;
    const reviewDecisionReason = input.reason?.trim() || null;
    const reviewedAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const latest = await this.applicationRepository.findById(input.id, tx);

        if (!latest) {
          this.securityAuditService.logAsync({
            action: 'security.practitioner.application.approve',
            outcome: SecurityAuditOutcome.FAILURE,
            actorUserId: input.adminUserId,
            actorRoles: input.operatorRoles,
            resourceType: 'PractitionerApplication',
            resourceId: input.id,
            reason: 'APPLICATION_NOT_FOUND_IN_TRANSACTION',
          });
          throw new NotFoundException({
            messageKey:
              'admin.practitionerApplications.errors.applicationNotFound',
            error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
          });
        }

        this.transitionPolicy.assertCanApprove(latest.status);

        const applicant = (
          latest.submissionSnapshot as SubmissionSnapshot | null
        )?.applicant;
        const requestedProfile = (
          latest.submissionSnapshot as SubmissionSnapshot | null
        )?.profile;
        const requestedPayoutDestination = (
          latest.submissionSnapshot as SubmissionSnapshot | null
        )?.payoutDestination;

        if (applicant) {
          await this.userRepository.updateProfilePreferences(
            latest.practitioner.userId,
            {
              displayName:
                applicant.displayName !== undefined
                  ? applicant.displayName
                  : undefined,
              defaultLocale:
                applicant.locale !== undefined ? applicant.locale : undefined,
              timezone:
                applicant.timezone !== undefined
                  ? applicant.timezone
                  : undefined,
            },
            tx,
          );
        }

        if (requestedProfile) {
          let countryId: string | null | undefined = undefined;
          if (requestedProfile.countryCode !== undefined) {
            if (requestedProfile.countryCode === null) {
              countryId = null;
            } else {
              const country = await tx.country.findUnique({
                where: {
                  isoCode: requestedProfile.countryCode,
                },
                select: {
                  id: true,
                },
              });

              if (!country) {
                throw new BadRequestException({
                  messageKey:
                    'admin.practitionerApplications.errors.invalidApplicationState',
                  error: 'ADMIN_PRACTITIONER_APPLICATION_INVALID_COUNTRY',
                });
              }

              countryId = country.id;
            }
          }

          await this.profileRepository.updateProfileDetails(
            latest.practitioner.id,
            {
              practitionerType: requestedProfile.practitionerType
                ? (requestedProfile.practitionerType as PractitionerType)
                : undefined,
              practitionerGender:
                requestedProfile.practitionerGender !== undefined
                  ? (requestedProfile.practitionerGender as PractitionerGender | null)
                  : undefined,
              professionalTitle:
                requestedProfile.professionalTitle !== undefined
                  ? requestedProfile.professionalTitle
                  : undefined,
              bio:
                requestedProfile.bio !== undefined
                  ? requestedProfile.bio
                  : undefined,
              yearsOfExperience:
                requestedProfile.yearsOfExperience !== undefined
                  ? requestedProfile.yearsOfExperience
                  : undefined,
              countryId,
            },
            tx,
          );

          if (requestedProfile.avatarUrl !== undefined) {
            await this.profileRepository.updateAvatar(
              latest.practitioner.id,
              requestedProfile.avatarUrl,
              tx,
            );
          }
        }

        if (requestedPayoutDestination !== undefined) {
          await this.profileRepository.upsertPayoutDestination(
            latest.practitioner.id,
            requestedPayoutDestination
              ? ({
                  methodType:
                    requestedPayoutDestination.methodType as PractitionerPayoutMethodType,
                  accountHolderName:
                    requestedPayoutDestination.accountHolderName ?? null,
                  bankName: requestedPayoutDestination.bankName ?? null,
                  bankAccountNumber:
                    requestedPayoutDestination.bankAccountNumber ?? null,
                  iban: requestedPayoutDestination.iban ?? null,
                  walletProvider:
                    requestedPayoutDestination.walletProvider ?? null,
                  walletIdentifier:
                    requestedPayoutDestination.walletIdentifier ?? null,
                  otherDetails: requestedPayoutDestination.otherDetails ?? null,
                } as const)
              : null,
            tx,
          );
        }

        const decision = await this.applicationRepository.updateDecision(
          input.id,
          {
            status: PractitionerApplicationStatus.APPROVED,
            reviewedAt,
            reviewedByUserId: input.adminUserId,
            reviewDecisionReason,
            reviewNotes,
            ...(snapshot ? { submissionSnapshot: snapshot } : {}),
          },
          tx,
        );

        await this.profileRepository.updateStatusAndPublish(
          decision.practitioner.id,
          PractitionerStatus.APPROVED,
          tx,
        );

        await this.securityAuditService.recordRequired(tx, {
          action: 'security.practitioner.application.approve',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.adminUserId,
          actorRoles: input.operatorRoles,
          resourceType: 'PractitionerApplication',
          resourceId: decision.id,
          targetUserId: decision.practitioner.userId,
          reason: reviewDecisionReason,
          metadata: {
            previousApplicationStatus: latest.status,
            newApplicationStatus: decision.status,
            practitionerProfileId: decision.practitioner.id,
          },
        });

        return decision;
      },
    );

    await this.notificationService.sendApproved({
      userId: updated.practitioner.userId,
      applicationId: updated.id,
      locale: input.locale,
    });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationApproved',
        input.locale,
      ),
      application: this.mapper.toDecision({
        applicationId: updated.id,
        practitionerProfileId: updated.practitioner.id,
        userId: updated.practitioner.userId,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
        reviewedByUserId: updated.reviewedByUserId ?? null,
        reviewDecisionReason: updated.reviewDecisionReason ?? null,
        reviewNotes: updated.reviewNotes ?? null,
      }),
    };
  }
}
