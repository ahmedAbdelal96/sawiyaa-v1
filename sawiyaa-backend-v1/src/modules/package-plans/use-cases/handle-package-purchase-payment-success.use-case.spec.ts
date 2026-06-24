import {
  SessionEventType,
  SessionStatus,
  PatientPackagePurchaseStatus,
} from '@prisma/client';
import { PackageSettlementService } from '@modules/financial-operations/services/package-settlement.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { HandlePackagePurchasePaymentSuccessUseCase } from './handle-package-purchase-payment-success.use-case';

describe('HandlePackagePurchasePaymentSuccessUseCase', () => {
  function buildUseCase(input?: {
    purchaseStatus?: PatientPackagePurchaseStatus;
    sessionStatuses?: SessionStatus[];
    paidAt?: Date | null;
    activatedAt?: Date | null;
    resolveByPayment?: boolean;
    resolveByMetadata?: boolean;
  }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const paymentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment-1',
        metadataJson: {
          packagePurchaseId: 'purchase-1',
        },
      }),
    };
    const packagePurchaseRepository = {
      findByPaymentId: jest.fn().mockResolvedValue(
        input?.resolveByPayment === false
          ? null
          : {
              id: 'purchase-1',
              patientId: 'patient-1',
              practitionerId: 'practitioner-1',
              status:
                input?.purchaseStatus ??
                PatientPackagePurchaseStatus.PENDING_PAYMENT,
              packagePlanId: 'plan-1',
              packagePlan: {
                code: 'SESSIONS_4',
                title: '4 sessions',
                discountPercent: 10,
              },
              paymentExpiresAt: new Date('2999-01-01T00:00:00.000Z'),
              paidAt: input?.paidAt ?? null,
              activatedAt: input?.activatedAt ?? null,
              sessions: (
                input?.sessionStatuses ?? [
                  SessionStatus.PENDING_PAYMENT,
                  SessionStatus.PENDING_PAYMENT,
                ]
              ).map((status, index) => ({
                id: `session-${index + 1}`,
                status,
                scheduledStartAt: new Date(
                  `2999-01-01T0${index + 1}:00:00.000Z`,
                ),
                packageSessionIndex: index + 1,
                packageSessionCount: 4,
              })),
            },
      ),
      findById: jest.fn().mockResolvedValue({
        id: 'purchase-1',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        status:
          input?.purchaseStatus ?? PatientPackagePurchaseStatus.PENDING_PAYMENT,
        packagePlanId: 'plan-1',
        packagePlan: {
          code: 'SESSIONS_4',
          title: '4 sessions',
          discountPercent: 10,
        },
        paymentExpiresAt: new Date('2999-01-01T00:00:00.000Z'),
        paidAt: input?.paidAt ?? null,
        activatedAt: input?.activatedAt ?? null,
        sessions: (
          input?.sessionStatuses ?? [
            SessionStatus.PENDING_PAYMENT,
            SessionStatus.PENDING_PAYMENT,
          ]
        ).map((status, index) => ({
          id: `session-${index + 1}`,
          status,
          scheduledStartAt: new Date(`2999-01-01T0${index + 1}:00:00.000Z`),
          packageSessionIndex: index + 1,
          packageSessionCount: 4,
        })),
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'purchase-1',
        status: PatientPackagePurchaseStatus.ACTIVE,
      }),
    };
    const sessionRepository = {
      updateStatus: jest.fn().mockResolvedValue({}),
      createEvent: jest.fn().mockResolvedValue({}),
    };
    const validateSessionStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };
    const operationalNotificationService = {
      notifySessionConfirmed: jest.fn().mockResolvedValue(undefined),
    } as unknown as OperationalNotificationService;
    const packageSettlementService = {
      reconcilePurchase: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
    } as unknown as PackageSettlementService;

    const useCase = new HandlePackagePurchasePaymentSuccessUseCase(
      prisma as never,
      paymentRepository as never,
      packagePurchaseRepository as never,
      sessionRepository as never,
      validateSessionStatusTransitionService as never,
      operationalNotificationService,
      packageSettlementService,
    );

    return {
      useCase,
      packagePurchaseRepository,
      sessionRepository,
      validateSessionStatusTransitionService,
      operationalNotificationService,
      packageSettlementService,
    };
  }

  it('activates a pending purchase and confirms linked pending sessions', async () => {
    const setup = buildUseCase();

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
    });

    expect(setup.packagePurchaseRepository.updateStatus).toHaveBeenCalledWith(
      'purchase-1',
      expect.objectContaining({
        status: PatientPackagePurchaseStatus.ACTIVE,
        paidAt: expect.any(Date),
        activatedAt: expect.any(Date),
      }),
      expect.anything(),
    );
    expect(setup.sessionRepository.updateStatus).toHaveBeenCalledTimes(2);
    expect(setup.sessionRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SessionEventType.PAYMENT_CONFIRMED,
      }),
      expect.anything(),
    );
    expect(
      setup.operationalNotificationService.notifySessionConfirmed,
    ).toHaveBeenCalledTimes(2);
    expect(
      setup.operationalNotificationService.notifySessionConfirmed,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        patientProfileId: 'patient-1',
        practitionerProfileId: 'practitioner-1',
        packageContext: expect.objectContaining({
          packagePurchaseId: 'purchase-1',
          packagePlanCode: 'SESSIONS_4',
          packagePlanTitle: '4 sessions',
          packageSessionCount: 4,
          packageDiscountPercent: 10,
        }),
      }),
    );
    expect(setup.packageSettlementService.reconcilePurchase).toHaveBeenCalled();
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.ACTIVE);
  });

  it('repairs active purchases that still have pending linked sessions', async () => {
    const setup = buildUseCase({
      purchaseStatus: PatientPackagePurchaseStatus.ACTIVE,
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
    });

    expect(setup.packagePurchaseRepository.updateStatus).toHaveBeenCalledTimes(
      1,
    );
    expect(setup.sessionRepository.updateStatus).toHaveBeenCalledTimes(2);
    expect(setup.packageSettlementService.reconcilePurchase).toHaveBeenCalled();
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.ACTIVE);
  });

  it('is idempotent for already active purchases with confirmed linked sessions', async () => {
    const setup = buildUseCase({
      purchaseStatus: PatientPackagePurchaseStatus.ACTIVE,
      sessionStatuses: [SessionStatus.CONFIRMED, SessionStatus.CONFIRMED],
      paidAt: new Date('2999-01-01T00:00:00.000Z'),
      activatedAt: new Date('2999-01-01T00:00:00.000Z'),
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
    });

    expect(setup.packagePurchaseRepository.updateStatus).not.toHaveBeenCalled();
    expect(setup.sessionRepository.updateStatus).not.toHaveBeenCalled();
    expect(setup.packageSettlementService.reconcilePurchase).toHaveBeenCalled();
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.ACTIVE);
  });

  it('repairs partially completed success flows without duplicating confirmed sessions', async () => {
    const setup = buildUseCase({
      purchaseStatus: PatientPackagePurchaseStatus.ACTIVE,
      sessionStatuses: [SessionStatus.CONFIRMED, SessionStatus.PENDING_PAYMENT],
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
    });

    expect(setup.packagePurchaseRepository.updateStatus).toHaveBeenCalledTimes(
      1,
    );
    expect(setup.sessionRepository.updateStatus).toHaveBeenCalledTimes(1);
    expect(setup.sessionRepository.createEvent).toHaveBeenCalledTimes(2);
    expect(setup.packageSettlementService.reconcilePurchase).toHaveBeenCalled();
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.ACTIVE);
  });

  it('rejects success after a cancelled purchase', async () => {
    const setup = buildUseCase({
      purchaseStatus: PatientPackagePurchaseStatus.CANCELLED,
    });

    await expect(
      setup.useCase.execute({
        paymentId: 'payment-1',
        providerEventRef: 'evt-1',
        payload: {},
      }),
    ).rejects.toThrow();
  });

  it('falls back to metadata packagePurchaseId when payment relation lookup is unavailable', async () => {
    const setup = buildUseCase({
      resolveByPayment: false,
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
    });

    expect(setup.packagePurchaseRepository.findByPaymentId).toHaveBeenCalled();
    expect(setup.packagePurchaseRepository.findById).toHaveBeenCalledWith(
      'purchase-1',
    );
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.ACTIVE);
  });
});
