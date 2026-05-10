import { Prisma } from '@prisma/client';
import { PublicPractitionerMapper } from '../mappers/public-practitioner.mapper';
import { PublicPractitionerVisibilityPolicy } from '../policies/public-practitioner-visibility.policy';
import { ListPublicPractitionersUseCase } from './list-public-practitioners.use-case';

describe('ListPublicPractitionersUseCase', () => {
  const publicReadRepository = {
    listPublic: jest.fn(),
  } as never;
  const mapper = new PublicPractitionerMapper();
  const visibilityPolicy = new PublicPractitionerVisibilityPolicy();

  const useCase = new ListPublicPractitionersUseCase(
    mapper,
    visibilityPolicy,
    publicReadRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes structured dual-currency pricing and keeps legacy fields compatible', async () => {
    (publicReadRepository.listPublic as jest.Mock).mockResolvedValue({
      rows: [
        {
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
          ratingSummary: { averageRating: null, publishedReviewsCount: 0 },
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
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({
      locale: 'en',
    });

    expect(result.items[0].pricing).toEqual({
      session30: { egp: 250, usd: 8 },
      session60: { egp: 450, usd: 15 },
    });
    expect(result.items[0].sessionPrice30).toBe(111);
    expect(result.items[0].sessionPrice30Egp).toBe(250);
    expect(result.items[0].sessionPrice30Usd).toBe(8);
  });

  it('marks stale online presence as offline in the public list', async () => {
    (publicReadRepository.listPublic as jest.Mock).mockResolvedValue({
      rows: [
        {
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
          ratingSummary: { averageRating: null, publishedReviewsCount: 0 },
          presence: {
            status: 'ONLINE',
            lastSeenAtUtc: new Date('2025-01-01T00:00:00.000Z'),
          },
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
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({
      locale: 'en',
    });

    expect(result.items[0].isOnlineNow).toBe(false);
  });
});
