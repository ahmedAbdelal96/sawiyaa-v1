import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfileReadinessPolicy } from '../policies/practitioner-profile-readiness.policy';
import { PractitionerApplicationCompletionService } from '../services/practitioner-application-completion.service';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerLanguageRepository } from '../repositories/practitioner-language.repository';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerPayoutDestinationRepository } from '../repositories/practitioner-payout-destination.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerSpecialtyRepository } from '../repositories/practitioner-specialty.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { PractitionerPayoutDestinationInput } from '../types/practitioner.types';

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
    private readonly practitionerApplicationCompletionService: PractitionerApplicationCompletionService,
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
      payoutDestination,
      latestApplication,
    ] = await Promise.all([
      this.practitionerLanguageRepository.countByPractitionerId(profile.id),
      this.practitionerSpecialtyRepository.countByPractitionerId(profile.id),
      this.practitionerCredentialRepository.getSummary(profile.id),
      this.practitionerCredentialRepository.listTypesByPractitionerId(
        profile.id,
      ),
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
            resolvedPayoutDestination.bankAccountNumber ?? null,
          iban: resolvedPayoutDestination.iban ?? null,
          walletProvider: resolvedPayoutDestination.walletProvider ?? null,
          walletIdentifier: resolvedPayoutDestination.walletIdentifier ?? null,
          otherDetails: resolvedPayoutDestination.otherDetails ?? null,
        }
      : null;
    const credentialTypeSet = new Set(credentialTypes as string[]);
    const hasIdentityEvidence =
      credentialTypeSet.has('PASSPORT') ||
      credentialTypeSet.has('NATIONAL_ID') ||
      (credentialTypeSet.has('NATIONAL_ID_FRONT') &&
        credentialTypeSet.has('NATIONAL_ID_BACK'));
    const hasAcademicCertificate = credentialTypeSet.has('DEGREE');

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
            : profile.professionalTitle,
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
