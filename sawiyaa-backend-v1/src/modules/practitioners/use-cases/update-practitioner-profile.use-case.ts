import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PractitionerStatus } from '@prisma/client';
import { ConfigResolverService } from '@modules/config/services/config-resolver.service';
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
    private readonly configResolverService: ConfigResolverService,
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

  private resolvePackageAvailabilityMissingRequirements(input: {
    profile: {
      status: PractitionerStatus;
      acceptsPackages: boolean;
      sessionPrice30Egp: { toString(): string } | string | null;
      sessionPrice30Usd: { toString(): string } | string | null;
      sessionPrice60Egp: { toString(): string } | string | null;
      sessionPrice60Usd: { toString(): string } | string | null;
    };
    currentUser: AuthenticatedUser;
    packagesEnabled: boolean | null | undefined;
    packagePurchasesEnabled: boolean | null | undefined;
    proposedPrices: {
      sessionPrice30Egp: { toString(): string } | string | null;
      sessionPrice30Usd: { toString(): string } | string | null;
      sessionPrice60Egp: { toString(): string } | string | null;
      sessionPrice60Usd: { toString(): string } | string | null;
    };
  }) {
    const missingRequirements: string[] = [];

    const isPresent = (value: { toString(): string } | string | null) =>
      value !== null && value !== undefined && String(value).trim().length > 0;

    if (input.currentUser.isActive !== true) {
      missingRequirements.push('activeAccount');
    }

    if (input.profile.status !== PractitionerStatus.APPROVED) {
      missingRequirements.push('approvedProfile');
    }

    if (input.packagesEnabled === false) {
      missingRequirements.push('packagesEnabled');
    }

    if (input.packagePurchasesEnabled === false) {
      missingRequirements.push('packagePurchasesEnabled');
    }

    if (!isPresent(input.proposedPrices.sessionPrice30Egp)) {
      missingRequirements.push('sessionPrice30Egp');
    }

    if (!isPresent(input.proposedPrices.sessionPrice30Usd)) {
      missingRequirements.push('sessionPrice30Usd');
    }

    if (!isPresent(input.proposedPrices.sessionPrice60Egp)) {
      missingRequirements.push('sessionPrice60Egp');
    }

    if (!isPresent(input.proposedPrices.sessionPrice60Usd)) {
      missingRequirements.push('sessionPrice60Usd');
    }

    return missingRequirements;
  }

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

    const [packagesEnabled, packagePurchasesEnabled] = await Promise.all([
      this.configResolverService.getBoolean('packages.enabled'),
      this.configResolverService.getBoolean('packages.purchaseEnabled'),
    ]);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const profile = await this.createPractitionerProfileUseCase.execute(
        input.userId,
        tx,
      );

      const wantsPackageAvailability =
        normalizedInput.acceptsPackage === true &&
        normalizedInput.acceptsPackage !== profile.acceptsPackages;

      if (wantsPackageAvailability) {
        const missingRequirements =
          this.resolvePackageAvailabilityMissingRequirements({
            profile,
            currentUser: input.currentUser,
            packagesEnabled,
            packagePurchasesEnabled,
            proposedPrices: {
              sessionPrice30Egp:
                normalizedInput.sessionPrice30Egp === undefined
                  ? profile.sessionPrice30Egp
                  : normalizedInput.sessionPrice30Egp,
              sessionPrice30Usd:
                normalizedInput.sessionPrice30Usd === undefined
                  ? profile.sessionPrice30Usd
                  : normalizedInput.sessionPrice30Usd,
              sessionPrice60Egp:
                normalizedInput.sessionPrice60Egp === undefined
                  ? profile.sessionPrice60Egp
                  : normalizedInput.sessionPrice60Egp,
              sessionPrice60Usd:
                normalizedInput.sessionPrice60Usd === undefined
                  ? profile.sessionPrice60Usd
                  : normalizedInput.sessionPrice60Usd,
            },
          });

        if (missingRequirements.length > 0) {
          throw new BadRequestException({
            messageKey:
              'practitioners.errors.packageAvailabilityRequirementsNotMet',
            error: 'PRACTITIONER_PACKAGE_AVAILABILITY_REQUIREMENTS_NOT_MET',
            details: {
              missingRequirements,
            },
          });
        }
      }

      await this.practitionerProfileRepository.updateByUserId(
        input.userId,
        {
          professionalTitle: normalizedInput.professionalTitle,
          bio: normalizedInput.bio,
          yearsOfExperience: normalizedInput.yearsOfExperience,
          practitionerType: normalizedInput.practitionerType,
          practitionerGender: normalizedInput.practitionerGender,
          sessionPrice30Egp: normalizedInput.sessionPrice30Egp,
          sessionPrice30Usd: normalizedInput.sessionPrice30Usd,
          sessionPrice60Egp: normalizedInput.sessionPrice60Egp,
          sessionPrice60Usd: normalizedInput.sessionPrice60Usd,
          instantBookingPrice30Egp: normalizedInput.instantBookingPrice30Egp,
          instantBookingPrice30Usd: normalizedInput.instantBookingPrice30Usd,
          instantBookingPrice60Egp: normalizedInput.instantBookingPrice60Egp,
          instantBookingPrice60Usd: normalizedInput.instantBookingPrice60Usd,
          acceptsPackages: normalizedInput.acceptsPackage,
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
