import { Prisma } from '@prisma/client';
import { SessionReviewRatingAggregationService } from '@modules/reviews/services/session-review-rating-aggregation.service';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import type { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import type { PublicPractitionerPricingContextService } from '../services/public-practitioner-pricing-context.service';
import { GetPublicPractitionerDetailsUseCase } from './get-public-practitioner-details.use-case';

describe('GetPublicPractitionerDetailsUseCase', () => {
  const publicReadRepository = {
    findByPublicSlug: jest.fn(),
    countApprovedCredentials: jest.fn(),
  } as unknown as PublicPractitionerReadRepository;
  const pricingContextService = {
    resolve: jest.fn(),
  } as unknown as PublicPractitionerPricingContextService;
  const sessionReviewRatingAggregationService = {
    aggregateByPractitionerId: jest.fn(),
  } as unknown as SessionReviewRatingAggregationService;
  const mapper = new PublicPractitionerMapper();
  const visibilityPolicy = new PublicPractitionerVisibilityPolicy();

  const useCase = new GetPublicPractitionerDetailsUseCase(
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

  it('exposes structured dual-currency pricing and keeps legacy fields compatible', async () => {
    (publicReadRepository.findByPublicSlug as jest.Mock).mockResolvedValue({
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
      _count: { credentials: 1 },
      sessionPrice30: new Prisma.Decimal('111.00'),
      sessionPrice60: new Prisma.Decimal('222.00'),
      sessionPrice30Egp: new Prisma.Decimal('250.00'),
      sessionPrice30Usd: new Prisma.Decimal('8.00'),
      sessionPrice60Egp: new Prisma.Decimal('450.00'),
      sessionPrice60Usd: new Prisma.Decimal('15.00'),
      avatarUrl: null,
      yearsOfExperience: 7,
      acceptsPackages: true,
    });
    (
      publicReadRepository.countApprovedCredentials as jest.Mock
    ).mockResolvedValue(1);
    (
      sessionReviewRatingAggregationService.aggregateByPractitionerId as jest.Mock
    ).mockResolvedValue({
      averageRating: 4.5,
      ratingsCount: 8,
      publishedRatingsCount: 8,
      writtenReviewsCount: 5,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 1,
      rating4Count: 3,
      rating5Count: 4,
      latestPublishedReviewAt: '2026-03-06T00:00:00.000Z',
    });

    const result = await useCase.execute({
      slug: 'dr-youssef-abdallah',
      locale: 'en',
    });

    expect(result.item.pricing).toEqual({
      session30: { egp: 250, usd: 8 },
      session60: { egp: 450, usd: 15 },
    });
    expect(result.item.currencyCode).toBe('USD');
    expect(result.item.displaySessionPrice30).toBe(8);
    expect(result.item.displaySessionPrice60).toBe(15);
    expect(result.item.sessionPrice60).toBe(222);
    expect(result.item.sessionPrice60Usd).toBe(15);
    expect(result.item.ratingSummary).toEqual({
      averageRating: 4.5,
      ratingsCount: 8,
      publishedRatingsCount: 8,
      writtenReviewsCount: 5,
      totalReviews: 8,
    });
  });

  it('uses shared pricing context so guest Egypt traffic can resolve EGP when request country is provided', async () => {
    (publicReadRepository.findByPublicSlug as jest.Mock).mockResolvedValue({
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
      _count: { credentials: 1 },
      sessionPrice30: new Prisma.Decimal('111.00'),
      sessionPrice60: new Prisma.Decimal('222.00'),
      sessionPrice30Egp: new Prisma.Decimal('250.00'),
      sessionPrice30Usd: new Prisma.Decimal('8.00'),
      sessionPrice60Egp: new Prisma.Decimal('450.00'),
      sessionPrice60Usd: new Prisma.Decimal('15.00'),
      avatarUrl: null,
      yearsOfExperience: 7,
      acceptsPackages: true,
    });
    (publicReadRepository.countApprovedCredentials as jest.Mock).mockResolvedValue(1);
    (sessionReviewRatingAggregationService.aggregateByPractitionerId as jest.Mock).mockResolvedValue({
      averageRating: 4.5,
      ratingsCount: 8,
      publishedRatingsCount: 8,
      writtenReviewsCount: 5,
      latestPublishedReviewAt: '2026-03-06T00:00:00.000Z',
    });
    (pricingContextService.resolve as jest.Mock).mockResolvedValue({
      resolvedCountryIsoCode: 'EG',
      regionalPricingMode: 'EGYPT_LOCAL',
      currencyCode: 'EGP',
      provider: 'PAYMOB',
    });

    const result = await useCase.execute({
      slug: 'dr-youssef-abdallah',
      locale: 'en',
      guestCountryIsoCode: 'EG',
    });

    expect(pricingContextService.resolve).toHaveBeenCalledWith({
      currentUserId: undefined,
      guestCountryIsoCode: 'EG',
    });
    expect(result.item.currencyCode).toBe('EGP');
    expect(result.item.displaySessionPrice30).toBe(250);
    expect(result.item.displaySessionPrice60).toBe(450);
  });
});
