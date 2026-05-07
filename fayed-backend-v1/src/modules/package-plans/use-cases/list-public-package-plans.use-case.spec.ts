import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PackagePlanQuotePresenter } from '../presenters/package-plan-quote.presenter';
import { ListPublicPackagePlansUseCase } from './list-public-package-plans.use-case';

describe('ListPublicPackagePlansUseCase', () => {
  const packagePlanRepository = {
    listActive: jest.fn(),
  } as never;
  const packagePlanPresenter = {
    toViewModel: jest.fn((item: Record<string, unknown>) => ({
      code: item.code,
      title: item.title,
      description: item.description,
      sessionCount: item.sessionCount,
      discountPercent: item.discountPercent.toString(),
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      archivedAt: null,
      metadataJson: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      counts: { purchaseCount: 0 },
    })),
  } as never;
  const packagePlanQuotePresenter = new PackagePlanQuotePresenter();
  const packagePlanPolicyService = {
    assertPackagesEnabled: jest.fn(),
    resolveDefaultPreviewCurrency: jest.fn().mockReturnValue('EGP'),
  } as never;
  const publicPractitionerReadRepository = {
    findByPublicSlug: jest.fn(),
  } as never;
  const publicPractitionerVisibilityPolicy = new PublicPractitionerVisibilityPolicy();
  const packageQuoteCalculatorService = {
    calculate: jest.fn(),
  } as never;

  const useCase = new ListPublicPackagePlansUseCase(
    packagePlanRepository,
    packagePlanPresenter,
    packagePlanQuotePresenter,
    packagePlanPolicyService,
    publicPractitionerReadRepository,
    publicPractitionerVisibilityPolicy,
    packageQuoteCalculatorService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns public-safe plan quotes without internal splits', async () => {
    (publicPractitionerReadRepository.findByPublicSlug as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      status: 'APPROVED',
      user: { status: 'ACTIVE', displayName: 'Doctor Name' },
      isPublicProfilePublished: true,
      publicSlug: 'dr-youssef-abdallah',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      acceptsPackages: true,
      specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
      country: { currencyCode: 'EGP' },
    });
    (packagePlanRepository.listActive as jest.Mock).mockResolvedValue([
      {
        code: 'SESSIONS_4',
        title: '4 Session Bundle',
        description: 'Four sessions with a 10% discount.',
        sessionCount: 4,
        discountPercent: { toString: () => '10.00' },
        isActive: true,
        sortOrder: 1,
        archivedAt: null,
        metadataJson: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    (packageQuoteCalculatorService.calculate as jest.Mock).mockResolvedValue({
      planCode: 'SESSIONS_4',
      sessionCount: 4,
      discountPercent: '10.00',
      practitionerId: 'practitioner-1',
      durationMinutes: 60,
      sessionMode: 'VIDEO',
      selectedCurrencyCode: 'EGP',
      selectedBaseSessionPrice: '100.00',
      undiscountedTotal: '400.00',
      discountAmount: '40.00',
      patientPayableTotal: '360.00',
      platformDiscountShare: '20.00',
      practitionerDiscountShare: '20.00',
      commissionMode: 'LOCAL',
      platformOriginalShare: '120.00',
      practitionerOriginalShare: '280.00',
      platformFinalShare: '100.00',
      practitionerFinalShare: '260.00',
      roundingAdjustment: '0.00',
      internalBreakdownVisible: true,
    });

    const result = await useCase.execute({
      locale: 'en',
      practitionerSlug: 'dr-youssef-abdallah',
    });

    expect(result.items).toHaveLength(1);
    expect('platformFinalShare' in result.items[0].quote).toBe(false);
    expect('practitionerFinalShare' in result.items[0].quote).toBe(false);
    expect('roundingAdjustment' in result.items[0].quote).toBe(false);
    expect(result.items[0].quote.patientPayableTotal).toBe('360.00');
  });

  it('returns an empty list for practitioners that are not package eligible', async () => {
    (publicPractitionerReadRepository.findByPublicSlug as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      status: 'APPROVED',
      user: { status: 'ACTIVE', displayName: 'Doctor Name' },
      isPublicProfilePublished: true,
      publicSlug: 'dr-youssef-abdallah',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      acceptsPackages: false,
      specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
      country: { currencyCode: 'EGP' },
    });

    const result = await useCase.execute({
      locale: 'en',
      practitionerSlug: 'dr-youssef-abdallah',
    });

    expect(result.items).toEqual([]);
    expect(packagePlanRepository.listActive).not.toHaveBeenCalled();
  });
});
