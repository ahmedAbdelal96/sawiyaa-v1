import { PractitionerMarketingPlacementRepository } from './practitioner-marketing-placement.repository';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';

describe('PractitionerMarketingPlacementRepository', () => {
  const prisma = {
    practitionerMarketingPlacement: {
      findMany: jest.fn(),
    },
  };

  const repository = new PractitionerMarketingPlacementRepository(
    prisma as never,
    new PractitionerProfessionalContentResolver(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries only active placements for HOME/ALL within current time and limits output to 5', async () => {
    prisma.practitionerMarketingPlacement.findMany.mockResolvedValue(
      Array.from({ length: 7 }).map((_, index) =>
        buildPlacement({
          slug: `slug-${index + 1}`,
          badgeLabelAr: index === 0 ? 'مميز اليوم' : null,
          badgeLabelEn: index === 0 ? 'Featured today' : null,
        }),
      ),
    );

    const result = await repository.listActiveHomeFeaturedPractitioners({
      locale: 'ar',
      now: new Date('2026-05-28T10:00:00.000Z'),
      limit: 5,
    });

    expect(prisma.practitionerMarketingPlacement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          surface: { in: ['HOME', 'ALL'] },
          practitioner: expect.objectContaining({
            status: 'APPROVED',
            isPublicProfilePublished: true,
          }),
          startsAt: { lte: new Date('2026-05-28T10:00:00.000Z') },
          OR: [
            { endsAt: null },
            { endsAt: { gte: new Date('2026-05-28T10:00:00.000Z') } },
          ],
        }),
        orderBy: [{ priority: 'asc' }, { startsAt: 'desc' }, { id: 'asc' }],
      }),
    );

    expect(result).toHaveLength(5);
    expect(result[0]?.badgeLabel).toBe('مميز اليوم');
    expect(result.every((row) => !('campaignName' in row))).toBe(true);
    expect(result.every((row) => !('notesInternal' in row))).toBe(true);
    expect(result.every((row) => !('createdByAdminId' in row))).toBe(true);
    expect(result.every((row) => !('pausedByAdminId' in row))).toBe(true);
  });

  it('deduplicates by practitioner slug and falls back to default badge labels', async () => {
    prisma.practitionerMarketingPlacement.findMany.mockResolvedValue([
      buildPlacement({ slug: 'same-slug', badgeLabelAr: null, badgeLabelEn: null }),
      buildPlacement({ slug: 'same-slug', badgeLabelAr: 'مميز 2', badgeLabelEn: 'Featured 2' }),
      buildPlacement({ slug: 'other-slug', badgeLabelAr: null, badgeLabelEn: null }),
    ]);

    const resultAr = await repository.listActiveHomeFeaturedPractitioners({
      locale: 'ar',
      now: new Date('2026-05-28T10:00:00.000Z'),
      limit: 5,
    });
    expect(resultAr).toHaveLength(2);
    expect(resultAr[0]?.badgeLabel).toBe('مميز');

    const resultEn = await repository.listActiveHomeFeaturedPractitioners({
      locale: 'en',
      now: new Date('2026-05-28T10:00:00.000Z'),
      limit: 5,
    });
    expect(resultEn[0]?.badgeLabel).toBe('Featured');
    expect(resultAr[0]?.primarySpecialty).toBe('التخصص');
    expect(resultEn[0]?.primarySpecialty).toBe('Specialty');
  });

  it('returns empty when there are no eligible placements', async () => {
    prisma.practitionerMarketingPlacement.findMany.mockResolvedValue([]);

    const result = await repository.listActiveHomeFeaturedPractitioners({
      locale: 'ar',
      now: new Date('2026-05-28T10:00:00.000Z'),
      limit: 5,
    });

    expect(result).toEqual([]);
  });

  it('resolves featured professional titles without changing placement ordering', async () => {
    prisma.practitionerMarketingPlacement.findMany.mockResolvedValue([
      buildPlacement({
        slug: 'localized-slug',
        badgeLabelAr: null,
        badgeLabelEn: null,
        professionalContentTranslations: [
          { locale: 'ar', professionalTitle: 'أخصائي نفسي', bio: null },
          { locale: 'en', professionalTitle: 'Clinical Psychologist', bio: null },
        ],
      }),
    ]);

    const arabic = await repository.listActiveHomeFeaturedPractitioners({
      locale: 'ar',
      now: new Date('2026-05-28T10:00:00.000Z'),
      limit: 5,
    });
    const english = await repository.listActiveHomeFeaturedPractitioners({
      locale: 'en',
      now: new Date('2026-05-28T10:00:00.000Z'),
      limit: 5,
    });

    expect(arabic[0]?.slug).toBe('localized-slug');
    expect(arabic[0]?.professionalTitle).toBe('أخصائي نفسي');
    expect(english[0]?.professionalTitle).toBe('Clinical Psychologist');
  });
});

function buildPlacement(input: {
  slug: string;
  badgeLabelAr: string | null;
  badgeLabelEn: string | null;
  professionalContentTranslations?: Array<{
    locale: 'ar' | 'en';
    professionalTitle: string | null;
    bio: string | null;
  }>;
}) {
  return {
    badgeLabelAr: input.badgeLabelAr,
    badgeLabelEn: input.badgeLabelEn,
    practitioner: {
      id: `practitioner-${input.slug}`,
      publicSlug: input.slug,
      professionalTitle: 'Title',
      primaryContentLocale: null,
      professionalContentTranslations: input.professionalContentTranslations ?? [],
      avatarUrl: null,
      user: {
        displayName: `Name ${input.slug}`,
      },
      ratingSummary: {
        averageRating: 4.8,
        publishedReviewsCount: 23,
      },
      sessionPrice30Egp: 350,
      sessionPrice30Usd: null,
      sessionPrice60Egp: 600,
      sessionPrice60Usd: null,
      specialties: [
        {
          specialty: {
            nameAr: 'التخصص',
            nameEn: 'Specialty',
            translations: [
              { locale: 'ar', title: 'التخصص' },
              { locale: 'en', title: 'Specialty' },
            ],
          },
        },
      ],
    },
  };
}
