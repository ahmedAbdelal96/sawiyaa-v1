import { PatientHomeRepository } from './patient-home.repository';

describe('PatientHomeRepository', () => {
  const prisma = {
    patientPractitionerView: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      groupBy: jest.fn(),
    },
    practitionerProfile: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const sessionReviewRatingAggregationService = {
    aggregateByPractitionerIds: jest.fn(),
    aggregateByPractitionerId: jest.fn(),
  };

  const repository = new PatientHomeRepository(
    prisma as never,
    sessionReviewRatingAggregationService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates new row for first view', async () => {
    prisma.patientPractitionerView.findUnique.mockResolvedValue(null);

    await repository.trackView({
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      now: new Date('2026-05-26T10:00:00.000Z'),
      antiNoiseWindowMinutes: 10,
    });

    expect(prisma.patientPractitionerView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: 'patient-1',
          practitionerId: 'practitioner-1',
          viewCount: 1,
        }),
      }),
    );
    expect(prisma.patientPractitionerView.update).not.toHaveBeenCalled();
  });

  it('updates lastViewedAt without increment inside anti-noise window', async () => {
    prisma.patientPractitionerView.findUnique.mockResolvedValue({
      viewCount: 3,
      lastViewedAt: new Date('2026-05-26T10:00:00.000Z'),
    });

    await repository.trackView({
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      now: new Date('2026-05-26T10:05:00.000Z'),
      antiNoiseWindowMinutes: 10,
    });

    expect(prisma.patientPractitionerView.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          lastViewedAt: new Date('2026-05-26T10:05:00.000Z'),
        },
      }),
    );
  });

  it('increments viewCount outside anti-noise window', async () => {
    prisma.patientPractitionerView.findUnique.mockResolvedValue({
      viewCount: 3,
      lastViewedAt: new Date('2026-05-26T10:00:00.000Z'),
    });

    await repository.trackView({
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      now: new Date('2026-05-26T10:11:00.000Z'),
      antiNoiseWindowMinutes: 10,
    });

    expect(prisma.patientPractitionerView.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          lastViewedAt: new Date('2026-05-26T10:11:00.000Z'),
          viewCount: 4,
        },
      }),
    );
  });

  it('listMostBookedToday counts only configured valid statuses and maps bookingCountToday', async () => {
    prisma.session.groupBy.mockResolvedValue([
      { practitionerId: 'p-1', _count: { _all: 3 } },
      { practitionerId: 'p-2', _count: { _all: 2 } },
    ]);
    prisma.practitionerProfile.findMany.mockResolvedValue([
      buildPractitionerProfile('p-1', 'slug-1', 4.9),
      buildPractitionerProfile('p-2', 'slug-2', 4.7),
    ]);
    sessionReviewRatingAggregationService.aggregateByPractitionerIds.mockResolvedValue(
      new Map([
        [
          'p-1',
          {
            averageRating: 4.9,
            ratingsCount: 20,
            publishedRatingsCount: 20,
            writtenReviewsCount: 8,
            rating1Count: 0,
            rating2Count: 0,
            rating3Count: 0,
            rating4Count: 2,
            rating5Count: 18,
            latestPublishedReviewAt: '2026-05-28T00:00:00.000Z',
          },
        ],
        [
          'p-2',
          {
            averageRating: 4.7,
            ratingsCount: 10,
            publishedRatingsCount: 10,
            writtenReviewsCount: 4,
            rating1Count: 0,
            rating2Count: 0,
            rating3Count: 1,
            rating4Count: 4,
            rating5Count: 5,
            latestPublishedReviewAt: '2026-05-28T00:00:00.000Z',
          },
        ],
      ]),
    );

    const result = await repository.listMostBookedToday({
      locale: 'ar',
      fromUtc: new Date('2026-05-28T00:00:00.000Z'),
      toUtc: new Date('2026-05-29T00:00:00.000Z'),
      limit: 10,
    });

    expect(prisma.session.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              'CONFIRMED',
              'UPCOMING',
              'READY_TO_JOIN',
              'IN_PROGRESS',
              'COMPLETED',
            ],
          },
        }),
      }),
    );
    expect(sessionReviewRatingAggregationService.aggregateByPractitionerIds).toHaveBeenCalledWith([
      'p-1',
      'p-2',
    ]);
    expect(result[0]?.bookingCountToday).toBe(3);
    expect(result[1]?.bookingCountToday).toBe(2);
  });

  it('listTopRated returns max 5 and keeps Bayesian ordering without low-sample bias', async () => {
    prisma.practitionerProfile.findMany
      .mockResolvedValueOnce([
        { id: 'p-low-sample' },
        { id: 'p-high-sample' },
        { id: 'p-strong' },
        { id: 'p-below-min' },
        { id: 'p-platform-anchor-1' },
        { id: 'p-platform-anchor-2' },
      ])
      .mockResolvedValueOnce([
        buildPractitionerProfile('p-low-sample', 'slug-low-sample', 5),
        buildPractitionerProfile('p-high-sample', 'slug-high-sample', 4.8),
        buildPractitionerProfile('p-strong', 'slug-strong', 4.9),
        buildPractitionerProfile('p-below-min', 'slug-below-min', 5),
        buildPractitionerProfile(
          'p-platform-anchor-1',
          'slug-platform-anchor-1',
          4.2,
        ),
        buildPractitionerProfile(
          'p-platform-anchor-2',
          'slug-platform-anchor-2',
          4.1,
        ),
      ]);
    sessionReviewRatingAggregationService.aggregateByPractitionerIds.mockResolvedValue(
      new Map([
        [
          'p-low-sample',
          liveSummary(5, 5, '2026-05-28T00:00:00.000Z'),
        ],
        [
          'p-high-sample',
          liveSummary(4.8, 100, '2026-05-28T00:00:00.000Z'),
        ],
        [
          'p-strong',
          liveSummary(4.9, 80, '2026-05-28T00:00:00.000Z'),
        ],
        [
          'p-below-min',
          liveSummary(5, 2, '2026-05-28T00:00:00.000Z'),
        ],
        [
          'p-platform-anchor-1',
          liveSummary(4.2, 200, '2026-05-28T00:00:00.000Z'),
        ],
        [
          'p-platform-anchor-2',
          liveSummary(4.1, 220, '2026-05-28T00:00:00.000Z'),
        ],
      ]),
    );

    const result = await repository.listTopRated({
      locale: 'ar',
      limit: 5,
      minimumReviews: 5,
      priorReviews: 20,
    });

    expect(sessionReviewRatingAggregationService.aggregateByPractitionerIds).toHaveBeenCalledWith([
      'p-low-sample',
      'p-high-sample',
      'p-strong',
      'p-below-min',
      'p-platform-anchor-1',
      'p-platform-anchor-2',
    ]);
    expect(result.map((item) => item.slug)).toEqual([
      'slug-strong',
      'slug-high-sample',
      'slug-low-sample',
      'slug-platform-anchor-1',
      'slug-platform-anchor-2',
    ]);
    expect(result).toHaveLength(5);
    expect(result.find((item) => item.slug === 'slug-low-sample')?.slug).not.toBe(
      result[0]?.slug,
    );
    expect(result.find((item) => item.slug === 'slug-below-min')).toBeUndefined();
  });
});

function buildPractitionerProfile(
  id: string,
  slug: string,
  averageRating: number,
) {
  return {
    id,
    publicSlug: slug,
    professionalTitle: 'Title',
    avatarUrl: null,
    user: {
      displayName: `Name ${slug}`,
    },
    sessionPrice30Egp: 300,
    sessionPrice30Usd: null,
    sessionPrice60Egp: 500,
    sessionPrice60Usd: null,
    specialties: [
      {
        specialty: {
          translations: [{ title: 'Specialty' }],
        },
      },
    ],
    createdAt: new Date('2026-05-28T00:00:00.000Z'),
    averageRating,
  };
}

function liveSummary(
  averageRating: number,
  publishedReviewsCount: number,
  latestPublishedReviewAt: string,
) {
  return {
    averageRating,
    ratingsCount: publishedReviewsCount,
    publishedRatingsCount: publishedReviewsCount,
    writtenReviewsCount: Math.floor(publishedReviewsCount / 2),
    rating1Count: 0,
    rating2Count: 0,
    rating3Count: 0,
    rating4Count: 0,
    rating5Count: publishedReviewsCount,
    latestPublishedReviewAt,
  };
}
