import { Prisma } from '@prisma/client';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import { GetPublicPractitionerDetailsUseCase } from './get-public-practitioner-details.use-case';

describe('GetPublicPractitionerDetailsUseCase', () => {
  const publicReadRepository = {
    findByPublicSlug: jest.fn(),
    countApprovedCredentials: jest.fn(),
  } as never;
  const mapper = new PublicPractitionerMapper();
  const visibilityPolicy = new PublicPractitionerVisibilityPolicy();

  const useCase = new GetPublicPractitionerDetailsUseCase(
    mapper,
    visibilityPolicy,
    publicReadRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
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
      specialties: [{ specialtyId: 'specialty-1', specialty: { slug: 'therapy', translations: [] }, isPrimary: true }],
      ratingSummary: { averageRating: null, publishedReviewsCount: 0 },
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

    const result = await useCase.execute({
      slug: 'dr-youssef-abdallah',
      locale: 'en',
    });

    expect(result.item.pricing).toEqual({
      session30: { egp: 250, usd: 8 },
      session60: { egp: 450, usd: 15 },
    });
    expect(result.item.sessionPrice60).toBe(222);
    expect(result.item.sessionPrice60Usd).toBe(15);
  });
});
