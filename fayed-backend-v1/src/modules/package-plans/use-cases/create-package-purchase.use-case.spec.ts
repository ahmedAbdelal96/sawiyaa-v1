import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SessionMode,
  SessionPaymentCoverageType,
  SessionStatus,
} from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { CreatePackagePurchaseUseCase } from './create-package-purchase.use-case';

describe('CreatePackagePurchaseUseCase', () => {
  const configService = {
    get: jest.fn((key: string, defaultValue?: number) =>
      key === 'session.paymentReservationMinutes' ? 15 : defaultValue,
    ),
  } as unknown as ConfigService;
  const prisma = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback({} as never),
    ),
  } as never;
  const patientProfileRepository = {
    findByUserId: jest.fn(),
  } as never;
  const publicPractitionerReadRepository = {
    findByPublicSlug: jest.fn(),
  } as never;
  const publicPractitionerVisibilityPolicy =
    new PublicPractitionerVisibilityPolicy();
  const packagePlanRepository = {
    findByCode: jest.fn(),
  } as never;
  const packagePurchaseRepository = {
    create: jest.fn(),
  } as never;
  const packagePurchasePresenter = {
    toViewModel: jest.fn((input: { purchase: { id: string } }) => ({
      id: input.purchase.id,
      status: 'PENDING_PAYMENT',
      planCode: 'SESSIONS_4',
      sessionCount: 4,
      discountPercent: '10.00',
      practitionerId: 'practitioner-1',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      selectedBaseSessionPrice: '100.00',
      undiscountedTotal: '400.00',
      discountAmount: '40.00',
      patientPayableTotal: '360.00',
      paymentExpiresAt: '2026-01-01T00:15:00.000Z',
      linkedSessions: { totalItems: 4, items: [] },
      linkedSessionsCount: 4,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })),
  } as never;
  const packagePlanPolicyService = {
    assertPackagesEnabled: jest.fn(),
    assertPurchasesEnabled: jest.fn(),
  } as never;
  const packageQuoteCalculatorService = {
    calculate: jest.fn(),
  } as never;
  const validatePackagePurchaseSlotsService = {
    validate: jest.fn(),
  } as never;
  const sessionRepository = {
    reserveNextSessionCode: jest.fn(),
    createSession: jest.fn(),
  } as never;

  const useCase = new CreatePackagePurchaseUseCase(
    configService,
    prisma,
    patientProfileRepository,
    publicPractitionerReadRepository,
    publicPractitionerVisibilityPolicy,
    packagePlanRepository,
    packagePurchaseRepository,
    packagePurchasePresenter,
    packagePlanPolicyService,
    packageQuoteCalculatorService,
    validatePackagePurchaseSlotsService,
    sessionRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (
      packagePlanPolicyService.assertPackagesEnabled as jest.Mock
    ).mockResolvedValue(undefined);
    (
      packagePlanPolicyService.assertPurchasesEnabled as jest.Mock
    ).mockResolvedValue(undefined);
  });

  function setHappyPathMocks() {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      countryId: 'country-egy',
    });
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
      publicSlug: 'dr-youssef-abdallah',
      user: { timezone: 'Africa/Cairo', status: 'ACTIVE', displayName: 'Dr Y' },
      countryId: 'country-egy',
      country: { currencyCode: 'EGP' },
      acceptsPackages: true,
      sessionPrice30Egp: '50.00',
      sessionPrice30Usd: '20.00',
      sessionPrice60Egp: '100.00',
      sessionPrice60Usd: '40.00',
      status: 'APPROVED',
      isPublicProfilePublished: true,
      specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
      professionalTitle: 'Therapist',
      bio: 'Bio',
    });
    (packagePlanRepository.findByCode as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      code: 'SESSIONS_4',
      title: '4 Session Bundle',
      description: 'Four sessions',
      sessionCount: 4,
      discountPercent: '10.00',
      isActive: true,
      archivedAt: null,
    });
    (packageQuoteCalculatorService.calculate as jest.Mock).mockResolvedValue({
      planCode: 'SESSIONS_4',
      sessionCount: 4,
      discountPercent: '10.00',
      practitionerId: 'practitioner-1',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      selectedBaseSessionPrice: '100.00',
      undiscountedTotal: '400.00',
      discountAmount: '40.00',
      patientPayableTotal: '360.00',
      baseSessionPriceEgp: '100.00',
      baseSessionPriceUsd: '40.00',
      platformDiscountShare: '20.00',
      practitionerDiscountShare: '20.00',
      commissionMode: 'LOCAL',
      platformOriginalShare: '120.00',
      practitionerOriginalShare: '280.00',
      platformFinalShare: '100.00',
      practitionerFinalShare: '260.00',
      roundingAdjustment: '0.00',
    });
    (
      validatePackagePurchaseSlotsService.validate as jest.Mock
    ).mockResolvedValue({
      timezone: 'Africa/Cairo',
      slots: [
        {
          scheduledStartAt: new Date('2999-01-01T10:00:00.000Z'),
          scheduledEndAt: new Date('2999-01-01T11:00:00.000Z'),
        },
        {
          scheduledStartAt: new Date('2999-01-01T11:30:00.000Z'),
          scheduledEndAt: new Date('2999-01-01T12:30:00.000Z'),
        },
        {
          scheduledStartAt: new Date('2999-01-01T13:00:00.000Z'),
          scheduledEndAt: new Date('2999-01-01T14:00:00.000Z'),
        },
        {
          scheduledStartAt: new Date('2999-01-01T14:30:00.000Z'),
          scheduledEndAt: new Date('2999-01-01T15:30:00.000Z'),
        },
      ],
    });
    (sessionRepository.reserveNextSessionCode as jest.Mock)
      .mockResolvedValueOnce('SES-2999-000001')
      .mockResolvedValueOnce('SES-2999-000002')
      .mockResolvedValueOnce('SES-2999-000003')
      .mockResolvedValueOnce('SES-2999-000004');
    (sessionRepository.createSession as jest.Mock)
      .mockResolvedValueOnce({
        id: 'session-1',
        sessionCode: 'SES-2999-000001',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2999-01-01T10:00:00.000Z'),
        scheduledEndAt: new Date('2999-01-01T11:00:00.000Z'),
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        packageSessionIndex: 1,
      })
      .mockResolvedValueOnce({
        id: 'session-2',
        sessionCode: 'SES-2999-000002',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2999-01-01T11:30:00.000Z'),
        scheduledEndAt: new Date('2999-01-01T12:30:00.000Z'),
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        packageSessionIndex: 2,
      })
      .mockResolvedValueOnce({
        id: 'session-3',
        sessionCode: 'SES-2999-000003',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2999-01-01T13:00:00.000Z'),
        scheduledEndAt: new Date('2999-01-01T14:00:00.000Z'),
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        packageSessionIndex: 3,
      })
      .mockResolvedValueOnce({
        id: 'session-4',
        sessionCode: 'SES-2999-000004',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2999-01-01T14:30:00.000Z'),
        scheduledEndAt: new Date('2999-01-01T15:30:00.000Z'),
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        packageSessionIndex: 4,
      });
    (packagePurchaseRepository.create as jest.Mock).mockResolvedValue({
      id: 'purchase-1',
    });
  }

  it('creates a pending purchase with linked pending sessions and redacted response fields', async () => {
    setHappyPathMocks();

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      packagePlanCode: 'SESSIONS_4',
      practitionerSlug: 'dr-youssef-abdallah',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      selectedSessionSlots: [
        { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
        { scheduledStartAt: '2999-01-01T11:30:00.000Z' },
        { scheduledStartAt: '2999-01-01T13:00:00.000Z' },
        { scheduledStartAt: '2999-01-01T14:30:00.000Z' },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(packagePurchaseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        packagePlanId: 'plan-1',
        practitionerId: 'practitioner-1',
        patientId: 'patient-1',
        status: 'PENDING_PAYMENT',
        paymentId: null,
        paymentInitiatedAt: null,
        paidAt: null,
        activatedAt: null,
        completedAt: null,
        expiredAt: null,
        cancelledAt: null,
        refundedAt: null,
        selectedCurrencyCode: 'EGP',
      }),
      expect.anything(),
    );
    expect(sessionRepository.createSession).toHaveBeenCalledTimes(4);
    const createSessionMock = sessionRepository.createSession as jest.Mock;
    expect(createSessionMock.mock.calls[0][0].paymentCoverageType).toBe(
      SessionPaymentCoverageType.PACKAGE,
    );
    expect(createSessionMock.mock.calls[0][0].packageSessionIndex).toBe(1);
    expect('platformFinalShare' in result.item).toBe(false);
    expect(result.item.linkedSessionsCount).toBe(4);
  });

  it('rejects inactive package plans', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      countryId: 'country-egy',
    });
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
      publicSlug: 'dr-youssef-abdallah',
      user: { timezone: 'Africa/Cairo', status: 'ACTIVE', displayName: 'Dr Y' },
      countryId: 'country-egy',
      country: { currencyCode: 'EGP' },
      acceptsPackages: true,
      sessionPrice30Egp: '50.00',
      sessionPrice30Usd: '20.00',
      sessionPrice60Egp: '100.00',
      sessionPrice60Usd: '40.00',
      status: 'APPROVED',
      isPublicProfilePublished: true,
      specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
      professionalTitle: 'Therapist',
      bio: 'Bio',
    });
    (packagePlanRepository.findByCode as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T11:30:00.000Z' },
          { scheduledStartAt: '2999-01-01T13:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T14:30:00.000Z' },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when the package feature is disabled', async () => {
    (
      packagePlanPolicyService.assertPackagesEnabled as jest.Mock
    ).mockRejectedValue(
      new BadRequestException({ error: 'PACKAGE_PLANS_FEATURE_DISABLED' }),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        selectedSessionSlots: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inactive package plans', async () => {
    setHappyPathMocks();
    (packagePlanRepository.findByCode as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      code: 'SESSIONS_4',
      title: '4 Session Bundle',
      description: 'Four sessions',
      sessionCount: 4,
      discountPercent: '10.00',
      isActive: false,
      archivedAt: null,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T11:30:00.000Z' },
          { scheduledStartAt: '2999-01-01T13:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T14:30:00.000Z' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rolls back when one linked session creation fails', async () => {
    setHappyPathMocks();
    (sessionRepository.createSession as jest.Mock).mockReset();
    (sessionRepository.reserveNextSessionCode as jest.Mock).mockReset();
    (sessionRepository.reserveNextSessionCode as jest.Mock)
      .mockResolvedValueOnce('SES-2999-000001')
      .mockResolvedValueOnce('SES-2999-000002');
    (sessionRepository.createSession as jest.Mock)
      .mockResolvedValueOnce({
        id: 'session-1',
        sessionCode: 'SES-2999-000001',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2999-01-01T10:00:00.000Z'),
        scheduledEndAt: new Date('2999-01-01T11:00:00.000Z'),
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        packageSessionIndex: 1,
      })
      .mockRejectedValueOnce(new Error('session-create-failed'));

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T11:30:00.000Z' },
          { scheduledStartAt: '2999-01-01T13:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T14:30:00.000Z' },
        ],
      }),
    ).rejects.toThrow('session-create-failed');
  });

  it('maps session overlap exclusion violations to a conflict exception', async () => {
    setHappyPathMocks();
    (sessionRepository.reserveNextSessionCode as jest.Mock).mockReset();
    (sessionRepository.createSession as jest.Mock).mockReset();
    (sessionRepository.reserveNextSessionCode as jest.Mock).mockResolvedValueOnce(
      'SES-2999-000001',
    );
    (sessionRepository.createSession as jest.Mock).mockRejectedValueOnce({
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "Session_practitioner_time_no_overlap_excl"',
      meta: {
        constraint: 'Session_practitioner_time_no_overlap_excl',
      },
    });

    const error = await useCase
      .execute({
        userId: 'user-1',
        locale: 'en',
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-youssef-abdallah',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T11:30:00.000Z' },
          { scheduledStartAt: '2999-01-01T13:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T14:30:00.000Z' },
        ],
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect(
      JSON.stringify((error as ConflictException).getResponse()),
    ).not.toContain('23P01');
    expect(
      JSON.stringify((error as ConflictException).getResponse()),
    ).not.toContain('Session_practitioner_time_no_overlap_excl');
  });
});
