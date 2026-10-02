import { SessionMode } from '@prisma/client';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { ListPublicPackageOffersUseCase } from './list-public-package-offers.use-case';

describe('ListPublicPackageOffersUseCase professional-title projection', () => {
  const plan = {
    id: 'plan-4',
    code: 'STANDARD_4',
    title: 'Four sessions',
    description: null,
    sessionCount: 4,
    discountPercent: '10',
    isActive: true,
    sortOrder: 1,
    archivedAt: null,
    metadataJson: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const practitioner = {
    id: 'practitioner-1',
    publicSlug: 'sarah',
    sessionPrice30: '500',
    sessionPrice60: '900',
    sessionPrice30Egp: '500',
    sessionPrice30Usd: '20',
    sessionPrice60Egp: '900',
    sessionPrice60Usd: '35',
    avatarUrl: null,
    professionalTitle: 'Legacy Therapist',
    acceptsPackages: true,
    countryId: 'country-1',
    country: { id: 'country-1', isoCode: 'EG', currencyCode: 'EGP' },
    user: { id: 'user-1', displayName: 'Sarah Ahmed', status: 'ACTIVE' },
    specialties: [
      {
        specialtyId: 'specialty-1',
        specialty: {
          id: 'specialty-1',
          translations: [{ locale: 'en', title: 'Therapy' }],
        },
      },
    ],
  };

  const prisma = {
    practitionerProfile: { findMany: jest.fn() },
  };
  const packagePlanRepository = { listActive: jest.fn() } as never;
  const packagePlanPresenter = { toViewModel: jest.fn() } as never;
  const packagePlanQuotePresenter = {} as never;
  const packagePlanPolicyService = {
    assertPackagesEnabled: jest.fn(),
  } as never;
  const packageQuoteCalculatorService = { calculate: jest.fn() } as never;
  const professionalContentRepository = {
    findByPractitionerProfileIds: jest.fn(),
  } as never;

  const useCase = new ListPublicPackageOffersUseCase(
    prisma as never,
    packagePlanRepository,
    packagePlanPresenter,
    packagePlanQuotePresenter,
    packagePlanPolicyService,
    packageQuoteCalculatorService,
    professionalContentRepository,
    new PractitionerProfessionalContentResolver(),
  );

  const execute = (locale: 'ar' | 'en', search?: string) =>
    useCase.execute({
      locale,
      query: {
        page: 1,
        limit: 10,
        durationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        ...(search ? { search } : {}),
      },
      guestCountryIsoCode: 'EG',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    (
      packagePlanPolicyService.assertPackagesEnabled as jest.Mock
    ).mockResolvedValue(undefined);
    (packagePlanRepository.listActive as jest.Mock).mockResolvedValue([plan]);
    (packagePlanPresenter.toViewModel as jest.Mock).mockReturnValue({
      id: plan.id,
      code: plan.code,
      title: plan.title,
      description: plan.description,
      sessionCount: plan.sessionCount,
      discountPercent: plan.discountPercent,
    });
    (packageQuoteCalculatorService.calculate as jest.Mock).mockImplementation(
      ({ selectedDurationMinutes }: { selectedDurationMinutes: number }) => ({
        selectedCurrencyCode: 'EGP',
        selectedBaseSessionPrice:
          selectedDurationMinutes === 30 ? '500' : '900',
        undiscountedTotal: selectedDurationMinutes === 30 ? '2000' : '3600',
        discountAmount: selectedDurationMinutes === 30 ? '200' : '360',
        patientPayableTotal: selectedDurationMinutes === 30 ? '1800' : '3240',
      }),
    );
    prisma.practitionerProfile.findMany.mockResolvedValue([practitioner]);
    (
      professionalContentRepository.findByPractitionerProfileIds as jest.Mock
    ).mockResolvedValue([
      {
        id: 'practitioner-1',
        primaryContentLocale: 'en',
        professionalTitle: practitioner.professionalTitle,
        bio: null,
        professionalContentTranslations: [
          { locale: 'ar', professionalTitle: 'أخصائي نفسي', bio: null },
          {
            locale: 'en',
            professionalTitle: 'Clinical Psychologist',
            bio: null,
          },
        ],
      },
    ]);
  });

  it('changes only the resolved title between AR and EN and batches unique practitioners', async () => {
    const arabic = await execute('ar');
    const english = await execute('en');
    const arabicAgain = await execute('ar');

    expect(arabic.items[0].practitioner.professionalTitle).toBe('أخصائي نفسي');
    expect(english.items[0].practitioner.professionalTitle).toBe(
      'Clinical Psychologist',
    );
    expect(arabicAgain.items[0].practitioner.professionalTitle).toBe(
      'أخصائي نفسي',
    );

    const withoutTitle = (result: Awaited<ReturnType<typeof execute>>) =>
      result.items.map(({ practitioner: itemPractitioner, ...item }) => ({
        ...item,
        practitioner: { ...itemPractitioner, professionalTitle: undefined },
      }));
    expect(withoutTitle(arabic)).toEqual(withoutTitle(english));
    expect(
      professionalContentRepository.findByPractitionerProfileIds,
    ).toHaveBeenNthCalledWith(1, ['practitioner-1']);
    expect(
      professionalContentRepository.findByPractitionerProfileIds,
    ).toHaveBeenNthCalledWith(2, ['practitioner-1']);
    expect(
      professionalContentRepository.findByPractitionerProfileIds,
    ).toHaveBeenNthCalledWith(3, ['practitioner-1']);
  });

  it('keeps the legacy title when no live content record exists', async () => {
    (
      professionalContentRepository.findByPractitionerProfileIds as jest.Mock
    ).mockResolvedValue([]);

    const result = await execute('ar');

    expect(result.items[0].practitioner.professionalTitle).toBe(
      'Legacy Therapist',
    );
  });

  it('adds bilingual professional-content matching to the practitioner predicate only', async () => {
    await execute('ar', 'family');

    const where = prisma.practitionerProfile.findMany.mock.calls[0][0].where;

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { user: { displayName: { contains: 'family', mode: 'insensitive' } } },
        { professionalTitle: { contains: 'family', mode: 'insensitive' } },
        { bio: { contains: 'family', mode: 'insensitive' } },
        {
          professionalContentTranslations: {
            some: {
              locale: { in: ['ar', 'en'] },
              OR: [
                {
                  professionalTitle: {
                    contains: 'family',
                    mode: 'insensitive',
                  },
                },
                { bio: { contains: 'family', mode: 'insensitive' } },
              ],
            },
          },
        },
      ]),
    );
    expect(where.specialties).toBeUndefined();
  });
});
