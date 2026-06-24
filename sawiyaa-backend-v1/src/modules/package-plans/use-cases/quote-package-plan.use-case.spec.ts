import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PackagePlanQuotePresenter } from '../presenters/package-plan-quote.presenter';
import { QuotePackagePlanUseCase } from './quote-package-plan.use-case';

describe('QuotePackagePlanUseCase', () => {
  const packagePlanRepository = {
    findByCode: jest.fn(),
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
    assertPurchasesEnabled: jest.fn(),
  } as never;
  const publicPractitionerReadRepository = {
    findByPublicSlug: jest.fn(),
  } as never;
  const publicPractitionerVisibilityPolicy =
    new PublicPractitionerVisibilityPolicy();
  const patientProfileRepository = {
    findByUserId: jest.fn(),
  } as never;
  const packageQuoteCalculatorService = {
    calculate: jest.fn(),
  } as never;

  const useCase = new QuotePackagePlanUseCase(
    packagePlanRepository,
    packagePlanPresenter,
    packagePlanQuotePresenter,
    packagePlanPolicyService,
    publicPractitionerReadRepository,
    publicPractitionerVisibilityPolicy,
    patientProfileRepository,
    packageQuoteCalculatorService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a full patient quote when the practitioner and plan are eligible', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      countryId: 'country-egy',
    });
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
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
    (packagePlanRepository.findByCode as jest.Mock).mockResolvedValue({
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
    });
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
      userId: 'patient-user-1',
      locale: 'en',
      packagePlanCode: 'SESSIONS_4',
      practitionerSlug: 'dr-youssef-abdallah',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      currencyCode: 'EGP',
    });

    expect('platformFinalShare' in result.item.quote).toBe(false);
    expect('commissionMode' in result.item.quote).toBe(false);
    expect('baseSessionPriceEgp' in result.item.quote).toBe(false);
    expect(result.item.quote.patientPayableTotal).toBe('360.00');
  });

  it('throws when the plan is inactive or missing', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      countryId: 'country-egy',
    });
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
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
    (packagePlanRepository.findByCode as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'patient-user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        currencyCode: 'EGP',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects practitioners that are not eligible for package quotes', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      countryId: 'country-egy',
    });
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
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
    (packagePlanRepository.findByCode as jest.Mock).mockResolvedValue({
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
    });

    await expect(
      useCase.execute({
        userId: 'patient-user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        currencyCode: 'EGP',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inactive plans', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      countryId: 'country-egy',
    });
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
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
    (packagePlanRepository.findByCode as jest.Mock).mockResolvedValue({
      code: 'SESSIONS_4',
      title: '4 Session Bundle',
      description: 'Four sessions with a 10% discount.',
      sessionCount: 4,
      discountPercent: { toString: () => '10.00' },
      isActive: false,
      sortOrder: 1,
      archivedAt: null,
      metadataJson: {},
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      useCase.execute({
        userId: 'patient-user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        currencyCode: 'EGP',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
