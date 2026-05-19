import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { MarkPaymentSucceededUseCase } from './mark-payment-succeeded.use-case';

describe('MarkPaymentSucceededUseCase', () => {
  function buildUseCase(input?: {
    sessionStatus?: string | null;
    paymentPurpose?: string;
  }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      session: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            input?.sessionStatus
              ? { id: 'session_1', status: input.sessionStatus }
              : null,
          ),
      },
    };
    const paymentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment_1',
        paymentPurpose: input?.paymentPurpose ?? 'SESSION_BOOKING',
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        sessionId: 'session_1',
        patientId: 'patient_1',
        practitionerId: 'pr_1',
        couponId: null,
        currencyCode: 'USD',
        amountFromWallet: { gt: () => false, toString: () => '0.00' },
        amountSubtotal: { toString: () => '100.00' },
        amountDiscount: { toString: () => '0.00' },
        couponPlatformShareSnapshot: null,
        couponPractitionerShareSnapshot: null,
      }),
      createEvent: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'payment_1',
        paymentPurpose: input?.paymentPurpose ?? 'SESSION_BOOKING',
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        sessionId: 'session_1',
        patientId: 'patient_1',
        practitionerId: 'pr_1',
        couponId: null,
        currencyCode: 'USD',
        amountFromWallet: { gt: () => false, toString: () => '0.00' },
        amountTotal: { toString: () => '100.00' },
        amountSubtotal: { toString: () => '100.00' },
        amountDiscount: { toString: () => '0.00' },
        couponPlatformShareSnapshot: null,
        couponPractitionerShareSnapshot: null,
      }),
    };
    const validatePaymentStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };
    const orchestrateSessionPaymentStatusService = {
      markSessionConfirmedFromPayment: jest.fn().mockResolvedValue({}),
    };
    const orchestrateTrainingEnrollmentPaymentStatusService = {
      markEnrollmentActiveFromPayment: jest.fn().mockResolvedValue({}),
    };
    const paymentMapper = {
      toViewModel: jest.fn().mockReturnValue({ id: 'payment_1' }),
    };
    const operationalNotificationService = {
      notifyPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
    };
    const postPaymentLedgerEntriesUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const customerWalletAccountingService = {
      captureReservationForPayment: jest.fn().mockResolvedValue(null),
    };
    const redeemCouponUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const reconcilePackagePurchasePaymentUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const logger = {
      info: jest.fn(),
    };

    const useCase = new MarkPaymentSucceededUseCase(
      prisma as never,
      paymentRepository as never,
      validatePaymentStatusTransitionService as never,
      orchestrateSessionPaymentStatusService as never,
      orchestrateTrainingEnrollmentPaymentStatusService as never,
      paymentMapper as never,
      postPaymentLedgerEntriesUseCase as never,
      customerWalletAccountingService as never,
      redeemCouponUseCase as never,
      operationalNotificationService as never,
      reconcilePackagePurchasePaymentUseCase as never,
      logger as never,
    );

    return {
      useCase,
      prisma,
      paymentRepository,
      orchestrateSessionPaymentStatusService,
      postPaymentLedgerEntriesUseCase,
      operationalNotificationService,
      reconcilePackagePurchasePaymentUseCase,
    };
  }

  it('confirms session when payment succeeds and session is pending payment', async () => {
    const setup = buildUseCase({ sessionStatus: 'PENDING_PAYMENT' });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(setup.postPaymentLedgerEntriesUseCase.execute).toHaveBeenCalledTimes(
      1,
    );
    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.operationalNotificationService.notifyPaymentSucceeded,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not confirm session when session is already cancelled-like terminal state', async () => {
    const setup = buildUseCase({ sessionStatus: 'CANCELLED' });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).not.toHaveBeenCalled();
  });

  it('skips package purchase orchestration', async () => {
    const setup = buildUseCase({
      sessionStatus: null,
      paymentPurpose: 'SESSION_PACKAGE_PURCHASE',
    });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.postPaymentLedgerEntriesUseCase.execute,
    ).not.toHaveBeenCalled();
    expect(
      setup.operationalNotificationService.notifyPaymentSucceeded,
    ).not.toHaveBeenCalled();
    expect(
      setup.reconcilePackagePurchasePaymentUseCase.execute,
    ).toHaveBeenCalledTimes(1);
    expect(setup.prisma.session.findUnique).not.toHaveBeenCalled();
    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).not.toHaveBeenCalled();
    expect(setup.paymentRepository.findById).toHaveBeenCalledTimes(1);
    expect(setup.paymentRepository.updateStatus).toHaveBeenCalledTimes(1);
  });
});
