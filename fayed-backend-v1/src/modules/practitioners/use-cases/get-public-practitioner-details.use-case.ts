import { Injectable, NotFoundException } from '@nestjs/common';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import { resolvePublicPractitionerPricing } from '../utils/public-practitioner-pricing.util';

type PublicPractitionerPricingProfile = {
  sessionPrice30Egp: string | { toString(): string } | null;
  sessionPrice30Usd: string | { toString(): string } | null;
  sessionPrice60Egp: string | { toString(): string } | null;
  sessionPrice60Usd: string | { toString(): string } | null;
};

/**
 * Public details use case based on SEO-friendly practitioner slug.
 * Public contract intentionally avoids exposing email/phone/admin/review internals.
 */
@Injectable()
export class GetPublicPractitionerDetailsUseCase {
  constructor(
    private readonly mapper: PublicPractitionerMapper,
    private readonly visibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly publicReadRepository: PublicPractitionerReadRepository,
    private readonly patientProfileRepository: PatientProfileRepository,
  ) {}

  async execute(input: {
    slug: string;
    locale: SupportedLocale;
    currentUserId?: string | null;
  }) {
    const patientProfile = input.currentUserId
      ? await this.patientProfileRepository.findByUserId(input.currentUserId)
      : null;
    const regionalResolution = resolvePaymentRegionalResolution({
      patientCountryIsoCode: patientProfile?.country?.isoCode ?? null,
    });

    const profile = await this.publicReadRepository.findByPublicSlug(
      input.slug,
      input.locale,
    );

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.publicProfileNotFound',
        error: 'PUBLIC_PRACTITIONER_NOT_FOUND',
      });
    }

    const visibility = this.visibilityPolicy.evaluate({
      practitionerStatus: profile.status,
      userStatus: profile.user.status,
      isPublicProfilePublished: profile.isPublicProfilePublished,
      hasPublicSlug: Boolean(profile.publicSlug?.trim()),
      hasDisplayName: Boolean(profile.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(profile.professionalTitle?.trim()),
      hasBio: Boolean(profile.bio?.trim()),
      hasAtLeastOneActiveSpecialty: profile.specialties.length > 0,
    });

    if (!visibility.isVisible) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.publicProfileNotFound',
        error: 'PUBLIC_PRACTITIONER_NOT_VISIBLE',
      });
    }

    const approvedCredentials =
      await this.publicReadRepository.countApprovedCredentials(profile.id);
    const averageRatingRaw = profile.ratingSummary?.averageRating;
    const pricingProfile = profile as typeof profile &
      PublicPractitionerPricingProfile;

    return {
      item: this.mapper.toDetails({
        id: profile.id,
        slug: profile.publicSlug,
        displayName: profile.user.displayName ?? null,
        professionalTitle: profile.professionalTitle ?? null,
        fullBio: profile.bio ?? null,
        specialties: profile.specialties.map((link) => ({
          specialtyId: link.specialtyId,
          slug: link.specialty.slug,
          title: this.mapper.pickLocalizedTitle(
            link.specialty.translations,
            input.locale,
          ),
          isPrimary: link.isPrimary,
        })),
        languages: profile.languages.map((item) => item.language.code),
        countryCode: profile.country?.isoCode ?? null,
        ...resolvePublicPractitionerPricing({
          regionalResolution,
          sessionPrice30Egp: pricingProfile.sessionPrice30Egp,
          sessionPrice30Usd: pricingProfile.sessionPrice30Usd,
          sessionPrice60Egp: pricingProfile.sessionPrice60Egp,
          sessionPrice60Usd: pricingProfile.sessionPrice60Usd,
        }),
        yearsExperience: profile.yearsOfExperience ?? null,
        pricing: {
          session30: {
            egp:
              pricingProfile.sessionPrice30Egp === null ||
              pricingProfile.sessionPrice30Egp === undefined
                ? null
                : Number(pricingProfile.sessionPrice30Egp),
            usd:
              pricingProfile.sessionPrice30Usd === null ||
              pricingProfile.sessionPrice30Usd === undefined
                ? null
                : Number(pricingProfile.sessionPrice30Usd),
          },
          session60: {
            egp:
              pricingProfile.sessionPrice60Egp === null ||
              pricingProfile.sessionPrice60Egp === undefined
                ? null
                : Number(pricingProfile.sessionPrice60Egp),
            usd:
              pricingProfile.sessionPrice60Usd === null ||
              pricingProfile.sessionPrice60Usd === undefined
                ? null
                : Number(pricingProfile.sessionPrice60Usd),
          },
        },
        sessionPrice30:
          profile.sessionPrice30 === null ||
          profile.sessionPrice30 === undefined
            ? null
            : Number(profile.sessionPrice30),
        sessionPrice60:
          profile.sessionPrice60 === null ||
          profile.sessionPrice60 === undefined
            ? null
            : Number(profile.sessionPrice60),
        sessionPrice30Egp:
          pricingProfile.sessionPrice30Egp === null ||
          pricingProfile.sessionPrice30Egp === undefined
            ? null
            : Number(pricingProfile.sessionPrice30Egp),
        sessionPrice30Usd:
          pricingProfile.sessionPrice30Usd === null ||
          pricingProfile.sessionPrice30Usd === undefined
            ? null
            : Number(pricingProfile.sessionPrice30Usd),
        sessionPrice60Egp:
          pricingProfile.sessionPrice60Egp === null ||
          pricingProfile.sessionPrice60Egp === undefined
            ? null
            : Number(pricingProfile.sessionPrice60Egp),
        sessionPrice60Usd:
          pricingProfile.sessionPrice60Usd === null ||
          pricingProfile.sessionPrice60Usd === undefined
            ? null
            : Number(pricingProfile.sessionPrice60Usd),
        ratingSummary: {
          averageRating:
            averageRatingRaw === null || averageRatingRaw === undefined
              ? null
              : Number(averageRatingRaw),
          totalReviews: profile.ratingSummary?.publishedReviewsCount ?? 0,
        },
        credentialsSummary: {
          totalCredentials: profile._count.credentials,
          approvedCredentials,
        },
        isVerified: visibility.isVerified,
        avatarUrl: profile.avatarUrl ?? null,
      }),
    };
  }
}
