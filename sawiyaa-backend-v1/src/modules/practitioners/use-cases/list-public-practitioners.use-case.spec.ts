import { Prisma } from '@prisma/client';
import { SessionReviewRatingAggregationService } from '@modules/reviews/services/session-review-rating-aggregation.service';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import type { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import type { PublicPractitionerPricingContextService } from '../services/public-practitioner-pricing-context.service';
import { ListPublicPractitionersUseCase } from './list-public-practitioners.use-case';

describe('ListPublicPractitionersUseCase', () => {
  const publicReadRepository = {
    listPublic: jest.fn(),
  } as unknown as PublicPractitionerReadRepository;
  const pricingContextService = {
    resolve: jest.fn(),
  } as unknown as PublicPractitionerPricingContextService;
  const sessionReviewRatingAggregationService = {
    aggregateByPractitionerIds: jest.fn(),
  } as unknown as SessionReviewRatingAggregationService;
  const mapper = new PublicPractitionerMapper();
  const visibilityPolicy = new PublicPractitionerVisibilityPolicy();

  const useCase = new ListPublicPractitionersUseCase(
    mapper,
    visibilityPolicy,
    publicReadRepository,
    pricingContextService,
    sessionReviewRatingAggregationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (pricingContextService.resolve as jest.Mock).mockResolvedValue({
      resolvedCountryIsoCode: null,
      regionalPricingMode: 'INTERNATIONAL',
      currencyCode: 'USD',
      provider: 'PAYMOB',
    });
  });

  const baseRow = {
    id: 'profile-1',
    publicSlug: 'dr-youssef-abdallah',
    status: 'APPROVED',
    user: { status: 'ACTIVE', displayName: 'Doctor Name' },
    isPublicProfilePublished: true,
    professionalTitle: 'Therapist',
    bio: 'Bio',
    practitionerType: 'OTHER',
    practitionerGender: null,
    country: { isoCode: 'EG', currencyCode: 'EGP' },
    languages: [{ language: { code: 'en' } }],
    specialties: [
      {
        specialtyId: 'specialty-1',
        specialty: { slug: 'therapy', translations: [] },
        isPrimary: true,
      },
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    presence: null,
    coupons: [],
    sessionPrice30: new Prisma.Decimal('111.00'),
    sessionPrice60: new Prisma.Decimal('222.00'),
    sessionPrice30Egp: new Prisma.Decimal('250.00'),
    sessionPrice30Usd: new Prisma.Decimal('8.00'),
    sessionPrice60Egp: new Prisma.Decimal('450.00'),
    sessionPrice60Usd: new Prisma.Decimal('15.00'),
    avatarUrl: null,
    acceptsPackages: true,
    yearsOfExperience: 7,
  };

  beforeEach(() => {
    (
      sessionReviewRatingAggregationService.aggregateByPractitionerIds as jest.Mock
    ).mockResolvedValue(
      new Map([
        [
          'profile-1',
          {
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
          },
        ],
      ]),
    );
  });

  it('returns USD selected amounts that match the selected currency, not legacy prices', async () => {
    (publicReadRepository.listPublic as jest.Mock).mockResolvedValue([baseRow]);

    const result = await useCase.execute({
      locale: 'en',
    });

    expect(result.items[0].pricing).toEqual({
      session30: { egp: 250, usd: 8 },
      session60: { egp: 450, usd: 15 },
    });
    expect(result.items[0].currencyCode).toBe('USD');
    expect(result.items[0].displaySessionPrice30).toBe(8);
    expect(result.items[0].displaySessionPrice60).toBe(15);
    expect(result.items[0].sessionPrice30).toBe(8);
    expect(result.items[0].sessionPrice60).toBe(15);
    expect(result.items[0].sessionPrice30Egp).toBe(250);
    expect(result.items[0].sessionPrice30Usd).toBe(8);
    expect(result.items[0].ratingSummary).toEqual({
      averageRating: null,
      ratingsCount: 0,
      publishedRatingsCount: 0,
      writtenReviewsCount: 0,
      totalReviews: 0,
    });
  });

  it('marks stale online presence as offline in the public list', async () => {
    (publicReadRepository.listPublic as jest.Mock).mockResolvedValue([
      {
        ...baseRow,
        presence: {
          status: 'ONLINE',
          lastSeenAtUtc: new Date('2025-01-01T00:00:00.000Z'),
        },
      },
    ]);

    const result = await useCase.execute({
      locale: 'en',
    });

    expect(result.items[0].isOnlineNow).toBe(false);
  });

  it('passes specialty category filtering through to the repository query', async () => {
    (publicReadRepository.listPublic as jest.Mock).mockResolvedValue([baseRow]);

    await useCase.execute({
      locale: 'en',
      specialtyCategorySlug: 'mental-health',
      specialtySlug: 'therapy',
    });

    expect(publicReadRepository.listPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        specialtyCategorySlug: 'mental-health',
        specialtySlug: 'therapy',
      }),
    );
  });

  it('uses shared pricing context so Egypt-authenticated users see EGP display prices', async () => {
    (publicReadRepository.listPublic as jest.Mock).mockResolvedValue([baseRow]);
    (pricingContextService.resolve as jest.Mock).mockResolvedValue({
      resolvedCountryIsoCode: 'EG',
      regionalPricingMode: 'EGYPT_LOCAL',
      currencyCode: 'EGP',
      provider: 'PAYMOB',
    });

    const result = await useCase.execute({
      locale: 'en',
      currentUserId: 'patient-1',
    });

    expect(pricingContextService.resolve).toHaveBeenCalledWith({
      currentUserId: 'patient-1',
      guestCountryIsoCode: undefined,
    });
    expect(result.items[0].currencyCode).toBe('EGP');
    expect(result.items[0].displaySessionPrice30).toBe(250);
    expect(result.items[0].displaySessionPrice60).toBe(450);
    expect(result.items[0].sessionPrice30).toBe(250);
    expect(result.items[0].sessionPrice60).toBe(450);
  });

  it('does not borrow an EGP value when the selected USD value is missing', async () => {
    (publicReadRepository.listPublic as jest.Mock).mockResolvedValue([
      {
        ...baseRow,
        sessionPrice30Usd: null,
        sessionPrice60Usd: null,
      },
    ]);

    const result = await useCase.execute({ locale: 'en' });

    expect(result.items[0].currencyCode).toBe('USD');
    expect(result.items[0].sessionPrice30).toBeNull();
    expect(result.items[0].sessionPrice60).toBeNull();
    expect(result.items[0].displaySessionPrice30).toBeNull();
    expect(result.items[0].displaySessionPrice60).toBeNull();
  });
});
