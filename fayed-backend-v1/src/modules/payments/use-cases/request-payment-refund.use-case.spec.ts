import { ConflictException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { RequestPaymentRefundUseCase } from './request-payment-refund.use-case';

describe('RequestPaymentRefundUseCase', () => {
  function buildUseCase(overrides?: {
    paymentStatus?: PaymentStatus;
    activeRefund?: { id: string } | null;
    succeededRefundTotal?: string;
    providerOutcome?: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
  }) {
    const paymentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment_1',
        provider: PaymentProvider.STRIPE,
        providerPaymentRef: 'pi_123',
        providerOrderRef: null,
        status: overrides?.paymentStatus ?? PaymentStatus.CAPTURED,
        amountTotal: new Prisma.Decimal('500.00'),
        currencyCode: 'USD',
        sessionId: 'session_1',
      }),
      findActiveRefundByPaymentId: jest
        .fn()
        .mockResolvedValue(overrides?.activeRefund ?? null),
      sumSucceededRefundAmountByPaymentId: jest.fn().mockResolvedValue({
        _sum: {
          amount: new Prisma.Decimal(overrides?.succeededRefundTotal ?? '0.00'),
        },
      }),
      createRefund: jest.fn().mockResolvedValue({
        id: 'refund_1',
        paymentId: 'payment_1',
        sessionId: 'session_1',
        refundType: 'PARTIAL',
        status: 'REQUESTED',
        refundReason: 'reason',
        amount: new Prisma.Decimal('100.00'),
        currencyCode: 'USD',
        providerRefundRef: null,
        requestedAt: new Date(),
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
      }),
      createEvent: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({}),
      updateRefund: jest.fn().mockResolvedValue({
        id: 'refund_1',
        paymentId: 'payment_1',
        sessionId: 'session_1',
        refundType: 'PARTIAL',
        status: 'SUCCEEDED',
        refundReason: 'reason',
        amount: new Prisma.Decimal('100.00'),
        currencyCode: 'USD',
        providerRefundRef: 're_1',
        requestedAt: new Date(),
        processedAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      }),
      findRefundById: jest.fn().mockResolvedValue(null),
      findLatestProviderWebhookEventByPaymentId: jest.fn().mockResolvedValue(null),
    };

    const paymentProviderRegistryService = {
      get: jest.fn().mockReturnValue({
        refundPayment: jest.fn().mockResolvedValue({
          providerRefundRef: 're_1',
          outcome: overrides?.providerOutcome ?? 'SUCCEEDED',
          metadata: {},
        }),
      }),
    };

    const validatePaymentStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };
    const validateRefundEligibilityService = {
      assertPaymentRefundable: jest.fn(),
      assertNoActiveRefund: jest.fn((active: { id: string } | null) => {
        if (active) {
          throw new ConflictException();
        }
      }),
      resolveRefundAmount: jest.fn().mockReturnValue({
        amount: new Prisma.Decimal('100.00'),
        remaining: new Prisma.Decimal('500.00'),
        isFullRefund: false,
      }),
      assertRetryableRefundStatus: jest.fn(),
    };
    const postRefundLedgerEntriesUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const orchestrateSessionPaymentStatusService = {
      markSessionRefundPending: jest.fn().mockResolvedValue({}),
      markSessionRefunded: jest.fn().mockResolvedValue({}),
    };
    const operationalNotificationService = {
      notifyRefundRequested: jest.fn().mockResolvedValue(undefined),
      notifyRefundSucceeded: jest.fn().mockResolvedValue(undefined),
      notifyRefundFailed: jest.fn().mockResolvedValue(undefined),
    };
    const paymentMapper = {
      toRefundViewModel: jest.fn().mockReturnValue({ id: 'refund_1' }),
    };
    const logger = {
      info: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };

    const useCase = new RequestPaymentRefundUseCase(
      prisma as never,
      paymentRepository as never,
      paymentProviderRegistryService as never,
      validatePaymentStatusTransitionService as never,
      validateRefundEligibilityService as never,
      postRefundLedgerEntriesUseCase as never,
      orchestrateSessionPaymentStatusService as never,
      operationalNotificationService as never,
      paymentMapper as never,
      logger as never,
    );

    return {
      useCase,
      paymentRepository,
      paymentProviderRegistryService,
      postRefundLedgerEntriesUseCase,
      orchestrateSessionPaymentStatusService,
      operationalNotificationService,
      paymentMapper,
    };
  }

  it('handles partial refund success and posts refund ledger', async () => {
    const setup = buildUseCase({
      succeededRefundTotal: '100.00',
      providerOutcome: 'SUCCEEDED',
    });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      actorUserId: 'admin_1',
      amount: '100.00',
      reason: 'reason',
    });

    expect(setup.postRefundLedgerEntriesUseCase.execute).toHaveBeenCalledTimes(1);
    expect(setup.operationalNotificationService.notifyRefundRequested).toHaveBeenCalledTimes(1);
    expect(setup.operationalNotificationService.notifyRefundSucceeded).toHaveBeenCalledTimes(1);
    expect(
      setup.orchestrateSessionPaymentStatusService.markSessionRefundPending,
    ).toHaveBeenCalled();
  });

  it('handles provider failure and avoids ledger reversal posting', async () => {
    const setup = buildUseCase({
      providerOutcome: 'FAILED',
    });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      actorUserId: 'admin_1',
      amount: '100.00',
      reason: 'reason',
    });

    expect(setup.postRefundLedgerEntriesUseCase.execute).not.toHaveBeenCalled();
    expect(setup.operationalNotificationService.notifyRefundFailed).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate refund attempt while another one is active', async () => {
    const setup = buildUseCase({
      activeRefund: { id: 'refund_active' },
    });

    await expect(
      setup.useCase.execute({
        paymentId: 'payment_1',
        actorUserId: 'admin_1',
        amount: '100.00',
        reason: 'reason',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
