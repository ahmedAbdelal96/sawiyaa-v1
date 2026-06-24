import { Prisma } from '@prisma/client';
import { SessionReviewRatingAggregationService } from '@modules/reviews/services/session-review-rating-aggregation.service';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import type { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import type { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import { ListPublicPractitionersUseCase } from './list-public-practitioners.use-case';

describe('ListPublicPractitionersUseCase', () => {
  const publicReadRepository = {
    listPublic: jest.fn(),
  } as unknown as PublicPractitionerReadRepository;
  const patientProfileRepository = {
    findByUserId: jest.fn(),
  } as unknown as PatientProfileRepository;
  const sessionReviewRatingAggregationService = {
    aggregateByPractitionerIds: jest.fn(),
  } as unknown as SessionReviewRatingAggregationService;
  const mapper = new PublicPractitionerMapper();
  const visibilityPolicy = new PublicPractitionerVisibilityPolicy();

  const useCase = new ListPublicPractitionersUseCase(
    mapper,
    visibilityPolicy,
    publicReadRepository,
    patientProfileRepository,
    sessionReviewRatingAggregationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('exposes structured dual-currency pricing and keeps legacy fields compatible', async () => {
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
    expect(result.items[0].sessionPrice30).toBe(111);
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
});
