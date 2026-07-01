import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { isPresenceEffectivelyOnline } from '@modules/presence/utils/presence-liveness';
import {
  PublicPractitionerGender,
  PublicPractitionerKind,
  PublicPractitionerSessionDuration,
  PublicPractitionerSortBy,
} from '../dto/list-public-practitioners.dto';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import { SessionReviewRatingAggregationService } from '@modules/reviews/services/session-review-rating-aggregation.service';
import { resolvePublicPractitionerPricing } from '../utils/public-practitioner-pricing.util';
import { PublicPractitionerPricingContextService } from '../services/public-practitioner-pricing-context.service';

type PublicPractitionerPricingProfile = {
  sessionPrice30Egp: string | { toString(): string } | null;
  sessionPrice30Usd: string | { toString(): string } | null;
  sessionPrice60Egp: string | { toString(): string } | null;
  sessionPrice60Usd: string | { toString(): string } | null;
};

type PublicPractitionerRatingSummary = {
  averageRating: number | null;
  ratingsCount: number;
  publishedRatingsCount: number;
  writtenReviewsCount: number;
  totalReviews: number;
};

type PublicPractitionerListEntry = {
  createdAt: Date;
  yearsExperience: number | null;
  ratingSummary: PublicPractitionerRatingSummary;
  item: ReturnType<PublicPractitionerMapper['toListItem']>;
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
    private readonly pricingContextService: PublicPractitionerPricingContextService,
    private readonly sessionReviewRatingAggregationService: SessionReviewRatingAggregationService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    currentUserId?: string | null;
    guestCountryIsoCode?: string | null;
    search?: string;
    specialtySlug?: string;
    specialtyCategorySlug?: string;
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
    const regionalResolution = await this.pricingContextService.resolve({
      currentUserId: input.currentUserId,
      guestCountryIsoCode: input.guestCountryIsoCode,
    });

    const rows = await this.publicReadRepository.listPublic({
      locale: input.locale,
      currencyCode: regionalResolution.currencyCode as 'EGP' | 'USD',
      search: input.search,
      specialtySlug: input.specialtySlug,
      specialtyCategorySlug: input.specialtyCategorySlug,
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
      minSessionFee: input.minSessionFee,
      maxSessionFee: input.maxSessionFee,
      sort: input.sort,
    });

    const summaries =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerIds(
        rows.map((row) => row.id),
      );

    const practitioners: PublicPractitionerListEntry[] = rows.flatMap(
      (profile) => {
        const pricingProfile = profile as typeof profile &
          PublicPractitionerPricingProfile;
        const ratingSummary = summaries.get(profile.id) ?? {
          averageRating: null,
          ratingsCount: 0,
          publishedRatingsCount: 0,
          writtenReviewsCount: 0,
          rating1Count: 0,
          rating2Count: 0,
          rating3Count: 0,
          rating4Count: 0,
          rating5Count: 0,
          latestPublishedReviewAt: null,
        };
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
          return [];
        }

        const publicRatingSummary: PublicPractitionerRatingSummary = {
          averageRating: ratingSummary.averageRating,
          ratingsCount: ratingSummary.ratingsCount,
          publishedRatingsCount: ratingSummary.publishedRatingsCount,
          writtenReviewsCount: ratingSummary.writtenReviewsCount,
          totalReviews: ratingSummary.publishedRatingsCount,
        };

        return [
          {
            createdAt: profile.createdAt,
            yearsExperience: profile.yearsOfExperience ?? null,
            ratingSummary: publicRatingSummary,
            item: this.mapper.toListItem({
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
              ...resolvePublicPractitionerPricing({
                regionalResolution,
                sessionPrice30Egp: pricingProfile.sessionPrice30Egp,
                sessionPrice30Usd: pricingProfile.sessionPrice30Usd,
                sessionPrice60Egp: pricingProfile.sessionPrice60Egp,
                sessionPrice60Usd: pricingProfile.sessionPrice60Usd,
              }),
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
              isOnlineNow: isPresenceEffectivelyOnline(profile.presence),
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
                averageRating: ratingSummary.averageRating,
                ratingsCount: ratingSummary.ratingsCount,
                publishedRatingsCount: ratingSummary.publishedRatingsCount,
                writtenReviewsCount: ratingSummary.writtenReviewsCount,
                totalReviews: ratingSummary.publishedRatingsCount,
              },
              avatarUrl: profile.avatarUrl ?? null,
              isVerified: visibility.isVerified,
            }),
          },
        ];
      },
    );

    const filteredPractitioners =
      input.minRating === undefined
        ? practitioners
        : practitioners.filter(
            (entry) =>
              entry.ratingSummary.averageRating !== null &&
              entry.ratingSummary.averageRating >= input.minRating!,
          );

    const sortedPractitioners = [...filteredPractitioners].sort((left, right) => {
      const leftRating = left.ratingSummary.averageRating ?? -1;
      const rightRating = right.ratingSummary.averageRating ?? -1;
      const leftExperience = left.yearsExperience ?? -1;
      const rightExperience = right.yearsExperience ?? -1;
      const leftCreatedAt = left.createdAt.getTime();
      const rightCreatedAt = right.createdAt.getTime();

      switch (input.sort) {
        case PublicPractitionerSortBy.EXPERIENCE:
          return (
            rightExperience - leftExperience ||
            rightCreatedAt - leftCreatedAt ||
            rightRating - leftRating
          );
        case PublicPractitionerSortBy.RATING:
        case PublicPractitionerSortBy.RECOMMENDED:
        default:
          return (
            rightRating - leftRating ||
            rightExperience - leftExperience ||
            rightCreatedAt - leftCreatedAt
          );
      }
    });

    const pagedPractitioners = sortedPractitioners.slice(skip, skip + limit);

    return {
      items: pagedPractitioners.map((entry) => entry.item),
      pagination: {
        page,
        limit,
        totalItems: filteredPractitioners.length,
        totalPages: Math.max(1, Math.ceil(filteredPractitioners.length / limit)),
      },
    };
  }
}
