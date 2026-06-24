import { Injectable } from '@nestjs/common';
import {
  PractitionerMarketingPlacementStatus,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SessionReviewRatingAggregationService,
  type SessionReviewRatingSummary,
} from '@modules/reviews/services/session-review-rating-aggregation.service';

export type FeaturedPractitionerHomeCard = {
  practitionerId: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  avatarUrl: string | null;
  primarySpecialty: string | null;
  averageRating: number | null;
  totalReviews: number;
  displaySessionPrice30: number | null;
  displaySessionPrice60: number | null;
  isVerified: boolean;
  badgeLabel: string;
};

@Injectable()
export class PractitionerMarketingPlacementRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionReviewRatingAggregationService: SessionReviewRatingAggregationService,
  ) {}

  async listActiveHomeFeaturedPractitioners(input: {
    locale: SupportedLocale;
    now: Date;
    limit: number;
  }): Promise<FeaturedPractitionerHomeCard[]> {
    const placements =
      await this.prisma.practitionerMarketingPlacement.findMany({
        where: {
          status: PractitionerMarketingPlacementStatus.ACTIVE,
          startsAt: {
            lte: input.now,
          },
          OR: [{ endsAt: null }, { endsAt: { gte: input.now } }],
          surface: {
            in: ['HOME', 'ALL'],
          },
          practitioner: {
            ...this.publicPractitionerWhere(),
          },
        },
        orderBy: [
          { priority: 'asc' },
          { startsAt: 'desc' },
          { id: 'asc' },
        ],
        take: input.limit * 4,
        select: {
          badgeLabelAr: true,
          badgeLabelEn: true,
          practitioner: {
            select: {
              id: true,
              publicSlug: true,
              professionalTitle: true,
              avatarUrl: true,
              user: {
                select: {
                  displayName: true,
                },
              },
              sessionPrice30Egp: true,
              sessionPrice30Usd: true,
              sessionPrice60Egp: true,
              sessionPrice60Usd: true,
              specialties: {
                where: {
                  specialty: {
                    isActive: true,
                  },
                },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                take: 1,
                select: {
                  specialty: {
                    select: {
                      translations: {
                        where: {
                          locale: {
                            in: [input.locale, 'en'],
                          },
                        },
                        orderBy: { locale: 'asc' },
                        select: {
                          title: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

    const ratingSummaries =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerIds(
        placements.map((placement) => placement.practitioner.id),
      );

    const deduped = new Map<string, FeaturedPractitionerHomeCard>();
    for (const placement of placements) {
      const card = this.mapPlacementCard({
        locale: input.locale,
        badgeLabelAr: placement.badgeLabelAr,
        badgeLabelEn: placement.badgeLabelEn,
        practitioner: placement.practitioner,
        ratingSummary: ratingSummaries.get(placement.practitioner.id) ?? null,
      });

      if (deduped.has(card.slug)) {
        continue;
      }

      deduped.set(card.slug, card);
      if (deduped.size >= input.limit) {
        break;
      }
    }

    return Array.from(deduped.values());
  }

  private mapPlacementCard(input: {
    locale: SupportedLocale;
    badgeLabelAr: string | null;
    badgeLabelEn: string | null;
    practitioner: {
      id: string;
      publicSlug: string;
      professionalTitle: string | null;
      avatarUrl: string | null;
      user: { displayName: string | null };
      sessionPrice30Egp: unknown;
      sessionPrice30Usd: unknown;
      sessionPrice60Egp: unknown;
      sessionPrice60Usd: unknown;
      specialties: Array<{
        specialty: {
          translations: Array<{ title: string }>;
        };
      }>;
    };
    ratingSummary: SessionReviewRatingSummary | null;
  }): FeaturedPractitionerHomeCard {
    const badgeLabel =
      input.locale === 'ar'
        ? input.badgeLabelAr?.trim() || 'مميز'
        : input.badgeLabelEn?.trim() || 'Featured';

    return {
      practitionerId: input.practitioner.id,
      slug: input.practitioner.publicSlug,
      displayName: input.practitioner.user.displayName ?? null,
      professionalTitle: input.practitioner.professionalTitle ?? null,
      avatarUrl: input.practitioner.avatarUrl ?? null,
      primarySpecialty:
        input.practitioner.specialties[0]?.specialty.translations[0]?.title ??
        null,
      averageRating:
        input.ratingSummary?.averageRating === null ||
        input.ratingSummary?.averageRating === undefined
          ? null
          : Number(input.ratingSummary.averageRating),
      totalReviews: input.ratingSummary?.publishedRatingsCount ?? 0,
      displaySessionPrice30:
        input.practitioner.sessionPrice30Egp === null ||
        input.practitioner.sessionPrice30Egp === undefined
          ? input.practitioner.sessionPrice30Usd === null ||
            input.practitioner.sessionPrice30Usd === undefined
            ? null
            : Number(input.practitioner.sessionPrice30Usd)
          : Number(input.practitioner.sessionPrice30Egp),
      displaySessionPrice60:
        input.practitioner.sessionPrice60Egp === null ||
        input.practitioner.sessionPrice60Egp === undefined
          ? input.practitioner.sessionPrice60Usd === null ||
            input.practitioner.sessionPrice60Usd === undefined
            ? null
            : Number(input.practitioner.sessionPrice60Usd)
          : Number(input.practitioner.sessionPrice60Egp),
      isVerified: true,
      badgeLabel,
    };
  }

  private publicPractitionerWhere() {
    return {
      status: PractitionerStatus.APPROVED,
      isPublicProfilePublished: true,
      user: {
        status: UserStatus.ACTIVE,
        displayName: {
          not: null,
        },
      },
      professionalTitle: {
        not: null,
      },
      bio: {
        not: null,
      },
      specialties: {
        some: {
          specialty: {
            isActive: true,
          },
        },
      },
    } as const;
  }
}
