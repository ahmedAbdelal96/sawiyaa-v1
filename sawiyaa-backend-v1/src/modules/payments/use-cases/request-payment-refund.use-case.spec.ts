import { ConflictException } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundDestination,
} from '@prisma/client';
import { RequestPaymentRefundUseCase } from './request-payment-refund.use-case';

describe('RequestPaymentRefundUseCase', () => {
  function buildUseCase(overrides?: {
    paymentStatus?: PaymentStatus;
    activeRefund?: { id: string } | null;
    succeededRefundTotal?: string;
    providerOutcome?: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
  }) {
    const latestRefund = {
      id: 'refund_1',
      paymentId: 'payment_1',
      sessionId: 'session_1',
      refundType: 'PARTIAL',
      status: 'SUCCEEDED',
      destination: RefundDestination.CUSTOMER_WALLET,
      refundReason: 'reason',
      amount: new Prisma.Decimal('100.00'),
      currencyCode: 'USD',
      providerRefundRef: 're_1',
      requestedAt: new Date(),
      processedAt: new Date(),
      failedAt: null,
      createdAt: new Date(),
      customerWalletCreditedAt: new Date(),
    };

    const paymentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment_1',
        provider: PaymentProvider.STRIPE,
        providerPaymentRef: 'pi_123',
        providerOrderRef: null,
        status: overrides?.paymentStatus ?? PaymentStatus.CAPTURED,
        amountTotal: new Prisma.Decimal('500.00'),
        amountFromWallet: new Prisma.Decimal('0.00'),
        currencyCode: 'USD',
        sessionId: 'session_1',
        patientId: 'patient_1',
      }),
      findActiveRefundByPaymentId: jest
        .fn()
        .mockResolvedValue(overrides?.activeRefund ?? null),
      sumSucceededRefundAmountByPaymentId: jest.fn().mockResolvedValue({
        _sum: {
          amount: new Prisma.Decimal(overrides?.succeededRefundTotal ?? '0.00'),
        },
      }),
      createRefund: jest.fn().mockImplementation((input) =>
        Promise.resolve({
          id: 'refund_1',
          paymentId: 'payment_1',
          sessionId: 'session_1',
          refundType: 'PARTIAL',
          status: 'REQUESTED',
          destination: input.destination,
          refundReason: 'reason',
          amount: new Prisma.Decimal('100.00'),
          currencyCode: 'USD',
          providerRefundRef: null,
          requestedAt: new Date(),
          processedAt: null,
          failedAt: null,
          createdAt: new Date(),
        }),
      ),
      createEvent: jest.fn().mockResolvedValue({}),
      createRefundEvent: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({}),
      updateRefund: jest.fn().mockResolvedValue({
        id: 'refund_1',
        paymentId: 'payment_1',
        sessionId: 'session_1',
        refundType: 'PARTIAL',
        status: 'SUCCEEDED',
        destination: RefundDestination.CUSTOMER_WALLET,
        refundReason: 'reason',
        amount: new Prisma.Decimal('100.00'),
        currencyCode: 'USD',
        providerRefundRef: 're_1',
        requestedAt: new Date(),
        processedAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      }),
      findRefundById: jest.fn().mockResolvedValue(latestRefund),
      findLatestProviderWebhookEventByPaymentId: jest
        .fn()
        .mockResolvedValue(null),
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
    const sessionEarningReviewService = {
      invalidatePendingReviewsForPayment: jest.fn().mockResolvedValue({}),
    };
    const orchestrateSessionPaymentStatusService = {
      markSessionRefundPending: jest.fn().mockResolvedValue({}),
      markSessionRefunded: jest.fn().mockResolvedValue({}),
    };
    const customerWalletAccountingService = {
      creditRefundToWallet: jest.fn().mockResolvedValue({}),
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
      $transaction: jest.fn().mockImplementation(async (fn) =>
        fn({ $executeRaw: jest.fn().mockResolvedValue(undefined) }),
      ),
    };

    const useCase = new RequestPaymentRefundUseCase(
      prisma as never,
      paymentRepository as never,
      paymentProviderRegistryService as never,
      validatePaymentStatusTransitionService as never,
      validateRefundEligibilityService as never,
      postRefundLedgerEntriesUseCase as never,
      sessionEarningReviewService as never,
      customerWalletAccountingService as never,
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
      sessionEarningReviewService,
      orchestrateSessionPaymentStatusService,
      customerWalletAccountingService,
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
      destination: RefundDestination.ORIGINAL_METHOD,
    });

    expect(setup.postRefundLedgerEntriesUseCase.execute).toHaveBeenCalledTimes(
      1,
    );
    expect(
      setup.sessionEarningReviewService.invalidatePendingReviewsForPayment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment_1',
      }),
    );
    expect(
      setup.operationalNotificationService.notifyRefundRequested,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.operationalNotificationService.notifyRefundSucceeded,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.orchestrateSessionPaymentStatusService.markSessionRefundPending,
    ).toHaveBeenCalled();
    expect(setup.paymentRepository.createRefundEvent).toHaveBeenCalledTimes(1);
    expect(setup.paymentRepository.createRefundEvent.mock.calls[0][0]).toMatchObject({
      refundId: 'refund_1',
      paymentId: 'payment_1',
      eventType: 'REQUESTED',
      previousStatus: null,
      newStatus: 'REQUESTED',
      actorType: 'USER',
      actorUserId: 'admin_1',
      source: 'HTTP_REQUEST',
      reason: 'reason',
    });
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
      destination: RefundDestination.ORIGINAL_METHOD,
    });

    expect(setup.postRefundLedgerEntriesUseCase.execute).not.toHaveBeenCalled();
    expect(
      setup.operationalNotificationService.notifyRefundFailed,
    ).toHaveBeenCalledTimes(1);
    expect(setup.paymentRepository.createRefundEvent).toHaveBeenCalledTimes(2);
  });

  it('finalizes customer wallet refunds inside the refund transaction', async () => {
    const setup = buildUseCase({
      succeededRefundTotal: '0.00',
      providerOutcome: 'SUCCEEDED',
    });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      actorUserId: 'admin_1',
      amount: '100.00',
      reason: 'reason',
      destination: RefundDestination.CUSTOMER_WALLET,
    });

    expect(setup.customerWalletAccountingService.creditRefundToWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        refundId: 'refund_1',
        tx: expect.any(Object),
      }),
    );
    expect(setup.postRefundLedgerEntriesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        refundId: 'refund_1',
        tx: expect.any(Object),
      }),
    );
    expect(
      setup.sessionEarningReviewService.invalidatePendingReviewsForPayment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment_1',
        tx: expect.any(Object),
      }),
    );
    expect(
      setup.orchestrateSessionPaymentStatusService.markSessionRefundPending,
    ).toHaveBeenCalledWith('session_1', expect.any(Object));
    expect(
      setup.operationalNotificationService.notifyRefundSucceeded,
    ).toHaveBeenCalledTimes(1);
    expect(setup.paymentRepository.createRefundEvent).toHaveBeenCalledTimes(1);
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
        destination: RefundDestination.ORIGINAL_METHOD,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
