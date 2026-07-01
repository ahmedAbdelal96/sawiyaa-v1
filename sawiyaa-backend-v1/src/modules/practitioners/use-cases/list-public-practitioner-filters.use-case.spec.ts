import { Prisma } from '@prisma/client';
import type { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import type { PublicPractitionerPricingContextService } from '../services/public-practitioner-pricing-context.service';
import { PublicPractitionerSessionDuration } from '../dto/list-public-practitioners.dto';
import { ListPublicPractitionerFiltersUseCase } from './list-public-practitioner-filters.use-case';

describe('ListPublicPractitionerFiltersUseCase', () => {
  const publicReadRepository = {
    listPublicFilterMetadataSource: jest.fn(),
  } as unknown as PublicPractitionerReadRepository;
  const pricingContextService = {
    resolve: jest.fn(),
  } as unknown as PublicPractitionerPricingContextService;

  const useCase = new ListPublicPractitionerFiltersUseCase(
    publicReadRepository,
    pricingContextService,
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

  it('builds localized public-safe metadata and fee bounds for guests', async () => {
    (
      publicReadRepository.listPublicFilterMetadataSource as jest.Mock
    ).mockResolvedValue([
      {
        id: 'profile-1',
        practitionerType: 'PSYCHIATRIST',
        practitionerGender: 'MALE',
        country: {
          isoCode: 'EG',
          name: 'Egypt',
          nativeName: 'مصر',
        },
        languages: [
          {
            language: {
              code: 'ar',
              name: 'Arabic',
              nativeName: 'العربية',
            },
          },
        ],
        specialties: [
          {
            specialtyId: 'spec-1',
            specialty: {
              slug: 'anxiety-therapy',
              category: {
                id: 'cat-1',
                slug: 'mental-health',
                name: 'نفسي',
              },
              translations: [
                { locale: 'ar', title: 'علاج القلق' },
                { locale: 'en', title: 'Anxiety Therapy' },
              ],
            },
          },
        ],
        sessionPrice30Egp: new Prisma.Decimal('250'),
        sessionPrice30Usd: new Prisma.Decimal('8'),
        sessionPrice60Egp: new Prisma.Decimal('450'),
        sessionPrice60Usd: new Prisma.Decimal('15'),
      },
      {
        id: 'profile-2',
        practitionerType: 'OTHER',
        practitionerGender: 'FEMALE',
        country: {
          isoCode: 'SA',
          name: 'Saudi Arabia',
          nativeName: 'السعودية',
        },
        languages: [
          {
            language: {
              code: 'en',
              name: 'English',
              nativeName: 'English',
            },
          },
        ],
        specialties: [
          {
            specialtyId: 'spec-1',
            specialty: {
              slug: 'anxiety-therapy',
              category: {
                id: 'cat-1',
                slug: 'mental-health',
                name: 'نفسي',
              },
              translations: [{ locale: 'en', title: 'Anxiety Therapy' }],
            },
          },
        ],
        sessionPrice30Egp: null,
        sessionPrice30Usd: null,
        sessionPrice60Egp: null,
        sessionPrice60Usd: new Prisma.Decimal('22'),
      },
    ]);

    const result = await useCase.execute({ locale: 'ar' });

    expect(result.specialties).toEqual([
      {
        id: 'spec-1',
        slug: 'anxiety-therapy',
        name: 'علاج القلق',
        category: {
          id: 'cat-1',
          slug: 'mental-health',
          name: 'النفسي',
        },
        practitionerCount: 2,
      },
    ]);
    expect(result.specialtyCategories).toEqual([
      {
        value: 'mental-health',
        label: 'النفسي',
        practitionerCount: 2,
      },
    ]);
    expect(result.practitionerKinds).toEqual([
      { value: 'doctor', label: 'طبيب نفسي', practitionerCount: 1 },
      { value: 'therapist', label: 'معالج نفسي', practitionerCount: 1 },
    ]);
    expect(result.feeBounds).toEqual({
      min: 0,
      max: 22,
      actualMin: 8,
      currency: 'USD',
      step: 5,
    });
    expect(result.availability).toEqual({
      onlineNowSupported: true,
      availableTodaySupported: false,
      availableThisWeekSupported: false,
    });
    expect(
      publicReadRepository.listPublicFilterMetadataSource,
    ).toHaveBeenCalledWith({
      locale: 'ar',
      currencyCode: 'USD',
    });
  });

  it('uses patient country to resolve fee metadata currency', async () => {
    (
      publicReadRepository.listPublicFilterMetadataSource as jest.Mock
    ).mockResolvedValue([]);
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

    expect(result.feeBounds).toEqual({
      min: 0,
      max: 0,
      actualMin: 0,
      currency: 'EGP',
      step: 50,
    });
    expect(pricingContextService.resolve).toHaveBeenCalledWith({
      currentUserId: 'patient-1',
      guestCountryIsoCode: undefined,
    });
    expect(
      publicReadRepository.listPublicFilterMetadataSource,
    ).toHaveBeenCalledWith({
      locale: 'en',
      currencyCode: 'EGP',
    });
  });

  it('builds duration-aware fee bounds when duration=30 is selected', async () => {
    (
      publicReadRepository.listPublicFilterMetadataSource as jest.Mock
    ).mockResolvedValue([
      {
        id: 'profile-1',
        practitionerType: 'PSYCHIATRIST',
        practitionerGender: 'MALE',
        country: null,
        languages: [],
        specialties: [],
        sessionPrice30Egp: new Prisma.Decimal('420'),
        sessionPrice30Usd: new Prisma.Decimal('25'),
        sessionPrice60Egp: new Prisma.Decimal('760'),
        sessionPrice60Usd: new Prisma.Decimal('45'),
      },
      {
        id: 'profile-2',
        practitionerType: 'OTHER',
        practitionerGender: 'FEMALE',
        country: null,
        languages: [],
        specialties: [],
        sessionPrice30Egp: new Prisma.Decimal('320'),
        sessionPrice30Usd: new Prisma.Decimal('19'),
        sessionPrice60Egp: new Prisma.Decimal('580'),
        sessionPrice60Usd: new Prisma.Decimal('34'),
      },
    ]);
    (pricingContextService.resolve as jest.Mock).mockResolvedValue({
      resolvedCountryIsoCode: 'EG',
      regionalPricingMode: 'EGYPT_LOCAL',
      currencyCode: 'EGP',
      provider: 'PAYMOB',
    });

    const result = await useCase.execute({
      locale: 'en',
      duration: PublicPractitionerSessionDuration.THIRTY,
    });

    expect(result.feeBounds).toEqual({
      min: 0,
      max: 420,
      actualMin: 320,
      currency: 'EGP',
      step: 50,
    });
  });
});
