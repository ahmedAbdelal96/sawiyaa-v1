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
import { PractitionerApplicationCompletionService } from '@modules/practitioners/services/practitioner-application-completion.service';
import { PractitionerAvatarStorageService } from '@modules/practitioners/services/practitioner-avatar-storage.service';

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
    private readonly completionService: PractitionerApplicationCompletionService,
    private readonly avatarStorage: PractitionerAvatarStorageService,
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

    // If an avatar exists in storage, expose an admin-authenticated proxy URL.
    // Avatar storage is keyed by user id (same id used by practitioner self-service avatar endpoints).
    const hasStoredAvatar = Boolean(await this.avatarStorage.getAvatarFile(user.id));
    const adminAvatarUrl = hasStoredAvatar
      ? `/api/v1/admin/practitioner-applications/${application.id}/avatar`
      : null;

    const specialtyIds = specialtyLinks.map((item) => item.specialtyId);
    const specialties = await this.specialtyRepository.listByIds(
      specialtyIds,
      input.locale,
    );
    const specialtyMap = new Map(
      specialties.map((item) => [item.id, item] as const),
    );

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

    const liveSpecialties = specialtyLinks.map((link) => {
      const specialty = specialtyMap.get(link.specialtyId);
      return {
        specialtyId: link.specialtyId,
        slug: specialty?.slug ?? '',
        title: specialty
          ? this.mapper.pickLocalizedTitle(specialty.translations, input.locale)
          : null,
        isPrimary: link.isPrimary,
      };
    });

    const liveApplicant = {
      userId: user.id,
      practitionerProfileId: profile.id,
      displayName: user.displayName ?? null,
      avatarUrl: adminAvatarUrl,
      accountStatus: user.status,
      email: {
        address: user.emails[0]?.email ?? null,
        isVerified: user.emails[0]?.isVerified ?? false,
      },
      phone: {
        number: user.phones[0]?.phone ?? null,
        isVerified: user.phones[0]?.isVerified ?? false,
      },
      locale: user.defaultLocale ?? null,
      timezone: user.timezone ?? null,
      countryCode: profile.country?.isoCode ?? null,
    };

    const liveProfile = {
      practitionerType: profile.practitionerType,
      practitionerGender: profile.practitionerGender ?? null,
      profileStatus: profile.status,
      avatarUrl: adminAvatarUrl,
      professionalTitle: profile.professionalTitle ?? null,
      bio: profile.bio ?? null,
      yearsOfExperience: profile.yearsOfExperience ?? null,
      primarySpecialtyCategoryId: profile.primarySpecialtyCategoryId ?? null,
      pricing: {
        session30: {
          egp: profile.sessionPrice30Egp
            ? Number(profile.sessionPrice30Egp)
            : null,
          usd: profile.sessionPrice30Usd
            ? Number(profile.sessionPrice30Usd)
            : null,
        },
        session60: {
          egp: profile.sessionPrice60Egp
            ? Number(profile.sessionPrice60Egp)
            : null,
          usd: profile.sessionPrice60Usd
            ? Number(profile.sessionPrice60Usd)
            : null,
        },
      },
      languages: profile.languages.map((item) => item.language.code),
      specialties: liveSpecialties,
    };

    const livePayoutDestination = profile.payoutDestination
      ? {
          methodType: profile.payoutDestination.methodType,
          accountHolderName:
            profile.payoutDestination.accountHolderName ?? null,
          bankName: profile.payoutDestination.bankName ?? null,
          bankAccountNumber:
            profile.payoutDestination.bankAccountNumber ?? null,
          iban: profile.payoutDestination.iban ?? null,
          walletProvider: profile.payoutDestination.walletProvider ?? null,
          walletIdentifier: profile.payoutDestination.walletIdentifier ?? null,
          otherDetails: profile.payoutDestination.otherDetails ?? null,
        }
      : null;

    const requestedApplicant = {
      ...liveApplicant,
      displayName: snapshotApplicant?.displayName ?? liveApplicant.displayName,
      locale: snapshotApplicant?.locale ?? liveApplicant.locale,
      timezone: snapshotApplicant?.timezone ?? liveApplicant.timezone,
      countryCode: snapshotProfile?.countryCode ?? liveApplicant.countryCode,
    };

    const requestedProfile = {
      ...liveProfile,
      practitionerType:
        snapshotProfile?.practitionerType ?? liveProfile.practitionerType,
      practitionerGender:
        snapshotProfile?.practitionerGender ?? liveProfile.practitionerGender,
      professionalTitle:
        snapshotProfile?.professionalTitle ?? liveProfile.professionalTitle,
      bio: snapshotProfile?.bio ?? liveProfile.bio,
      yearsOfExperience:
        snapshotProfile?.yearsOfExperience ?? liveProfile.yearsOfExperience,
      primarySpecialtyCategoryId:
        snapshotSpecialtySelection?.primarySpecialtyCategoryId ??
        liveProfile.primarySpecialtyCategoryId,
      pricing: snapshotProfile?.pricing ?? liveProfile.pricing,
      languages: snapshotLanguageCodes ?? liveProfile.languages,
      specialties:
        snapshotSpecialtySelection?.specialties ?? liveProfile.specialties,
    };

    const requestedPayoutDestination = snapshotPayoutDestination
      ? {
          methodType: snapshotPayoutDestination.methodType ?? null,
          accountHolderName:
            snapshotPayoutDestination.accountHolderName ?? null,
          bankName: snapshotPayoutDestination.bankName ?? null,
          bankAccountNumber:
            snapshotPayoutDestination.bankAccountNumber ?? null,
          iban: snapshotPayoutDestination.iban ?? null,
          walletProvider: snapshotPayoutDestination.walletProvider ?? null,
          walletIdentifier: snapshotPayoutDestination.walletIdentifier ?? null,
          otherDetails: snapshotPayoutDestination.otherDetails ?? null,
        }
      : livePayoutDestination;

    const requestedLanguageCodes =
      Array.isArray(snapshotLanguageCodes) && snapshotLanguageCodes.length > 0
        ? snapshotLanguageCodes
            .filter((code): code is string => typeof code === 'string')
            .map((code) => code.trim())
            .filter(Boolean)
        : liveProfile.languages;
    const requestedSpecialties =
      Array.isArray(snapshotSpecialtySelection?.specialties) &&
      snapshotSpecialtySelection.specialties.length > 0
        ? snapshotSpecialtySelection.specialties.filter(
            (item: { specialtyId?: unknown }) =>
              typeof item?.specialtyId === 'string',
          )
        : liveSpecialties;
    const requestedCredentialsForReadiness =
      Array.isArray(snapshotCredentials) && snapshotCredentials.length > 0
        ? snapshotCredentials
        : credentials;

    const readiness = this.reviewPolicy.evaluateReadiness({
      hasDisplayName: Boolean(requestedApplicant.displayName?.trim()),
      hasProfessionalTitle: Boolean(requestedProfile.professionalTitle?.trim()),
      hasBio: Boolean(requestedProfile.bio?.trim()),
      hasCountry: Boolean(requestedApplicant.countryCode),
      hasYearsOfExperience:
        typeof requestedProfile.yearsOfExperience === 'number' &&
        requestedProfile.yearsOfExperience > 0,
      hasLanguage: requestedLanguageCodes.length > 0,
      hasRequiredSpecialties: requestedSpecialties.length > 0,
      hasRequiredCredentials:
        requestedCredentialsForReadiness.length > 0 &&
        requestedCredentialsForReadiness.every(
          (item: { reviewStatus?: string }) => item.reviewStatus === 'APPROVED',
        ),
      hasPayoutDestination: Boolean(requestedPayoutDestination),
      status: application.status,
    });

    const details = this.mapper.toDetails({
      applicant: requestedApplicant,
      liveApplicant,
      profile: requestedProfile,
      liveProfile,
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
      payoutDestination: requestedPayoutDestination,
      livePayoutDestination,
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
      completion: this.completionService.build({
        displayName: requestedApplicant.displayName,
        countryCode: requestedApplicant.countryCode,
        practitionerType: requestedProfile.practitionerType,
        practitionerGender: requestedProfile.practitionerGender,
        professionalTitle: requestedProfile.professionalTitle,
        bio: requestedProfile.bio,
        yearsOfExperience: requestedProfile.yearsOfExperience,
        languageCount: requestedLanguageCodes.length,
        specialtyCount: requestedSpecialties.length,
        primarySpecialtyCategoryId:
          requestedProfile.primarySpecialtyCategoryId ?? null,
        credentialSummary: {
          totalCredentials: requestedCredentialsForReadiness.length,
          approvedCount: requestedCredentialsForReadiness.filter(
            (item: { reviewStatus?: string }) =>
              item.reviewStatus === 'APPROVED',
          ).length,
          pendingCount: requestedCredentialsForReadiness.filter(
            (item: { reviewStatus?: string }) =>
              item.reviewStatus === 'PENDING',
          ).length,
          rejectedCount: requestedCredentialsForReadiness.filter(
            (item: { reviewStatus?: string }) =>
              item.reviewStatus === 'REJECTED',
          ).length,
          expiredCount: requestedCredentialsForReadiness.filter(
            (item: { reviewStatus?: string }) =>
              item.reviewStatus === 'EXPIRED',
          ).length,
        },
        credentialTypes: requestedCredentialsForReadiness
          .map((item: { credentialType?: string | null }) =>
            item.credentialType ? String(item.credentialType) : null,
          )
          .filter((item): item is string => item !== null),
        payoutDestination: requestedPayoutDestination,
        isAccountActive: user.status === 'ACTIVE',
        isPractitionerOtpVerified: null,
        applicationStatus: application.status,
        pricing: requestedProfile.pricing,
      }),
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
