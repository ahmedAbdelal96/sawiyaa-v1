import { Injectable } from '@nestjs/common';
import { Prisma, SessionReviewStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

export type SessionReviewRatingSummary = {
  averageRating: number | null;
  ratingsCount: number;
  publishedRatingsCount: number;
  writtenReviewsCount: number;
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
  latestPublishedReviewAt: string | null;
};

const EMPTY_SUMMARY: SessionReviewRatingSummary = {
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

type MutableSummary = SessionReviewRatingSummary & {
  ratingTotal: number;
};

@Injectable()
export class SessionReviewRatingAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async aggregateByPractitionerId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SessionReviewRatingSummary> {
    const results = await this.aggregateByPractitionerIds([practitionerId], tx);
    return results.get(practitionerId) ?? { ...EMPTY_SUMMARY };
  }

  async aggregateByPractitionerIds(
    practitionerIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, SessionReviewRatingSummary>> {
    const uniquePractitionerIds = [...new Set(practitionerIds.filter(Boolean))];
    const summaryMap = new Map<string, MutableSummary>();

    for (const practitionerId of uniquePractitionerIds) {
      summaryMap.set(practitionerId, { ...EMPTY_SUMMARY, ratingTotal: 0 });
    }

    if (uniquePractitionerIds.length === 0) {
      return summaryMap;
    }

    const db = this.getDb(tx);
    const visibilityWhere: Prisma.SessionReviewWhereInput = {
      practitionerId: { in: uniquePractitionerIds },
      reviewStatus: SessionReviewStatus.PUBLISHED,
      publishedAt: {
        not: null,
      },
      hiddenAt: null,
      archivedAt: null,
    };

    const [ratingsByValue, publishedCounts, writtenCounts] = await Promise.all([
      db.sessionReview.groupBy({
        by: ['practitionerId', 'ratingValue'],
        where: visibilityWhere,
        _count: {
          id: true,
        },
      }),
      db.sessionReview.groupBy({
        by: ['practitionerId'],
        where: visibilityWhere,
        _count: {
          id: true,
        },
        _max: {
          publishedAt: true,
        },
      }),
      db.sessionReview.groupBy({
        by: ['practitionerId'],
        where: {
          ...visibilityWhere,
          AND: [
            {
              reviewText: {
                not: null,
              },
            },
            {
              reviewText: {
                not: '',
              },
            },
          ],
        },
        _count: {
          id: true,
        },
      }),
    ]);

    for (const row of ratingsByValue) {
      const existing =
        summaryMap.get(row.practitionerId) ?? {
          ...EMPTY_SUMMARY,
          ratingTotal: 0,
        };
      const count = row._count.id;
      const ratingValue = row.ratingValue;

      existing.ratingsCount += count;
      existing.publishedRatingsCount += count;
      existing.ratingTotal += ratingValue * count;
      switch (ratingValue) {
        case 1:
          existing.rating1Count += count;
          break;
        case 2:
          existing.rating2Count += count;
          break;
        case 3:
          existing.rating3Count += count;
          break;
        case 4:
          existing.rating4Count += count;
          break;
        case 5:
          existing.rating5Count += count;
          break;
      }
      summaryMap.set(row.practitionerId, existing);
    }

    for (const row of publishedCounts) {
      const existing =
        summaryMap.get(row.practitionerId) ?? {
          ...EMPTY_SUMMARY,
          ratingTotal: 0,
        };
      const ratingsCount = row._count.id;

      existing.ratingsCount = ratingsCount;
      existing.publishedRatingsCount = ratingsCount;
      existing.averageRating =
        ratingsCount > 0
          ? Number((existing.ratingTotal / ratingsCount).toFixed(2))
          : null;
      existing.latestPublishedReviewAt =
        row._max.publishedAt?.toISOString() ?? null;
      summaryMap.set(row.practitionerId, existing);
    }

    for (const row of writtenCounts) {
      const existing =
        summaryMap.get(row.practitionerId) ?? {
          ...EMPTY_SUMMARY,
          ratingTotal: 0,
        };
      existing.writtenReviewsCount = row._count.id;
      summaryMap.set(row.practitionerId, existing);
    }

    const result = new Map<string, SessionReviewRatingSummary>();
    for (const [practitionerId, summary] of summaryMap.entries()) {
      if (summary.ratingsCount === 0) {
        summary.averageRating = null;
      }
      const { ratingTotal: _ratingTotal, ...publicSummary } = summary;
      result.set(practitionerId, publicSummary);
    }

    return result;
  }
}
