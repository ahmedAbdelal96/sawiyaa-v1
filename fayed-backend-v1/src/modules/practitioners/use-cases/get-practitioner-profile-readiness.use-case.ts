import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfileReadinessPolicy } from '../policies/practitioner-profile-readiness.policy';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerLanguageRepository } from '../repositories/practitioner-language.repository';
import { PractitionerPayoutDestinationRepository } from '../repositories/practitioner-payout-destination.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerSpecialtyRepository } from '../repositories/practitioner-specialty.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';

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
    private readonly practitionerProfileReadinessPolicy: PractitionerProfileReadinessPolicy,
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
      payoutDestination,
    ] = await Promise.all([
      this.practitionerLanguageRepository.countByPractitionerId(profile.id),
      this.practitionerSpecialtyRepository.countByPractitionerId(profile.id),
      this.practitionerCredentialRepository.getSummary(profile.id),
      this.practitionerPayoutDestinationRepository.findByPractitionerId(
        profile.id,
      ),
    ]);

    return this.practitionerProfileReadinessPolicy.evaluate({
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
          : profile.country?.isoCode ?? null,
      yearsOfExperience:
        input.draft?.yearsOfExperience !== undefined
          ? input.draft.yearsOfExperience
          : profile.yearsOfExperience,
      languageCount,
      specialtyCount,
      primarySpecialtyCategoryId: profile.primarySpecialtyCategoryId ?? null,
      credentialCount: credentialSummary.totalCredentials,
      hasPayoutDestination:
        input.draft?.hasPayoutDestination ?? Boolean(payoutDestination),
      hasPayoutAccountHolderName:
        input.draft?.hasPayoutAccountHolderName ??
        Boolean(payoutDestination?.accountHolderName?.trim()),
      isAccountActive: input.currentUser.isActive === true,
      isPractitionerOtpVerified:
        input.currentUser.isPractitionerOtpVerified === true,
    });
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
