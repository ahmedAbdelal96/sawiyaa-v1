import { PaymentProvider, PaymentStatus, SessionStatus } from '@prisma/client';
import { ReconcileSessionPaymentReturnUseCase } from './reconcile-session-payment-return.use-case';

describe('ReconcileSessionPaymentReturnUseCase', () => {
  function buildUseCase(input?: {
    sessionStatus?: SessionStatus;
    paymentStatus?: PaymentStatus;
    providerReference?: string | null;
    resolvedByReference?: boolean;
    resolvedByActive?: boolean;
  }) {
    const session = {
      id: 'session_1',
      status: input?.sessionStatus ?? SessionStatus.PENDING_PAYMENT,
    };

    const payment =
      input?.paymentStatus === undefined
        ? null
        : {
            id: 'payment_1',
            sessionId: 'session_1',
            provider: PaymentProvider.PAYMOB,
            providerPaymentRef: 'order_123',
            status: input.paymentStatus,
          };

    const paymentSessionRepository = {
      findPatientOwnedSession: jest.fn().mockResolvedValue(session),
    };
    const paymentRepository = {
      findByProviderReference: jest
        .fn()
        .mockResolvedValue(
          input?.resolvedByReference === false ? null : payment,
        ),
      findLatestActiveBySessionId: jest
        .fn()
        .mockResolvedValue(input?.resolvedByActive === false ? null : payment),
      findSuccessfulBySessionId: jest.fn().mockResolvedValue(payment),
      findById: jest.fn().mockResolvedValue(payment),
    };
    const markPaymentSucceededUseCase = {
      execute: jest.fn().mockResolvedValue({
        item: { id: 'payment_1', status: PaymentStatus.CAPTURED },
      }),
    };
    const orchestrateSessionPaymentStatusService = {
      markSessionConfirmedFromPayment: jest.fn().mockResolvedValue(session),
    };
    const paymentMapper = {
      toViewModel: jest.fn().mockReturnValue({ id: 'payment_1' }),
    };
    const logger = {
      warn: jest.fn(),
    };

    const useCase = new ReconcileSessionPaymentReturnUseCase(
      paymentSessionRepository as never,
      paymentRepository as never,
      markPaymentSucceededUseCase as never,
      orchestrateSessionPaymentStatusService as never,
      paymentMapper as never,
      logger as never,
    );

    return {
      useCase,
      paymentRepository,
      markPaymentSucceededUseCase,
      orchestrateSessionPaymentStatusService,
      paymentMapper,
      logger,
    };
  }

  it('captures a pending payment and confirms the session from hosted return data', async () => {
    const setup = buildUseCase({
      paymentStatus: PaymentStatus.PENDING,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      providerReference: 'order_123',
      redirectStatus: 'succeeded',
      success: true,
      pending: false,
    });

    expect(setup.markPaymentSucceededUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      item: { id: 'payment_1', status: PaymentStatus.CAPTURED },
      reconciled: true,
    });
  });

  it('only confirms the session when the payment is already captured', async () => {
    const setup = buildUseCase({
      paymentStatus: PaymentStatus.CAPTURED,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      providerReference: 'order_123',
      redirectStatus: 'succeeded',
      success: true,
      pending: false,
    });

    expect(setup.markPaymentSucceededUseCase.execute).not.toHaveBeenCalled();
    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      item: { id: 'payment_1' },
      reconciled: true,
    });
  });

  it('captures a successful return even if the session is already expired', async () => {
    const setup = buildUseCase({
      sessionStatus: SessionStatus.EXPIRED,
      paymentStatus: PaymentStatus.PENDING,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      providerReference: 'order_123',
      redirectStatus: 'succeeded',
      success: true,
      pending: false,
    });

    expect(setup.markPaymentSucceededUseCase.execute).toHaveBeenCalledTimes(1);
    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      item: { id: 'payment_1', status: PaymentStatus.CAPTURED },
      reconciled: true,
    });
  });

  it('does nothing when the provider return is not successful', async () => {
    const setup = buildUseCase({
      paymentStatus: PaymentStatus.PENDING,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      redirectStatus: 'failed',
      success: false,
      pending: false,
    });

    expect(setup.markPaymentSucceededUseCase.execute).not.toHaveBeenCalled();
    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      item: null,
      reconciled: false,
    });
  });
});
