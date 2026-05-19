import { PaymentPurpose, PaymentStatus } from '@prisma/client';
import { ReconcilePackagePurchasePaymentUseCase } from './reconcile-package-purchase-payment.use-case';

describe('ReconcilePackagePurchasePaymentUseCase', () => {
  function buildUseCase(input?: { paymentStatus?: PaymentStatus }) {
    const paymentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment-1',
        paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
        status: input?.paymentStatus ?? PaymentStatus.CAPTURED,
        metadataJson: {
          packagePurchaseId: 'purchase-1',
        },
      }),
    };
    const handlePackagePurchasePaymentSuccessUseCase = {
      execute: jest.fn().mockResolvedValue({ purchase: { id: 'purchase-1' } }),
    };
    const handlePackagePurchasePaymentFailureUseCase = {
      execute: jest.fn().mockResolvedValue({ purchase: { id: 'purchase-1' } }),
    };

    const useCase = new ReconcilePackagePurchasePaymentUseCase(
      paymentRepository as never,
      handlePackagePurchasePaymentSuccessUseCase as never,
      handlePackagePurchasePaymentFailureUseCase as never,
    );

    return {
      useCase,
      paymentRepository,
      handlePackagePurchasePaymentSuccessUseCase,
      handlePackagePurchasePaymentFailureUseCase,
    };
  }

  it('routes captured package payments to success repair', async () => {
    const setup = buildUseCase({
      paymentStatus: PaymentStatus.CAPTURED,
    });

    await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      payment: undefined,
    });

    expect(
      setup.handlePackagePurchasePaymentSuccessUseCase.execute,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.handlePackagePurchasePaymentFailureUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('routes failed package payments to failure repair', async () => {
    const setup = buildUseCase({
      paymentStatus: PaymentStatus.FAILED,
    });

    await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      payment: undefined,
    });

    expect(
      setup.handlePackagePurchasePaymentFailureUseCase.execute,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.handlePackagePurchasePaymentSuccessUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('routes expired package payments to failure repair with expired outcome', async () => {
    const setup = buildUseCase({
      paymentStatus: PaymentStatus.EXPIRED,
    });

    await setup.useCase.execute({
      paymentId: 'payment-1',
      providerEventRef: 'evt-1',
      payload: {},
      payment: undefined,
    });

    expect(
      setup.handlePackagePurchasePaymentFailureUseCase.execute,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalOutcome: 'EXPIRED',
      }),
    );
  });
});
