import { SessionReviewStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionReviewRatingAggregationService } from './session-review-rating-aggregation.service';

describe('SessionReviewRatingAggregationService', () => {
  const prisma = {
    sessionReview: {
      groupBy: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new SessionReviewRatingAggregationService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates using publicRatingValue only for public reviews', async () => {
    (prisma.sessionReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        {
          practitionerId: 'practitioner-1',
          publicRatingValue: 4,
          _count: { id: 2 },
        },
        {
          practitionerId: 'practitioner-1',
          publicRatingValue: 5,
          _count: { id: 1 },
        },
      ])
      .mockResolvedValueOnce([
        {
          practitionerId: 'practitioner-1',
          _count: { id: 3 },
          _max: { publishedAt: new Date('2026-03-30T12:00:00.000Z') },
        },
      ])
      .mockResolvedValueOnce([
        {
          practitionerId: 'practitioner-1',
          _count: { id: 1 },
        },
      ]);

    const result = await service.aggregateByPractitionerId('practitioner-1');

    expect(prisma.sessionReview.groupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        by: ['practitionerId', 'publicRatingValue'],
        where: expect.objectContaining({
          practitionerId: { in: ['practitioner-1'] },
          reviewStatus: SessionReviewStatus.PUBLISHED,
          countsInPublicAverage: true,
          publicRatingValue: { not: null },
        }),
      }),
    );
    expect(result).toEqual({
      averageRating: 4.33,
      ratingsCount: 3,
      publishedRatingsCount: 3,
      writtenReviewsCount: 1,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 2,
      rating5Count: 1,
      latestPublishedReviewAt: '2026-03-30T12:00:00.000Z',
    });
  });

  it('returns an empty public summary when no ratings are countable', async () => {
    (prisma.sessionReview.groupBy as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.aggregateByPractitionerId('practitioner-1');

    expect(result).toEqual({
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
    });
  });
});
