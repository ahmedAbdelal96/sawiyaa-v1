import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { MarkPaymentFailedUseCase } from './mark-payment-failed.use-case';

describe('MarkPaymentFailedUseCase', () => {
  function buildUseCase(input?: { paymentPurpose?: string }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const paymentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment_1',
        paymentPurpose: input?.paymentPurpose ?? 'SESSION_BOOKING',
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        patientId: 'patient_1',
        currencyCode: 'USD',
        amountFromWallet: { gt: () => false, toString: () => '0.00' },
      }),
      createEvent: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'payment_1',
        paymentPurpose: input?.paymentPurpose ?? 'SESSION_BOOKING',
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.FAILED,
        patientId: 'patient_1',
        currencyCode: 'USD',
        amountFromWallet: { gt: () => false, toString: () => '0.00' },
      }),
    };
    const validatePaymentStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };
    const orchestrateSessionPaymentStatusService = {
      createPaymentEventTypeForFailure: jest
        .fn()
        .mockReturnValue('PAYMENT_FAILED'),
    };
    const orchestrateTrainingEnrollmentPaymentStatusService = {
      markEnrollmentPaymentFailed: jest.fn().mockResolvedValue({}),
    };
    const paymentMapper = {
      toViewModel: jest.fn().mockReturnValue({ id: 'payment_1' }),
    };
    const operationalNotificationService = {
      notifyPaymentFailed: jest.fn().mockResolvedValue(undefined),
    };
    const reconcilePackagePurchasePaymentUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const customerWalletAccountingService = {
      releaseReservationForPayment: jest.fn().mockResolvedValue(null),
    };
    const logger = {
      warn: jest.fn(),
    };

    const useCase = new MarkPaymentFailedUseCase(
      prisma as never,
      paymentRepository as never,
      validatePaymentStatusTransitionService as never,
      orchestrateSessionPaymentStatusService as never,
      orchestrateTrainingEnrollmentPaymentStatusService as never,
      paymentMapper as never,
      customerWalletAccountingService as never,
      operationalNotificationService as never,
      reconcilePackagePurchasePaymentUseCase as never,
      logger as never,
    );

    return {
      useCase,
      operationalNotificationService,
      reconcilePackagePurchasePaymentUseCase,
      customerWalletAccountingService,
      orchestrateTrainingEnrollmentPaymentStatusService,
    };
  }

  it('marks payment as failed and triggers operational notification', async () => {
    const setup = buildUseCase();

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.operationalNotificationService.notifyPaymentFailed,
    ).toHaveBeenCalledTimes(1);
  });

  it('skips package purchase orchestration', async () => {
    const setup = buildUseCase({
      paymentPurpose: 'SESSION_PACKAGE_PURCHASE',
    });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.operationalNotificationService.notifyPaymentFailed,
    ).not.toHaveBeenCalled();
    expect(
      setup.reconcilePackagePurchasePaymentUseCase.execute,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.customerWalletAccountingService.releaseReservationForPayment,
    ).not.toHaveBeenCalled();
    expect(
      setup.orchestrateTrainingEnrollmentPaymentStatusService
        .markEnrollmentPaymentFailed,
    ).not.toHaveBeenCalled();
  });
});
