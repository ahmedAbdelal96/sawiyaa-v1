import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CountryRepository } from '../repositories/country.repository';
import { LanguageRepository } from '../repositories/language.repository';
import { PractitionerLanguageRepository } from '../repositories/practitioner-language.repository';
import { PractitionerPayoutDestinationRepository } from '../repositories/practitioner-payout-destination.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { PractitionerPayoutDestinationValidationService } from '../services/practitioner-payout-destination-validation.service';
import { UpdatePractitionerProfileInput } from '../types/practitioner.types';
import { normalizePractitionerProfileInput } from '../utils/normalize-practitioner-profile-input.util';
import { CreatePractitionerProfileUseCase } from './create-practitioner-profile.use-case';
import { GetPractitionerProfileUseCase } from './get-practitioner-profile.use-case';

/**
 * Profile update orchestrates practitioner profile + user preference writes in one transaction.
 * Language linkage updates are also handled here to keep baseline completion data in sync.
 */
@Injectable()
export class UpdatePractitionerProfileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly createPractitionerProfileUseCase: CreatePractitionerProfileUseCase,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerUserRepository: PractitionerUserRepository,
    private readonly practitionerLanguageRepository: PractitionerLanguageRepository,
    private readonly practitionerPayoutDestinationRepository: PractitionerPayoutDestinationRepository,
    private readonly countryRepository: CountryRepository,
    private readonly languageRepository: LanguageRepository,
    private readonly practitionerPayoutDestinationValidationService: PractitionerPayoutDestinationValidationService,
    private readonly getPractitionerProfileUseCase: GetPractitionerProfileUseCase,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
    data: UpdatePractitionerProfileInput;
  }) {
    const normalizedInput = normalizePractitionerProfileInput(input.data);
    this.practitionerPayoutDestinationValidationService.validate(
      normalizedInput.payoutDestination,
    );

    const country =
      normalizedInput.countryCode === undefined
        ? undefined
        : normalizedInput.countryCode === null
          ? null
          : await this.countryRepository.findByIsoCode(
              normalizedInput.countryCode,
            );

    if (normalizedInput.countryCode && !country) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.countryNotFound',
        error: 'PRACTITIONER_COUNTRY_NOT_FOUND',
      });
    }

    const languageCodes = normalizedInput.languageCodes
      ? [...new Set(normalizedInput.languageCodes)]
      : undefined;

    let resolvedLanguages:
      | Array<{
          id: string;
          code: string;
        }>
      | undefined;

    if (languageCodes !== undefined) {
      resolvedLanguages =
        await this.languageRepository.findActiveByCodes(languageCodes);

      if (resolvedLanguages.length !== languageCodes.length) {
        throw new BadRequestException({
          messageKey: 'practitioners.errors.languageNotFound',
          error: 'PRACTITIONER_LANGUAGE_NOT_FOUND',
        });
      }
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const profile = await this.createPractitionerProfileUseCase.execute(
        input.userId,
        tx,
      );

      await this.practitionerProfileRepository.updateByUserId(
        input.userId,
        {
          professionalTitle: normalizedInput.professionalTitle,
          bio: normalizedInput.bio,
          yearsOfExperience: normalizedInput.yearsOfExperience,
          practitionerType: normalizedInput.practitionerType,
          practitionerGender: normalizedInput.practitionerGender,
          countryId:
            country === undefined ? undefined : country ? country.id : null,
        },
        tx,
      );

      await this.practitionerUserRepository.updateProfilePreferences(
        input.userId,
        {
          displayName: normalizedInput.displayName,
          defaultLocale: normalizedInput.locale,
          timezone: normalizedInput.timezone,
        },
        tx,
      );

      if (resolvedLanguages !== undefined) {
        await this.practitionerLanguageRepository.replaceAll(
          profile.id,
          resolvedLanguages.map((language, index) => ({
            languageId: language.id,
            isPrimary: index === 0,
          })),
          tx,
        );
      }

      if (normalizedInput.payoutDestination !== undefined) {
        await this.practitionerPayoutDestinationRepository.upsert(
          profile.id,
          normalizedInput.payoutDestination,
          tx,
        );
      }
    });

    const updated = await this.getPractitionerProfileUseCase.execute({
      userId: input.userId,
      locale: input.locale,
      currentUser: input.currentUser,
    });

    return {
      message: this.i18nService.t(
        'practitioners.success.profileUpdated',
        input.locale,
      ),
      profile: updated.profile,
    };
  }
}
