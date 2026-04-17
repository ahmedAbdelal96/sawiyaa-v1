import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { PractitionerApplicationReviewPolicy } from '../policies/practitioner-application-review.policy';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from '../repositories/admin-practitioner-credential.repository';
import { AdminPractitionerProfileRepository } from '../repositories/admin-practitioner-profile.repository';
import { AdminPractitionerSpecialtyRepository } from '../repositories/admin-practitioner-specialty.repository';
import { AdminSpecialtyRepository } from '../repositories/admin-specialty.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';

/**
 * Builds one aggregated admin-facing details view for a practitioner application.
 * This keeps admin screens deterministic while preserving boundaries with practitioner self-service module.
 */
@Injectable()
export class GetPractitionerApplicationDetailsUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly reviewPolicy: PractitionerApplicationReviewPolicy,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly profileRepository: AdminPractitionerProfileRepository,
    private readonly practitionerSpecialtyRepository: AdminPractitionerSpecialtyRepository,
    private readonly specialtyRepository: AdminSpecialtyRepository,
    private readonly credentialRepository: AdminPractitionerCredentialRepository,
    private readonly userRepository: AdminUserRepository,
  ) {}

  async execute(input: { id: string; locale: SupportedLocale }) {
    const application = await this.applicationRepository.findById(input.id);

    if (!application) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    const [profile, user, specialtyLinks, credentials] = await Promise.all([
      this.profileRepository.findById(application.practitionerId),
      this.userRepository.findApplicantSummary(application.practitioner.userId),
      this.practitionerSpecialtyRepository.listByPractitionerId(
        application.practitionerId,
      ),
      this.credentialRepository.listByPractitionerId(
        application.practitionerId,
      ),
    ]);

    if (!profile || !user) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_INVALID_RELATION',
      });
    }

    const specialtyIds = specialtyLinks.map((item) => item.specialtyId);
    const specialties = await this.specialtyRepository.listByIds(
      specialtyIds,
      input.locale,
    );
    const specialtyMap = new Map(
      specialties.map((item) => [item.id, item] as const),
    );

    const readiness = this.reviewPolicy.evaluateReadiness({
      hasDisplayName: Boolean(user.displayName?.trim()),
      hasProfessionalTitle: Boolean(profile.professionalTitle?.trim()),
      hasBio: Boolean(profile.bio?.trim()),
      hasCountry: Boolean(profile.country?.isoCode),
      hasYearsOfExperience:
        typeof profile.yearsOfExperience === 'number' &&
        profile.yearsOfExperience > 0,
      hasLanguage: profile.languages.length > 0,
      hasRequiredSpecialties: specialtyLinks.length > 0,
      hasRequiredCredentials: credentials.length > 0,
      hasPayoutDestination: Boolean(profile.payoutDestination),
      status: application.status,
    });

    const snapshot = (application.submissionSnapshot ?? null) as Record<
      string,
      any
    > | null;
    const snapshotApplicant = snapshot?.applicant ?? null;
    const snapshotProfile = snapshot?.profile ?? null;
    const snapshotSpecialtySelection = snapshot?.specialtySelection ?? null;
    const snapshotCredentials = Array.isArray(snapshot?.credentials)
      ? snapshot.credentials
      : null;
    const snapshotPayoutDestination = snapshot?.payoutDestination ?? null;
    const snapshotLanguageCodes = Array.isArray(snapshot?.languageCodes)
      ? snapshot.languageCodes
      : null;

    const details = this.mapper.toDetails({
      applicant: {
        userId: user.id,
        practitionerProfileId: profile.id,
        displayName: snapshotApplicant?.displayName ?? user.displayName ?? null,
        accountStatus: user.status,
        email: {
          address: user.emails[0]?.email ?? null,
          isVerified: user.emails[0]?.isVerified ?? false,
        },
        phone: {
          number: user.phones[0]?.phone ?? null,
          isVerified: user.phones[0]?.isVerified ?? false,
        },
        locale: snapshotApplicant?.locale ?? user.defaultLocale ?? null,
        timezone: snapshotApplicant?.timezone ?? user.timezone ?? null,
        countryCode:
          snapshotProfile?.countryCode ?? profile.country?.isoCode ?? null,
      },
      profile: {
        practitionerType:
          snapshotProfile?.practitionerType ?? profile.practitionerType,
        practitionerGender:
          snapshotProfile?.practitionerGender ??
          profile.practitionerGender ??
          null,
        profileStatus: profile.status,
        professionalTitle:
          snapshotProfile?.professionalTitle ??
          profile.professionalTitle ??
          null,
        bio: snapshotProfile?.bio ?? profile.bio ?? null,
        yearsOfExperience:
          snapshotProfile?.yearsOfExperience ??
          profile.yearsOfExperience ??
          null,
        primarySpecialtyCategoryId:
          snapshotSpecialtySelection?.primarySpecialtyCategoryId ??
          profile.primarySpecialtyCategoryId ??
          null,
        languages:
          snapshotLanguageCodes ??
          profile.languages.map((item) => item.language.code),
        specialties:
          snapshotSpecialtySelection?.specialties ??
          specialtyLinks.map((link) => {
            const specialty = specialtyMap.get(link.specialtyId);
            return {
              specialtyId: link.specialtyId,
              slug: specialty?.slug ?? '',
              title: specialty
                ? this.mapper.pickLocalizedTitle(
                    specialty.translations,
                    input.locale,
                  )
                : null,
              isPrimary: link.isPrimary,
            };
          }),
      },
      credentials:
        snapshotCredentials?.map((credential) => ({
          credentialId: credential.credentialId ?? '',
          credentialType: credential.credentialType,
          fileUrl: credential.fileUrl,
          reviewStatus: credential.reviewStatus,
          expiresAt: credential.expiresAt
            ? new Date(credential.expiresAt)
            : null,
          uploadedAt: credential.uploadedAt
            ? new Date(credential.uploadedAt)
            : new Date(),
          reviewedAt: credential.reviewedAt
            ? new Date(credential.reviewedAt)
            : null,
          reviewedByUserId: credential.reviewedByUserId ?? null,
          reviewNotes: credential.reviewNotes ?? null,
        })) ??
        credentials.map((credential) => ({
          credentialId: credential.id,
          credentialType: credential.credentialType,
          fileUrl: credential.fileUrl,
          reviewStatus: credential.reviewStatus,
          expiresAt: credential.expiresAt,
          uploadedAt: credential.createdAt,
          reviewedAt: credential.reviewedAt ?? null,
          reviewedByUserId: credential.reviewedByUserId ?? null,
          reviewNotes: credential.reviewNotes ?? null,
        })),
      payoutDestination: snapshotPayoutDestination
        ? {
            methodType: snapshotPayoutDestination.methodType ?? null,
            accountHolderName:
              snapshotPayoutDestination.accountHolderName ?? null,
            bankName: snapshotPayoutDestination.bankName ?? null,
            bankAccountNumber:
              snapshotPayoutDestination.bankAccountNumber ?? null,
            iban: snapshotPayoutDestination.iban ?? null,
            walletProvider: snapshotPayoutDestination.walletProvider ?? null,
            walletIdentifier:
              snapshotPayoutDestination.walletIdentifier ?? null,
            otherDetails: snapshotPayoutDestination.otherDetails ?? null,
          }
        : profile.payoutDestination
          ? {
              methodType: profile.payoutDestination.methodType,
              accountHolderName:
                profile.payoutDestination.accountHolderName ?? null,
              bankName: profile.payoutDestination.bankName ?? null,
              bankAccountNumber:
                profile.payoutDestination.bankAccountNumber ?? null,
              iban: profile.payoutDestination.iban ?? null,
              walletProvider: profile.payoutDestination.walletProvider ?? null,
              walletIdentifier:
                profile.payoutDestination.walletIdentifier ?? null,
              otherDetails: profile.payoutDestination.otherDetails ?? null,
            }
          : null,
      application: {
        applicationId: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        reviewedAt: application.reviewedAt,
        reviewedByUserId: application.reviewedByUserId ?? null,
        reviewDecisionReason: application.reviewDecisionReason ?? null,
        reviewNotes: application.reviewNotes ?? null,
      },
      readinessSnapshot: readiness,
    });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationFetched',
        input.locale,
      ),
      details,
    };
  }
}
