import { Prisma } from '@prisma/client';
import type { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import type { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import { ListPublicPractitionerFiltersUseCase } from './list-public-practitioner-filters.use-case';

describe('ListPublicPractitionerFiltersUseCase', () => {
  const publicReadRepository = {
    listPublicFilterMetadataSource: jest.fn(),
  } as unknown as PublicPractitionerReadRepository;
  const patientProfileRepository = {
    findByUserId: jest.fn(),
  } as unknown as PatientProfileRepository;

  const useCase = new ListPublicPractitionerFiltersUseCase(
    publicReadRepository,
    patientProfileRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);
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
          name: 'نفسي',
        },
        practitionerCount: 2,
      },
    ]);
    expect(result.specialtyCategories).toEqual([
      {
        value: 'mental-health',
        label: 'نفسي',
        practitionerCount: 2,
      },
    ]);
    expect(result.practitionerKinds).toEqual([
      { value: 'doctor', label: 'طبيب نفسي', practitionerCount: 1 },
      { value: 'therapist', label: 'معالج نفسي', practitionerCount: 1 },
    ]);
    expect(result.feeBounds).toEqual({
      min: 8,
      max: 22,
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
      patientProfileRepository.findByUserId as jest.Mock
    ).mockResolvedValue({
      country: { isoCode: 'EG' },
    });
    (
      publicReadRepository.listPublicFilterMetadataSource as jest.Mock
    ).mockResolvedValue([]);

    const result = await useCase.execute({
      locale: 'en',
      currentUserId: 'patient-1',
    });

    expect(result.feeBounds).toEqual({
      min: 0,
      max: 0,
      currency: 'EGP',
      step: 50,
    });
    expect(
      publicReadRepository.listPublicFilterMetadataSource,
    ).toHaveBeenCalledWith({
      locale: 'en',
      currencyCode: 'EGP',
    });
  });
});
