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
    practitionerRatingSummary: {
      findMany: jest.fn(),
    },
    practitionerProfile: {
      findMany: jest.fn(),
    },
  };

  const repository = new PatientHomeRepository(prisma as never);

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
      buildPractitionerProfile('p-1', 'slug-1', 4.9, 20),
      buildPractitionerProfile('p-2', 'slug-2', 4.7, 10),
    ]);

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
    expect(result[0]?.bookingCountToday).toBe(3);
    expect(result[1]?.bookingCountToday).toBe(2);
  });

  it('listTopRated returns max 5 and keeps Bayesian ordering without low-sample bias', async () => {
    prisma.practitionerRatingSummary.findMany.mockResolvedValue([
      {
        practitionerId: 'p-low-sample',
        averageRating: 5,
        publishedReviewsCount: 5,
      },
      {
        practitionerId: 'p-high-sample',
        averageRating: 4.8,
        publishedReviewsCount: 100,
      },
      {
        practitionerId: 'p-strong',
        averageRating: 4.9,
        publishedReviewsCount: 80,
      },
      {
        practitionerId: 'p-below-min',
        averageRating: 5,
        publishedReviewsCount: 2,
      },
      {
        practitionerId: 'p-platform-anchor-1',
        averageRating: 4.2,
        publishedReviewsCount: 200,
      },
      {
        practitionerId: 'p-platform-anchor-2',
        averageRating: 4.1,
        publishedReviewsCount: 220,
      },
    ]);
    prisma.practitionerProfile.findMany.mockResolvedValue([
      buildPractitionerProfile('p-low-sample', 'slug-low-sample', 5, 5),
      buildPractitionerProfile('p-high-sample', 'slug-high-sample', 4.8, 100),
      buildPractitionerProfile('p-strong', 'slug-strong', 4.9, 80),
      buildPractitionerProfile('p-below-min', 'slug-below-min', 5, 2),
      buildPractitionerProfile(
        'p-platform-anchor-1',
        'slug-platform-anchor-1',
        4.2,
        200,
      ),
      buildPractitionerProfile(
        'p-platform-anchor-2',
        'slug-platform-anchor-2',
        4.1,
        220,
      ),
    ]);

    const result = await repository.listTopRated({
      locale: 'ar',
      limit: 5,
      minimumReviews: 5,
      priorReviews: 20,
    });

    expect(prisma.practitionerRatingSummary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publishedReviewsCount: {
            gt: 0,
          },
        }),
      }),
    );
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
  publishedReviewsCount: number,
) {
  return {
    id,
    publicSlug: slug,
    professionalTitle: 'Title',
    avatarUrl: null,
    user: {
      displayName: `Name ${slug}`,
    },
    ratingSummary: {
      averageRating,
      publishedReviewsCount,
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
  };
}
