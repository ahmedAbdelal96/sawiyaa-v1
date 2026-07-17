import { PaymentPurpose, PaymentProvider, PaymentStatus } from '@prisma/client';
import { ExpirePaymentUseCase } from './expire-payment.use-case';

describe('ExpirePaymentUseCase', () => {
  function buildUseCase(input?: { paymentPurpose?: PaymentPurpose }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const paymentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment_1',
        paymentPurpose: input?.paymentPurpose ?? PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        sessionId: 'session_1',
        patientId: 'patient_1',
        currencyCode: 'USD',
        amountFromWallet: { gt: () => false, toString: () => '0.00' },
        metadataJson: {
          source: 'session-booking',
        },
      }),
      createEvent: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'payment_1',
        paymentPurpose: input?.paymentPurpose ?? PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.EXPIRED,
        sessionId: 'session_1',
        patientId: 'patient_1',
        currencyCode: 'USD',
        amountFromWallet: { gt: () => false, toString: () => '0.00' },
        amountTotal: { toString: () => '100.00' },
        amountSubtotal: { toString: () => '100.00' },
        amountDiscount: { toString: () => '0.00' },
        metadataJson: {
          source: 'session-booking',
        },
      }),
    };
    const validatePaymentStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };
    const orchestrateSessionPaymentStatusService = {
      expireSessionFromPayment: jest.fn().mockResolvedValue({}),
    };
    const orchestrateAcademyProgramEnrollmentPaymentStatusService = {
      markEnrollmentPaymentExpired: jest.fn().mockResolvedValue({}),
      markEnrollmentPaymentFailed: jest.fn().mockResolvedValue({}),
      markEnrollmentConfirmedFromPayment: jest.fn().mockResolvedValue({}),
    };
    const paymentMapper = {
      toViewModel: jest.fn().mockReturnValue({ id: 'payment_1' }),
    };
    const customerWalletAccountingService = {
      releaseReservationForPayment: jest.fn().mockResolvedValue(null),
    };
    const reconcilePackagePurchasePaymentUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const logger = {
      warn: jest.fn(),
    };

    const useCase = new ExpirePaymentUseCase(
      prisma as never,
      paymentRepository as never,
      validatePaymentStatusTransitionService as never,
      orchestrateSessionPaymentStatusService as never,
      orchestrateAcademyProgramEnrollmentPaymentStatusService as never,
      paymentMapper as never,
      customerWalletAccountingService as never,
      reconcilePackagePurchasePaymentUseCase as never,
      logger as never,
    );

    return {
      useCase,
      orchestrateSessionPaymentStatusService,
      orchestrateAcademyProgramEnrollmentPaymentStatusService,
      reconcilePackagePurchasePaymentUseCase,
      customerWalletAccountingService,
    };
  }

  it('keeps normal session expiry behavior unchanged', async () => {
    const setup = buildUseCase();

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.orchestrateSessionPaymentStatusService.expireSessionFromPayment,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.reconcilePackagePurchasePaymentUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('routes package payments through package failure orchestration with expired outcome', async () => {
    const setup = buildUseCase({
      paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
    });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.reconcilePackagePurchasePaymentUseCase.execute,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment_1',
      }),
    );
    expect(
      setup.orchestrateSessionPaymentStatusService.expireSessionFromPayment,
    ).not.toHaveBeenCalled();
    expect(
      setup.customerWalletAccountingService.releaseReservationForPayment,
    ).not.toHaveBeenCalled();
    expect(
      setup.orchestrateAcademyProgramEnrollmentPaymentStatusService
        .markEnrollmentPaymentExpired,
    ).not.toHaveBeenCalled();
  });
});
