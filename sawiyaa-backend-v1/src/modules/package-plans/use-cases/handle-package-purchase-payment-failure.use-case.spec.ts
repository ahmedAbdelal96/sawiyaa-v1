import { SessionStatus, PatientPackagePurchaseStatus } from '@prisma/client';
import { HandlePackagePurchasePaymentFailureUseCase } from './handle-package-purchase-payment-failure.use-case';

describe('HandlePackagePurchasePaymentFailureUseCase', () => {
  function buildUseCase(input?: {
    purchaseStatus?: PatientPackagePurchaseStatus;
    paymentExpiresAt?: Date | null;
    sessionStatuses?: SessionStatus[];
    resolveByPayment?: boolean;
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
              status:
                input?.purchaseStatus ??
                PatientPackagePurchaseStatus.PENDING_PAYMENT,
              paymentExpiresAt:
                input?.paymentExpiresAt ?? new Date('2999-01-01T00:00:00.000Z'),
              packagePlanId: 'plan-1',
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
              })),
            },
      ),
      findById: jest.fn().mockResolvedValue({
        id: 'purchase-1',
        status:
          input?.purchaseStatus ?? PatientPackagePurchaseStatus.PENDING_PAYMENT,
        paymentExpiresAt:
          input?.paymentExpiresAt ?? new Date('2999-01-01T00:00:00.000Z'),
        packagePlanId: 'plan-1',
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
        })),
      }),
      updateStatus: jest.fn().mockImplementation(async (_purchaseId, data) => ({
        id: 'purchase-1',
        status:
          typeof data.status === 'string'
            ? data.status
            : PatientPackagePurchaseStatus.CANCELLED,
      })),
    };
    const sessionRepository = {
      updateStatus: jest.fn().mockResolvedValue({}),
      createEvent: jest.fn().mockResolvedValue({}),
    };
    const sessionLifecycleService = {
      transition: jest.fn().mockResolvedValue({}),
    };

    const useCase = new HandlePackagePurchasePaymentFailureUseCase(
      prisma as never,
      paymentRepository as never,
      packagePurchaseRepository as never,
      sessionRepository as never,
      sessionLifecycleService as never,
    );

    return {
      useCase,
      packagePurchaseRepository,
      sessionRepository,
      sessionLifecycleService,
    };
  }

  it('cancels a pending purchase before expiry and expires linked sessions', async () => {
    const setup = buildUseCase();

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      terminalOutcome: 'FAILED',
    });

    expect(setup.packagePurchaseRepository.updateStatus).toHaveBeenCalledWith(
      'purchase-1',
      expect.objectContaining({
        status: PatientPackagePurchaseStatus.CANCELLED,
        cancelledAt: expect.any(Date),
      }),
      expect.anything(),
    );
    expect(setup.sessionLifecycleService.transition).toHaveBeenCalledTimes(2);
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.CANCELLED);
  });

  it('marks a pending purchase as expired when the hold already elapsed', async () => {
    const setup = buildUseCase({
      paymentExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      terminalOutcome: 'FAILED',
    });

    expect(setup.packagePurchaseRepository.updateStatus).toHaveBeenCalledWith(
      'purchase-1',
      expect.objectContaining({
        status: PatientPackagePurchaseStatus.EXPIRED,
        expiredAt: expect.any(Date),
      }),
      expect.anything(),
    );
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.EXPIRED);
  });

  it('skips already expired linked sessions during failure repair', async () => {
    const setup = buildUseCase({
      sessionStatuses: [SessionStatus.PENDING_PAYMENT, SessionStatus.EXPIRED],
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      terminalOutcome: 'FAILED',
    });

    expect(setup.packagePurchaseRepository.updateStatus).toHaveBeenCalledTimes(
      1,
    );
    expect(setup.sessionLifecycleService.transition).toHaveBeenCalledTimes(1);
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.CANCELLED);
  });

  it('is idempotent for already active purchases', async () => {
    const setup = buildUseCase({
      purchaseStatus: PatientPackagePurchaseStatus.ACTIVE,
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      terminalOutcome: 'FAILED',
    });

    expect(setup.packagePurchaseRepository.updateStatus).not.toHaveBeenCalled();
    expect(setup.sessionRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.ACTIVE);
  });

  it('is idempotent for already cancelled purchases', async () => {
    const setup = buildUseCase({
      purchaseStatus: PatientPackagePurchaseStatus.CANCELLED,
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      terminalOutcome: 'FAILED',
    });

    expect(setup.packagePurchaseRepository.updateStatus).not.toHaveBeenCalled();
    expect(setup.sessionRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.CANCELLED);
  });

  it('falls back to metadata packagePurchaseId when payment relation lookup is unavailable', async () => {
    const setup = buildUseCase({
      resolveByPayment: false,
    });

    const result = await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      terminalOutcome: 'FAILED',
    });

    expect(setup.packagePurchaseRepository.findByPaymentId).toHaveBeenCalled();
    expect(setup.packagePurchaseRepository.findById).toHaveBeenCalledWith(
      'purchase-1',
    );
    expect(result.purchase.status).toBe(PatientPackagePurchaseStatus.CANCELLED);
  });
});
