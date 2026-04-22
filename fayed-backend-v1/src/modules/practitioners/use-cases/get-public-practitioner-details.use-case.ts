import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';

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
  ) {}

  async execute(input: { slug: string; locale: SupportedLocale }) {
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
        yearsExperience: profile.yearsOfExperience ?? null,
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
