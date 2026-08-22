import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfileReadinessPolicy } from '../policies/practitioner-profile-readiness.policy';
import { PractitionerReviewCaseService } from '../services/practitioner-review-case.service';
import { PractitionerApplicationCompletionService } from '../services/practitioner-application-completion.service';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerLanguageRepository } from '../repositories/practitioner-language.repository';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerPayoutDestinationRepository } from '../repositories/practitioner-payout-destination.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerSpecialtyRepository } from '../repositories/practitioner-specialty.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { PractitionerPayoutDestinationInput } from '../types/practitioner.types';
import { PractitionerRequiredDocumentsService } from '../services/practitioner-required-documents.service';
import { getPractitionerPayoutCapabilities } from '../services/practitioner-payout-capability.service';
import { maskPayoutEmail, maskPayoutIdentifier } from '../utils/mask-payout-destination.util';
import { hasRequiredPractitionerPricing } from '../utils/public-practitioner-pricing-readiness.util';

/**
 * Readiness use case centralizes completion/readiness evaluation logic so other use cases can reuse one deterministic decision source.
 */
@Injectable()
export class GetPractitionerProfileReadinessUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerUserRepository: PractitionerUserRepository,
    private readonly practitionerLanguageRepository: PractitionerLanguageRepository,
    private readonly practitionerSpecialtyRepository: PractitionerSpecialtyRepository,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerPayoutDestinationRepository: PractitionerPayoutDestinationRepository,
    private readonly practitionerApplicationRepository: PractitionerApplicationRepository,
    private readonly practitionerProfileReadinessPolicy: PractitionerProfileReadinessPolicy,
    private readonly practitionerReviewCaseService: PractitionerReviewCaseService,
    private readonly practitionerApplicationCompletionService: PractitionerApplicationCompletionService,
    private readonly practitionerRequiredDocumentsService: PractitionerRequiredDocumentsService,
  ) {}

  async evaluate(input: {
    userId: string;
    currentUser: AuthenticatedUser;
    draft?: {
      displayName?: string | null;
      professionalTitle?: string | null;
      bio?: string | null;
      countryCode?: string | null;
      yearsOfExperience?: number | null;
      hasPayoutDestination?: boolean;
      hasPayoutAccountHolderName?: boolean;
      payoutDestination?: PractitionerPayoutDestinationInput | null;
    };
  }) {
    const [profile, user] = await Promise.all([
      this.practitionerProfileRepository.findByUserId(input.userId),
      this.practitionerUserRepository.findProfileSeed(input.userId),
    ]);

    if (!profile && user) {
      const application = await this.practitionerApplicationRepository.findLatestByUserId(input.userId);
      if (!application) throw new NotFoundException({ error: 'PRACTITIONER_APPLICATION_NOT_FOUND' });
      const snapshot = (application.submissionSnapshot ?? {}) as Record<string, any>;
      const profileSnapshot = snapshot.profile ?? {};
      const credentials = await this.practitionerCredentialRepository.listByApplicationId(application.id);
      const credentialSummary = {
        totalCredentials: credentials.length,
        pendingCount: credentials.filter((item) => item.reviewStatus === 'PENDING').length,
        approvedCount: credentials.filter((item) => item.reviewStatus === 'APPROVED').length,
        rejectedCount: credentials.filter((item) => item.reviewStatus === 'REJECTED').length,
        expiredCount: credentials.filter((item) => item.reviewStatus === 'EXPIRED').length,
      };
      const completion = this.practitionerApplicationCompletionService.build({
        displayName: snapshot.applicant?.displayName ?? user.displayName,
        countryCode: profileSnapshot.countryCode ?? null,
        practitionerType: profileSnapshot.practitionerType ?? null,
        practitionerTypeExplicit: profileSnapshot.practitionerTypeExplicit === true,
        practitionerGender: profileSnapshot.practitionerGender ?? null,
        professionalTitle: profileSnapshot.professionalTitle ?? null,
        bio: profileSnapshot.bio ?? null,
        yearsOfExperience: profileSnapshot.yearsOfExperience ?? null,
        languageCount: Array.isArray(snapshot.languageCodes) ? snapshot.languageCodes.length : 0,
        specialtyCount: Array.isArray(snapshot.specialtySelection?.specialties) ? snapshot.specialtySelection.specialties.length : 0,
        primarySpecialtyCategoryId: snapshot.specialtySelection?.primarySpecialtyCategoryId ?? null,
        credentialSummary,
        credentialTypes: credentials.map((item) => item.credentialType),
        credentialRecords: credentials.map((item) => ({ credentialType: item.credentialType, reviewStatus: item.reviewStatus, expiresAt: item.expiresAt, fileUrl: item.fileUrl })),
        payoutDestination: null,
        isAccountActive: input.currentUser.isActive === true,
        isPractitionerOtpVerified: input.currentUser.isPractitionerOtpVerified === true,
        applicationStatus: application.status,
        pricing: { session30: { egp: null, usd: null }, session60: { egp: null, usd: null } },
      });
      return {
        ...completion,
        isApproved: false,
        isProfileComplete: false,
        hasRequiredSpecialty: Array.isArray(snapshot.specialtySelection?.specialties) && snapshot.specialtySelection.specialties.length > 0,
        hasRequiredNormalPricing: false,
        canPublish: false,
        publicationMissingRequirements: ['PRACTITIONER_NOT_APPROVED'],
        checks: {} as any,
        isProfileCompleted: completion.canSubmit,
        canSubmitApplication: completion.canSubmit,
        missingRequirements: completion.blockers.map((item) => item.field).filter((field): field is string => Boolean(field)),
        remediationMissingRequirements: [],
        completion,
        professionalTitle: { approvedValue: null, proposedValue: profileSnapshot.professionalTitle ?? null, requirementStatus: null, reviewStatus: null, publiclyComplete: false, remediationComplete: false },
        payoutCapabilities: getPractitionerPayoutCapabilities(),
      };
    }
    if (!profile || !user) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const [
      languageCount,
      specialtyCount,
      credentialSummary,
      credentialTypes,
      credentials,
      payoutDestination,
      latestApplication,
    ] = await Promise.all([
      this.practitionerLanguageRepository.countByPractitionerId(profile.id),
      this.practitionerSpecialtyRepository.countByPractitionerId(profile.id),
      this.practitionerCredentialRepository.getSummary(profile.id),
      this.practitionerCredentialRepository.listTypesByPractitionerId(
        profile.id,
      ),
      this.practitionerCredentialRepository.listByPractitionerId(profile.id),
      this.practitionerPayoutDestinationRepository.findByPractitionerId(
        profile.id,
      ),
      this.practitionerApplicationRepository.findLatestByPractitionerId(
        profile.id,
      ),
    ]);

    const resolvedPayoutDestination =
      input.draft?.payoutDestination !== undefined
        ? input.draft.payoutDestination
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
              instapayIdentifier: payoutDestination.instapayIdentifier ?? null,
              paypalEmail: payoutDestination.paypalEmail ?? null,
              otherDetails: payoutDestination.otherDetails ?? null,
            }
          : null;
    const resolvedHasPayoutDestination =
      input.draft?.payoutDestination !== undefined
        ? Boolean(input.draft.payoutDestination)
        : Boolean(payoutDestination);
    const resolvedHasPayoutAccountHolderName =
      input.draft?.payoutDestination !== undefined
        ? Boolean(input.draft.payoutDestination?.accountHolderName?.trim())
        : Boolean(payoutDestination?.accountHolderName?.trim());
    const completionPayoutDestination = resolvedPayoutDestination
      ? {
          methodType: resolvedPayoutDestination.methodType ?? null,
          countryCode: resolvedPayoutDestination.countryCode ?? null,
          accountHolderName:
            resolvedPayoutDestination.accountHolderName ?? null,
          bankName: resolvedPayoutDestination.bankName ?? null,
          bankAccountNumber:
            maskPayoutIdentifier(resolvedPayoutDestination.bankAccountNumber),
          iban: maskPayoutIdentifier(resolvedPayoutDestination.iban),
          walletProvider: resolvedPayoutDestination.walletProvider ?? null,
          walletIdentifier: maskPayoutIdentifier(resolvedPayoutDestination.walletIdentifier),
          instapayIdentifier: maskPayoutIdentifier(resolvedPayoutDestination.instapayIdentifier),
          paypalEmail: maskPayoutEmail(resolvedPayoutDestination.paypalEmail),
          otherDetails: resolvedPayoutDestination.otherDetails ? '[stored]' : null,
        }
      : null;
    const requiredDocuments = this.practitionerRequiredDocumentsService.evaluate(
      credentials.map((credential) => ({
        credentialType: credential.credentialType,
        reviewStatus: credential.reviewStatus,
        expiresAt: credential.expiresAt,
        fileUrl: credential.fileUrl,
      })),
      { countryCode: profile.country?.isoCode ?? null },
    );
    const hasIdentityEvidence = requiredDocuments.groups.identity.complete;
    const hasAcademicCertificate = requiredDocuments.groups.academic.complete;
    const hasProfessionalAuthorization = requiredDocuments.groups.professionalAuthorization.complete;

    const activeChangeCase = await this.practitionerReviewCaseService.findActiveChangeCase(profile.id);
    const proposedProfile = activeChangeCase?.proposedSnapshot &&
      typeof activeChangeCase.proposedSnapshot === 'object' &&
      !Array.isArray(activeChangeCase.proposedSnapshot)
      ? (activeChangeCase.proposedSnapshot as Record<string, any>).profile
      : null;
    const proposedProfessionalTitle =
      proposedProfile && typeof proposedProfile.professionalTitle === 'string'
        ? proposedProfile.professionalTitle
        : null;
    const titleRequirement = activeChangeCase?.requirements.find(
      (requirement) =>
        requirement.section === 'PROFILE' &&
        requirement.fieldPath === 'professionalTitle',
    );
    const readiness = this.practitionerProfileReadinessPolicy.evaluate({
      displayName:
        input.draft?.displayName !== undefined
          ? input.draft.displayName
          : user.displayName,
      professionalTitle:
        input.draft?.professionalTitle !== undefined
          ? input.draft.professionalTitle
          : profile.professionalTitle,
      bio: input.draft?.bio !== undefined ? input.draft.bio : profile.bio,
      countryCode:
        input.draft?.countryCode !== undefined
          ? input.draft.countryCode
          : (profile.country?.isoCode ?? null),
      yearsOfExperience:
        input.draft?.yearsOfExperience !== undefined
          ? input.draft.yearsOfExperience
          : profile.yearsOfExperience,
      languageCount,
      specialtyCount,
      primarySpecialtyCategoryId: profile.primarySpecialtyCategoryId ?? null,
      credentialCount: credentialSummary.totalCredentials,
      hasIdentityEvidence,
      hasAcademicCertificate,
      hasProfessionalAuthorization,
      hasPayoutDestination:
        input.draft?.hasPayoutDestination ?? resolvedHasPayoutDestination,
      hasPayoutAccountHolderName:
        input.draft?.hasPayoutAccountHolderName ??
        resolvedHasPayoutAccountHolderName,
      isAccountActive: input.currentUser.isActive === true,
      isPractitionerOtpVerified:
        input.currentUser.isPractitionerOtpVerified === true,
    });
    const isApproved = profile.status === 'APPROVED';
    const isProfileComplete = Boolean(
      user.displayName?.trim() &&
      profile.publicSlug?.trim() &&
      profile.professionalTitle?.trim() &&
      profile.bio?.trim(),
    );
    const hasRequiredSpecialty = specialtyCount > 0;
    const hasRequiredNormalPricing = hasRequiredPractitionerPricing(profile);
    const publicationMissingRequirements = [
      ...(isApproved ? [] : ['PRACTITIONER_NOT_APPROVED']),
      ...(user.status === 'ACTIVE' ? [] : ['ACCOUNT_NOT_ACTIVE']),
      ...(profile.publicSlug?.trim() ? [] : ['PUBLIC_SLUG_REQUIRED']),
      ...(user.displayName?.trim() ? [] : ['DISPLAY_NAME_REQUIRED']),
      ...(profile.professionalTitle?.trim() ? [] : ['PROFESSIONAL_TITLE_REQUIRED']),
      ...(profile.bio?.trim() ? [] : ['BIO_REQUIRED']),
      ...(hasRequiredSpecialty ? [] : ['ACTIVE_SPECIALTY_REQUIRED']),
      ...(hasRequiredNormalPricing ? [] : ['REQUIRED_PRICING_MISSING']),
    ];
    const remediationReadiness = this.practitionerProfileReadinessPolicy.evaluate({
      displayName:
        input.draft?.displayName !== undefined
          ? input.draft.displayName
          : user.displayName,
      professionalTitle:
        input.draft?.professionalTitle !== undefined
          ? input.draft.professionalTitle
          : (proposedProfessionalTitle ?? profile.professionalTitle),
      bio: input.draft?.bio !== undefined ? input.draft.bio : profile.bio,
      countryCode:
        input.draft?.countryCode !== undefined
          ? input.draft.countryCode
          : (profile.country?.isoCode ?? null),
      yearsOfExperience:
        input.draft?.yearsOfExperience !== undefined
          ? input.draft.yearsOfExperience
          : profile.yearsOfExperience,
      languageCount,
      specialtyCount,
      primarySpecialtyCategoryId: profile.primarySpecialtyCategoryId ?? null,
      credentialCount: credentialSummary.totalCredentials,
      hasIdentityEvidence,
      hasAcademicCertificate,
      hasProfessionalAuthorization,
      hasPayoutDestination:
        input.draft?.hasPayoutDestination ?? resolvedHasPayoutDestination,
      hasPayoutAccountHolderName:
        input.draft?.hasPayoutAccountHolderName ??
        resolvedHasPayoutAccountHolderName,
      isAccountActive: input.currentUser.isActive === true,
      isPractitionerOtpVerified:
        input.currentUser.isPractitionerOtpVerified === true,
    });

    return {
      ...readiness,
      isApproved,
      isProfileComplete,
      hasRequiredSpecialty,
      hasRequiredNormalPricing,
      canPublish: publicationMissingRequirements.length === 0,
      publicationMissingRequirements,
      remediationMissingRequirements: remediationReadiness.missingRequirements,
      professionalTitle: {
        approvedValue: profile.professionalTitle,
        proposedValue: proposedProfessionalTitle,
        requirementStatus: titleRequirement?.status ?? null,
        reviewStatus: activeChangeCase?.status ?? null,
        publiclyComplete: Boolean(profile.professionalTitle?.trim()),
        remediationComplete: remediationReadiness.checks.hasProfessionalTitle,
      },
      completion: this.practitionerApplicationCompletionService.build({
        displayName:
          input.draft?.displayName !== undefined
            ? input.draft.displayName
            : user.displayName,
        countryCode:
          input.draft?.countryCode !== undefined
            ? input.draft.countryCode
            : (profile.country?.isoCode ?? null),
        practitionerType: profile.practitionerType,
        practitionerGender: profile.practitionerGender ?? null,
        professionalTitle:
          input.draft?.professionalTitle !== undefined
            ? input.draft.professionalTitle
            : (proposedProfessionalTitle ?? profile.professionalTitle),
        bio: input.draft?.bio !== undefined ? input.draft.bio : profile.bio,
        yearsOfExperience:
          input.draft?.yearsOfExperience !== undefined
            ? input.draft.yearsOfExperience
            : profile.yearsOfExperience,
        languageCount,
        specialtyCount,
        primarySpecialtyCategoryId: profile.primarySpecialtyCategoryId ?? null,
        credentialSummary,
        credentialTypes,
        credentialRecords: credentials.map((credential) => ({
          credentialType: credential.credentialType,
          reviewStatus: credential.reviewStatus,
          expiresAt: credential.expiresAt,
          fileUrl: credential.fileUrl,
        })),
        payoutDestination: completionPayoutDestination,
        isAccountActive: input.currentUser.isActive === true,
        isPractitionerOtpVerified:
          input.currentUser.isPractitionerOtpVerified === true,
        applicationStatus: latestApplication?.status ?? null,
        pricing: {
          session30: {
            egp:
              profile.sessionPrice30Egp === null ||
              profile.sessionPrice30Egp === undefined
                ? null
                : Number(profile.sessionPrice30Egp),
            usd:
              profile.sessionPrice30Usd === null ||
              profile.sessionPrice30Usd === undefined
                ? null
                : Number(profile.sessionPrice30Usd),
          },
          session60: {
            egp:
              profile.sessionPrice60Egp === null ||
              profile.sessionPrice60Egp === undefined
                ? null
                : Number(profile.sessionPrice60Egp),
            usd:
              profile.sessionPrice60Usd === null ||
              profile.sessionPrice60Usd === undefined
                ? null
                : Number(profile.sessionPrice60Usd),
          },
        },
      }),
      payoutCapabilities: getPractitionerPayoutCapabilities(),
    };
  }

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
  }) {
    const readiness = await this.evaluate({
      userId: input.userId,
      currentUser: input.currentUser,
    });

    return {
      message: this.i18nService.t(
        'practitioners.success.readinessFetched',
        input.locale,
      ),
      readiness,
    };
  }
}
