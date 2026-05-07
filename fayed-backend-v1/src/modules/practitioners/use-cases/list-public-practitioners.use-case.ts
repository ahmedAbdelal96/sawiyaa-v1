import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  PublicPractitionerGender,
  PublicPractitionerKind,
  PublicPractitionerSessionDuration,
  PublicPractitionerSortBy,
} from '../dto/list-public-practitioners.dto';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';

type PublicPractitionerPricingProfile = {
  sessionPrice30Egp: string | { toString(): string } | null;
  sessionPrice30Usd: string | { toString(): string } | null;
  sessionPrice60Egp: string | { toString(): string } | null;
  sessionPrice60Usd: string | { toString(): string } | null;
};

/**
 * Public listing use case for practitioner pages.
 * This flow is public/no-auth and returns only public-safe fields.
 */
@Injectable()
export class ListPublicPractitionersUseCase {
  constructor(
    private readonly mapper: PublicPractitionerMapper,
    private readonly visibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly publicReadRepository: PublicPractitionerReadRepository,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    search?: string;
    specialtySlug?: string;
    language?: string;
    country?: string;
    practitionerKind?: PublicPractitionerKind;
    gender?: PublicPractitionerGender;
    duration?: PublicPractitionerSessionDuration;
    onlineNow?: boolean;
    availableToday?: boolean;
    availableThisWeek?: boolean;
    acceptsCoupon?: boolean;
    acceptsPackage?: boolean;
    minRating?: number;
    minSessionFee?: number;
    maxSessionFee?: number;
    sort?: PublicPractitionerSortBy;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const { rows, total } = await this.publicReadRepository.listPublic({
      locale: input.locale,
      search: input.search,
      specialtySlug: input.specialtySlug,
      language: input.language,
      country: input.country,
      practitionerKind: input.practitionerKind,
      gender: input.gender,
      duration: input.duration,
      onlineNow: input.onlineNow,
      availableToday: input.availableToday,
      availableThisWeek: input.availableThisWeek,
      acceptsCoupon: input.acceptsCoupon,
      acceptsPackage: input.acceptsPackage,
      minRating: input.minRating,
      minSessionFee: input.minSessionFee,
      maxSessionFee: input.maxSessionFee,
      sort: input.sort,
      skip,
      take: limit,
    });

    const practitioners = rows
      .map((profile) => {
        const pricingProfile = profile as typeof profile &
          PublicPractitionerPricingProfile;
        const averageRatingRaw = profile.ratingSummary?.averageRating;
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
          return null;
        }

        return this.mapper.toListItem({
          id: profile.id,
          slug: profile.publicSlug,
          displayName: profile.user.displayName ?? null,
          professionalTitle: profile.professionalTitle ?? null,
          bioSnippet: this.mapper.toBioSnippet(profile.bio ?? null),
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
          practitionerType: profile.practitionerType,
          practitionerGender: profile.practitionerGender ?? null,
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
          isOnlineNow: profile.presence?.status === 'ONLINE',
          acceptsCoupon:
            profile.coupons?.some(
              (coupon) =>
                coupon.isActive &&
                coupon.status === 'APPROVED' &&
                (!coupon.startsAt || coupon.startsAt <= new Date()) &&
                (!coupon.endsAt || coupon.endsAt >= new Date()),
            ) ?? false,
          acceptsPackage: profile.acceptsPackages,
          yearsExperience: profile.yearsOfExperience ?? null,
          ratingSummary: {
            averageRating:
              averageRatingRaw === null || averageRatingRaw === undefined
                ? null
                : Number(averageRatingRaw),
            totalReviews: profile.ratingSummary?.publishedReviewsCount ?? 0,
          },
          avatarUrl: profile.avatarUrl ?? null,
          isVerified: visibility.isVerified,
        });
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items: practitioners,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
