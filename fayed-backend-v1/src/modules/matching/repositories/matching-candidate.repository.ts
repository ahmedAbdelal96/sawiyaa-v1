import { Injectable } from '@nestjs/common';
import { Prisma, PractitionerStatus, UserStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SessionReviewRatingAggregationService,
  type SessionReviewRatingSummary,
} from '@modules/reviews/services/session-review-rating-aggregation.service';

@Injectable()
export class MatchingCandidateRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionReviewRatingAggregationService: SessionReviewRatingAggregationService,
  ) {}

  async listPublicCandidates(input: {
    locale: SupportedLocale;
    preferredSpecialtySlug?: string | null;
    take: number;
  }) {
    const specialtySlug = input.preferredSpecialtySlug?.trim().toLowerCase();
    const where: Prisma.PractitionerProfileWhereInput = {
      status: PractitionerStatus.APPROVED,
      isPublicProfilePublished: true,
      user: {
        status: UserStatus.ACTIVE,
        displayName: {
          not: null,
        },
      },
      publicSlug: {
        not: '',
      },
      professionalTitle: {
        not: null,
      },
      bio: {
        not: null,
      },
      specialties: specialtySlug
        ? {
            some: {
              specialty: {
                isActive: true,
                OR: [
                  { slug: specialtySlug },
                  {
                    translations: {
                      some: {
                        slug: specialtySlug,
                      },
                    },
                  },
                ],
              },
            },
          }
        : {
            some: {
              specialty: {
                isActive: true,
              },
            },
          },
    };

    const rows = await this.prisma.practitionerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            status: true,
            displayName: true,
          },
        },
        languages: {
          include: {
            language: {
              select: {
                code: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        specialties: {
          where: {
            specialty: {
              isActive: true,
            },
          },
          include: {
            specialty: {
              include: {
                translations: {
                  where: {
                    locale: {
                      in: [input.locale, 'en'],
                    },
                  },
                  orderBy: { locale: 'asc' },
                  select: {
                    locale: true,
                    title: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        presence: {
          select: {
            status: true,
            isInstantBookingEnabled: true,
            lastSeenAtUtc: true,
          },
        },
        availabilitySlots: {
          where: { isActive: true },
          select: { id: true },
          take: 1,
        },
      },
    });

    const ratingSummaries =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerIds(
        rows.map((row) => row.id),
      );

    return rows
      .map((row) => ({
        row,
        ratingSummary: ratingSummaries.get(row.id) ?? null,
      }))
      .sort((left, right) => {
        const leftRating = left.ratingSummary?.averageRating ?? -1;
        const rightRating = right.ratingSummary?.averageRating ?? -1;
        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }

        if (
          (right.row.yearsOfExperience ?? 0) !==
          (left.row.yearsOfExperience ?? 0)
        ) {
          return (right.row.yearsOfExperience ?? 0) - (left.row.yearsOfExperience ?? 0);
        }

        return right.row.createdAt.getTime() - left.row.createdAt.getTime();
      })
      .slice(0, input.take)
      .map(({ row, ratingSummary }) => ({
        ...row,
        ratingSummary: this.toLegacyRatingSummary(ratingSummary),
      }));
  }

  private toLegacyRatingSummary(ratingSummary: SessionReviewRatingSummary | null) {
    return {
      averageRating:
        ratingSummary?.averageRating === null ||
        ratingSummary?.averageRating === undefined
          ? null
          : Number(ratingSummary.averageRating),
      totalReviews: ratingSummary?.publishedRatingsCount ?? 0,
    };
  }
}
