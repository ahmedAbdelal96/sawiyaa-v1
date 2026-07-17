import { Injectable } from '@nestjs/common';
import { PractitionerStatus, SessionStatus, UserStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SessionReviewRatingAggregationService,
  type SessionReviewRatingSummary,
} from '@modules/reviews/services/session-review-rating-aggregation.service';

@Injectable()
export class PatientHomeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionReviewRatingAggregationService: SessionReviewRatingAggregationService,
  ) {}

  async findPublicPractitionerBySlug(slug: string, locale: SupportedLocale) {
    const normalizedSlug = slug.trim().toLowerCase();
    const row = await this.prisma.practitionerProfile.findFirst({
      where: {
        publicSlug: normalizedSlug,
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
      },
      select: {
        id: true,
        publicSlug: true,
        user: {
          select: {
            displayName: true,
          },
        },
        professionalTitle: true,
        avatarUrl: true,
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
                      in: [locale, 'en'],
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
    });

    if (!row) {
      return null;
    }

    const ratingSummary =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerId(
        row.id,
      );

    return {
      ...row,
      ratingSummary: this.toLegacyRatingSummary(ratingSummary),
    };
  }

  async trackView(input: {
    patientId: string;
    practitionerId: string;
    now: Date;
    antiNoiseWindowMinutes: number;
  }) {
    const existing = await this.prisma.patientPractitionerView.findUnique({
      where: {
        patientId_practitionerId: {
          patientId: input.patientId,
          practitionerId: input.practitionerId,
        },
      },
      select: {
        viewCount: true,
        lastViewedAt: true,
      },
    });

    if (!existing) {
      await this.prisma.patientPractitionerView.create({
        data: {
          patientId: input.patientId,
          practitionerId: input.practitionerId,
          firstViewedAt: input.now,
          lastViewedAt: input.now,
          viewCount: 1,
        },
      });
      return;
    }

    const elapsedMs =
      input.now.getTime() - new Date(existing.lastViewedAt).getTime();
    const shouldIncrement =
      elapsedMs >= input.antiNoiseWindowMinutes * 60 * 1000;

    await this.prisma.patientPractitionerView.update({
      where: {
        patientId_practitionerId: {
          patientId: input.patientId,
          practitionerId: input.practitionerId,
        },
      },
      data: {
        lastViewedAt: input.now,
        ...(shouldIncrement ? { viewCount: existing.viewCount + 1 } : {}),
      },
    });
  }

  async listRecentlyVisited(patientId: string, locale: SupportedLocale) {
    const rows = await this.prisma.patientPractitionerView.findMany({
      where: {
        patientId,
        practitioner: {
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
        },
      },
      orderBy: {
        lastViewedAt: 'desc',
      },
      take: 20,
      select: {
        lastViewedAt: true,
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
                          in: [locale, 'en'],
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
        rows.map((row) => row.practitioner.id),
      );

    return rows.map((row) => ({
      ...this.mapPublicPractitionerCard(
        row.practitioner,
        ratingSummaries.get(row.practitioner.id) ?? null,
      ),
      lastViewedAt: row.lastViewedAt,
    }));
  }

  async listMostBookedToday(input: {
    locale: SupportedLocale;
    fromUtc: Date;
    toUtc: Date;
    limit: number;
  }) {
    const rows = await this.prisma.session.groupBy({
      by: ['practitionerId'],
      where: {
        scheduledStartAt: {
          gte: input.fromUtc,
          lt: input.toUtc,
        },
        status: {
          in: [
            SessionStatus.UPCOMING,
            SessionStatus.UPCOMING,
            SessionStatus.READY_TO_JOIN,
            SessionStatus.IN_PROGRESS,
            SessionStatus.COMPLETED,
          ],
        },
        practitioner: this.publicPractitionerWhere(),
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          practitionerId: 'desc',
        },
      },
      take: input.limit * 3,
    });

    const rowsWithPositiveCount = rows.filter((row) => row._count._all > 0);
    if (rowsWithPositiveCount.length === 0) {
      return [];
    }

    const cards = await this.listPublicPractitionerCardsByIds(
      rowsWithPositiveCount.map((row) => row.practitionerId),
      input.locale,
    );

    const countByPractitionerId = new Map(
      rowsWithPositiveCount.map((row) => [row.practitionerId, row._count._all]),
    );

    return cards
      .map((card) => ({
        ...card,
        bookingCountToday: countByPractitionerId.get(card.practitionerId) ?? 0,
      }))
      .filter((card) => card.bookingCountToday > 0)
      .sort((a, b) => {
        if (b.bookingCountToday !== a.bookingCountToday) {
          return b.bookingCountToday - a.bookingCountToday;
        }
        if ((b.averageRating ?? 0) !== (a.averageRating ?? 0)) {
          return (b.averageRating ?? 0) - (a.averageRating ?? 0);
        }
        if ((b.totalReviews ?? 0) !== (a.totalReviews ?? 0)) {
          return (b.totalReviews ?? 0) - (a.totalReviews ?? 0);
        }
        return a.slug.localeCompare(b.slug);
      })
      .slice(0, input.limit);
  }

  async listTopRated(input: {
    locale: SupportedLocale;
    limit: number;
    minimumReviews: number;
    priorReviews: number;
  }) {
    const practitionerIds = await this.prisma.practitionerProfile.findMany({
      where: this.publicPractitionerWhere(),
      select: {
        id: true,
      },
    });

    const summaries =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerIds(
        practitionerIds.map((row) => row.id),
      );
    const summaryRows = Array.from(summaries.entries()).map(
      ([practitionerId, summary]) => ({
        practitionerId,
        averageRating: summary.averageRating,
        publishedReviewsCount: summary.publishedRatingsCount,
      }),
    );

    const platformMeanRating = this.calculatePlatformMeanRating(summaryRows);

    const eligibleSummaries = summaryRows.filter(
      (summary) => summary.publishedReviewsCount >= input.minimumReviews,
    );

    if (eligibleSummaries.length === 0) {
      return [];
    }

    const cards = await this.listPublicPractitionerCardsByIds(
      eligibleSummaries.map((summary) => summary.practitionerId),
      input.locale,
      summaries,
    );

    const summaryByPractitionerId = new Map(
      eligibleSummaries.map((summary) => [
        summary.practitionerId,
        {
          averageRating: Number(summary.averageRating),
          totalReviews: summary.publishedReviewsCount,
          weightedRating: this.calculateBayesianWeightedRating({
            averageRating: Number(summary.averageRating),
            totalReviews: summary.publishedReviewsCount,
            platformMeanRating,
            priorReviews: input.priorReviews,
          }),
        },
      ]),
    );

    return cards
      .map((card) => {
        const summary = summaryByPractitionerId.get(card.practitionerId);
        return {
          ...card,
          averageRating: summary?.averageRating ?? card.averageRating,
          totalReviews: summary?.totalReviews ?? card.totalReviews,
          weightedRating: summary?.weightedRating ?? 0,
        };
      })
      .filter((card) => card.totalReviews >= input.minimumReviews)
      .sort((a, b) => {
        if (b.weightedRating !== a.weightedRating) {
          return b.weightedRating - a.weightedRating;
        }
        if ((b.totalReviews ?? 0) !== (a.totalReviews ?? 0)) {
          return (b.totalReviews ?? 0) - (a.totalReviews ?? 0);
        }
        if ((b.averageRating ?? 0) !== (a.averageRating ?? 0)) {
          return (b.averageRating ?? 0) - (a.averageRating ?? 0);
        }
        return a.slug.localeCompare(b.slug);
      })
      .map(({ weightedRating, ...card }) => card)
      .slice(0, input.limit);
  }

  private calculatePlatformMeanRating(
    summaries: Array<{ averageRating: unknown; publishedReviewsCount: number }>,
  ) {
    const totalReviewCount = summaries.reduce(
      (sum, summary) => sum + summary.publishedReviewsCount,
      0,
    );
    if (totalReviewCount <= 0) {
      return 0;
    }

    const weightedRatingSum = summaries.reduce((sum, summary) => {
      const averageRating = Number(summary.averageRating ?? 0);
      return sum + averageRating * summary.publishedReviewsCount;
    }, 0);

    return weightedRatingSum / totalReviewCount;
  }

  private calculateBayesianWeightedRating(input: {
    averageRating: number;
    totalReviews: number;
    platformMeanRating: number;
    priorReviews: number;
  }) {
    const v = input.totalReviews;
    const m = input.priorReviews;
    const r = input.averageRating;
    const c = input.platformMeanRating;

    if (v <= 0) {
      return c;
    }

    return (v / (v + m)) * r + (m / (v + m)) * c;
  }

  private async listPublicPractitionerCardsByIds(
    practitionerIds: string[],
    locale: SupportedLocale,
    ratingSummaries?: Map<string, SessionReviewRatingSummary>,
  ) {
    if (practitionerIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.practitionerProfile.findMany({
      where: {
        id: {
          in: practitionerIds,
        },
        ...this.publicPractitionerWhere(),
      },
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
                      in: [locale, 'en'],
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
    });

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const summaries =
      ratingSummaries ??
      (await this.sessionReviewRatingAggregationService.aggregateByPractitionerIds(
        practitionerIds,
      ));
    return practitionerIds
      .map((id) => rowsById.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) =>
        this.mapPublicPractitionerCard(row, summaries.get(row.id) ?? null),
      );
  }

  private mapPublicPractitionerCard(row: {
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
        translations: Array<{
          title: string;
        }>;
      };
    }>;
  }, ratingSummary: SessionReviewRatingSummary | null) {
    return {
      practitionerId: row.id,
      slug: row.publicSlug,
      displayName: row.user.displayName ?? null,
      professionalTitle: row.professionalTitle ?? null,
      avatarUrl: row.avatarUrl ?? null,
      primarySpecialty:
        row.specialties[0]?.specialty.translations[0]?.title ?? null,
      averageRating:
        ratingSummary?.averageRating === null ||
        ratingSummary?.averageRating === undefined
          ? null
          : Number(ratingSummary.averageRating),
      totalReviews: ratingSummary?.publishedRatingsCount ?? 0,
      displaySessionPrice30:
        row.sessionPrice30Egp === null || row.sessionPrice30Egp === undefined
          ? row.sessionPrice30Usd === null || row.sessionPrice30Usd === undefined
            ? null
            : Number(row.sessionPrice30Usd)
          : Number(row.sessionPrice30Egp),
      displaySessionPrice60:
        row.sessionPrice60Egp === null || row.sessionPrice60Egp === undefined
          ? row.sessionPrice60Usd === null || row.sessionPrice60Usd === undefined
            ? null
            : Number(row.sessionPrice60Usd)
          : Number(row.sessionPrice60Egp),
      isVerified: true,
    };
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
