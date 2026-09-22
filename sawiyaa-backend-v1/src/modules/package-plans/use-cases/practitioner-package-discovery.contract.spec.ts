import { PractitionerStatus, SessionMode, UserStatus } from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PackagePlanQuotePresenter } from '../presenters/package-plan-quote.presenter';
import { ListPublicPackagePlansUseCase } from './list-public-package-plans.use-case';

const makePlan = (overrides: Record<string, unknown> = {}) => ({
  id: 'plan-1',
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
  ...overrides,
});

const makePractitioner = (overrides: Record<string, unknown> = {}) => ({
  id: 'practitioner-1',
  status: PractitionerStatus.APPROVED,
  user: { status: UserStatus.ACTIVE, displayName: 'Doctor Name' },
  isPublicProfilePublished: true,
  publicSlug: 'doctor-name',
  professionalTitle: 'Therapist',
  bio: 'A public biography.',
  acceptsPackages: true,
  specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
  country: { currencyCode: 'EGP', isoCode: 'EG' },
  sessionPrice30Egp: '300.00',
  sessionPrice30Usd: '18.00',
  sessionPrice60Egp: '550.00',
  sessionPrice60Usd: '33.00',
  ...overrides,
});

const makeQuote = (planCode = 'SESSIONS_4') => ({
  planCode,
  sessionCount: 4,
  discountPercent: '10.00',
  practitionerId: 'practitioner-1',
  durationMinutes: 60,
  sessionMode: SessionMode.VIDEO,
  selectedCurrencyCode: 'EGP',
  regionalPricingMode: 'EGYPT_LOCAL',
  resolvedCountryIsoCode: 'EG',
  provider: 'EGY_LOCAL',
  selectedBaseSessionPrice: '550.00',
  undiscountedTotal: '2200.00',
  discountAmount: '220.00',
  patientPayableTotal: '1980.00',
  platformDiscountShare: '110.00',
  practitionerDiscountShare: '110.00',
  commissionMode: 'LOCAL',
  platformOriginalShare: '660.00',
  practitionerOriginalShare: '1540.00',
  platformFinalShare: '550.00',
  practitionerFinalShare: '1430.00',
  roundingAdjustment: '0.00',
  internalBreakdownVisible: true,
});

describe('practitioner package discovery contract', () => {
  const packagePlanRepository = { listActive: jest.fn() } as never;
  const packagePlanPresenter = {
    toViewModel: jest.fn((plan: any) => ({
      id: plan.id,
      code: plan.code,
      title: plan.title,
      description: plan.description,
      sessionCount: plan.sessionCount,
      discountPercent: plan.discountPercent.toString(),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      archivedAt: plan.archivedAt,
      metadataJson: plan.metadataJson,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      counts: { purchaseCount: 0 },
    })),
  } as never;
  const packagePlanQuotePresenter = new PackagePlanQuotePresenter();
  const packagePlanPolicyService = {
    assertPackagesEnabled: jest.fn(),
  } as never;
  const patientProfileRepository = { findByUserId: jest.fn() } as never;
  const publicPractitionerReadRepository = {
    findByPublicSlug: jest.fn(),
  } as never;
  const packageQuoteCalculatorService = { calculate: jest.fn() } as never;

  const useCase = new ListPublicPackagePlansUseCase(
    packagePlanRepository,
    packagePlanPresenter,
    packagePlanQuotePresenter,
    packagePlanPolicyService,
    patientProfileRepository,
    publicPractitionerReadRepository,
    new PublicPractitionerVisibilityPolicy(),
    packageQuoteCalculatorService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (publicPractitionerReadRepository.findByPublicSlug as jest.Mock).mockResolvedValue(
      makePractitioner(),
    );
    (packagePlanRepository.listActive as jest.Mock).mockResolvedValue([
      makePlan(),
    ]);
    (packageQuoteCalculatorService.calculate as jest.Mock).mockResolvedValue(
      makeQuote(),
    );
  });

  const execute = () =>
    useCase.execute({
      locale: 'en',
      practitionerSlug: 'doctor-name',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
    });

  it('returns one active, purchasable package', async () => {
    const result = await execute();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].item.code).toBe('SESSIONS_4');
    expect(result.items[0].quote.patientPayableTotal).toBe('1980.00');
  });

  it('returns every active package for the practitioner', async () => {
    (packagePlanRepository.listActive as jest.Mock).mockResolvedValue([
      makePlan(),
      makePlan({ id: 'plan-2', code: 'SESSIONS_6', sessionCount: 6 }),
      makePlan({ id: 'plan-3', code: 'SESSIONS_8', sessionCount: 8 }),
    ]);
    (packageQuoteCalculatorService.calculate as jest.Mock)
      .mockResolvedValueOnce(makeQuote('SESSIONS_4'))
      .mockResolvedValueOnce({ ...makeQuote('SESSIONS_6'), sessionCount: 6 })
      .mockResolvedValueOnce({ ...makeQuote('SESSIONS_8'), sessionCount: 8 });

    const result = await execute();
    expect(result.items.map(({ item }) => item.code)).toEqual([
      'SESSIONS_4',
      'SESSIONS_6',
      'SESSIONS_8',
    ]);
  });

  it('hides an inactive plan even if a stale repository result contains it', async () => {
    (packagePlanRepository.listActive as jest.Mock).mockResolvedValue([
      makePlan({ isActive: false }),
    ]);
    const result = await execute();
    expect(result.items).toEqual([]);
    expect(packageQuoteCalculatorService.calculate).not.toHaveBeenCalled();
  });

  it('hides an archived plan even if a stale repository result contains it', async () => {
    (packagePlanRepository.listActive as jest.Mock).mockResolvedValue([
      makePlan({ archivedAt: new Date('2026-02-01T00:00:00.000Z') }),
    ]);
    const result = await execute();
    expect(result.items).toEqual([]);
    expect(packageQuoteCalculatorService.calculate).not.toHaveBeenCalled();
  });

  it('hides a practitioner who has disabled package purchases', async () => {
    (publicPractitionerReadRepository.findByPublicSlug as jest.Mock).mockResolvedValue(
      makePractitioner({ acceptsPackages: false }),
    );
    const result = await execute();
    expect(result.items).toEqual([]);
    expect(packagePlanRepository.listActive).not.toHaveBeenCalled();
  });

  it('hides a practitioner who is not publicly published', async () => {
    (publicPractitionerReadRepository.findByPublicSlug as jest.Mock).mockResolvedValue(
      makePractitioner({ isPublicProfilePublished: false }),
    );
    const result = await execute();
    expect(result.items).toEqual([]);
    expect(packagePlanRepository.listActive).not.toHaveBeenCalled();
  });

  it('hides a plan when the authoritative currency quote is unavailable', async () => {
    (packageQuoteCalculatorService.calculate as jest.Mock).mockRejectedValue({
      response: { error: 'PACKAGE_PLAN_CURRENCY_PRICE_UNAVAILABLE' },
    });
    const result = await execute();
    expect(result.items).toEqual([]);
  });

  it('passes practitioner and purchase quote context to the calculator', async () => {
    await execute();
    expect(packageQuoteCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({ code: 'SESSIONS_4' }),
        practitioner: expect.objectContaining({ id: 'practitioner-1' }),
        selectedDurationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        internalBreakdownVisible: false,
      }),
    );
  });
});
