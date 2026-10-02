import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationMapper } from '../mappers/practitioner-application.mapper';
import { PractitionerProfileMapper } from '../mappers/practitioner-profile.mapper';
import { maskPayoutEmail, maskPayoutIdentifier } from '../utils/mask-payout-destination.util';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerLanguageRepository } from '../repositories/practitioner-language.repository';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { SpecialtyRepository } from '../repositories/specialty.repository';
import { GetPractitionerProfileReadinessUseCase } from './get-practitioner-profile-readiness.use-case';
import { PractitionerReviewCaseService } from '../services/practitioner-review-case.service';
import { Optional } from '@nestjs/common';
import { PractitionerProfessionalContentRepository } from '../repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentAuthoringService } from '../services/practitioner-professional-content-authoring.service';

/**
 * Current practitioner profile read model for product-facing UI.
 * This combines profile basics, specialties, readiness, credential summary, and latest application status.
 */
@Injectable()
export class GetPractitionerProfileUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerUserRepository: PractitionerUserRepository,
    private readonly practitionerLanguageRepository: PractitionerLanguageRepository,
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerApplicationRepository: PractitionerApplicationRepository,
    private readonly practitionerProfileMapper: PractitionerProfileMapper,
    private readonly practitionerApplicationMapper: PractitionerApplicationMapper,
    private readonly getPractitionerProfileReadinessUseCase: GetPractitionerProfileReadinessUseCase,
    private readonly practitionerReviewCaseService: PractitionerReviewCaseService,
    @Optional()
    private readonly professionalContentRepository?: PractitionerProfessionalContentRepository,
    @Optional()
    private readonly professionalContentAuthoringService?: PractitionerProfessionalContentAuthoringService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
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

    const professionalContentState = this.professionalContentRepository
      ? await this.professionalContentRepository.findByPractitionerProfileId(
          profile.id,
        )
      : null;

    const [
      readiness,
      languageLinks,
      specialties,
      credentialSummary,
      latestApp,
      reviewCase,
    ] = await Promise.all([
      this.getPractitionerProfileReadinessUseCase.evaluate({
        userId: input.userId,
        currentUser: input.currentUser,
      }),
      this.practitionerLanguageRepository.listCodesByPractitionerId(profile.id),
      this.specialtyRepository.listByPractitionerId(profile.id, input.locale),
      this.practitionerCredentialRepository.getSummary(profile.id),
      this.practitionerApplicationRepository.findLatestByPractitionerId(
        profile.id,
      ),
      this.practitionerReviewCaseService.findActiveChangeCase(profile.id),
    ]);

    const mappedSpecialties = specialties.map((link) => ({
      specialtyId: link.specialtyId,
      slug: link.specialty.slug,
      title:
        link.specialty.translations.find((item) => item.locale === input.locale)
          ?.title ??
        link.specialty.translations.find((item) => item.locale === 'en')
          ?.title ??
        null,
      isPrimary: link.isPrimary,
    }));

    const mappedLanguages = languageLinks.map((item) => item.language.code);

    return {
      message: this.i18nService.t(
        'practitioners.success.profileFetched',
        input.locale,
      ),
      profile: this.practitionerProfileMapper.toViewModel({
        profile: {
          ...profile,
          practitionerGender: profile.practitionerGender ?? null,
          primarySpecialtyCategoryId:
            profile.primarySpecialtyCategoryId ?? null,
          sessionPrice30Egp: profile.sessionPrice30Egp ?? null,
          sessionPrice30Usd: profile.sessionPrice30Usd ?? null,
          sessionPrice60Egp: profile.sessionPrice60Egp ?? null,
          sessionPrice60Usd: profile.sessionPrice60Usd ?? null,
          instantBookingPrice30Egp: profile.instantBookingPrice30Egp ?? null,
          instantBookingPrice30Usd: profile.instantBookingPrice30Usd ?? null,
          instantBookingPrice60Egp: profile.instantBookingPrice60Egp ?? null,
          instantBookingPrice60Usd: profile.instantBookingPrice60Usd ?? null,
          professionalContent:
            professionalContentState && this.professionalContentAuthoringService
              ? this.professionalContentAuthoringService.toSnapshot(
                  professionalContentState,
                )
              : null,
          primaryContentLocale:
            professionalContentState?.primaryContentLocale ?? null,
          payoutDestination: profile.payoutDestination
            ? {
                methodType: profile.payoutDestination.methodType,
                countryCode: profile.payoutDestination.countryCode ?? null,
                accountHolderName:
                  profile.payoutDestination.accountHolderName ?? null,
                bankName: profile.payoutDestination.bankName ?? null,
                bankAccountNumber:
                  maskPayoutIdentifier(profile.payoutDestination.bankAccountNumber),
                iban: maskPayoutIdentifier(profile.payoutDestination.iban),
                walletProvider:
                  profile.payoutDestination.walletProvider ?? null,
                walletIdentifier:
                  maskPayoutIdentifier(profile.payoutDestination.walletIdentifier),
                instapayIdentifier: maskPayoutIdentifier(profile.payoutDestination.instapayIdentifier),
                paypalEmail: maskPayoutEmail(profile.payoutDestination.paypalEmail),
                otherDetails: profile.payoutDestination.otherDetails ? '[stored]' : null,
              }
            : null,
        },
        user,
        languages: mappedLanguages,
        specialties: mappedSpecialties,
        readiness,
        applicationStatusSummary: latestApp
          ? this.practitionerApplicationMapper.toViewModel({
              id: latestApp.id,
              status: latestApp.status,
              submittedAt: latestApp.submittedAt,
              reviewedAt: latestApp.reviewedAt,
              reviewedByUserId: latestApp.reviewedByUserId ?? null,
              reviewDecisionReason: latestApp.reviewDecisionReason ?? null,
              reviewNotes: latestApp.reviewNotes ?? null,
              submissionSnapshot:
                (latestApp.submissionSnapshot as Record<
                  string,
                  unknown
                > | null) ?? null,
              completion: readiness.completion,
              reviewCase,
            })
          : this.practitionerApplicationMapper.empty(),
        credentialSummary,
      }),
    };
  }
}
