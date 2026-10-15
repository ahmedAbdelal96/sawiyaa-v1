import {
  AcademyProgramEnrollmentStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase } from './get-public-academy-program-enrollment-payment-redirect.use-case';

describe('GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase deferred payment creation', () => {
  const futureDate = new Date(Date.now() + 60 * 60 * 1000);
  const baseEnrollment = {
    id: 'enrollment-1',
    publicAccessToken: 'token-1',
    status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.CREATED,
    selectedAmountSnapshot: '500.00',
    selectedCurrencyCode: 'EGP',
    seatReservationExpiresAt: futureDate,
    academyProgram: { id: 'prog-1', slug: 'prog-slug' },
    academyLearner: { id: 'learner-1', email: 'learner@example.com', countryCode: 'EG' },
    payment: null,
    paymentAttempts: [],
  };

  function createUseCase(overrides: Partial<typeof baseEnrollment> = {}) {
    const currentEnrollment = { ...baseEnrollment, ...overrides };

    const enrollmentRepository = {
      findEnrollmentByIdForPublic: jest.fn().mockResolvedValue(currentEnrollment),
      createPaymentAttempt: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
      updatePaymentAttempt: jest.fn().mockResolvedValue({}),
      updateEnrollment: jest.fn().mockResolvedValue({}),
    };

    const paymentRepository = {
      createPayment: jest.fn().mockResolvedValue({
        id: 'payment-1',
        provider: PaymentProvider.PAYMOB,
        status: PaymentStatus.CREATED,
        amountTotal: '500.00',
        currencyCode: 'EGP',
        metadataJson: {},
      }),
      createEvent: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.CREATED,
      }),
    };

    const tx = {
      $executeRaw: jest.fn(),
      academyProgramEnrollment: {
        findUnique: jest.fn().mockResolvedValue({
          ...currentEnrollment,
          payment: currentEnrollment.payment,
          paymentAttempts: currentEnrollment.paymentAttempts,
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
    };

    const initiateSessionPayment = jest.fn().mockResolvedValue({
      status: PaymentStatus.CREATED,
      checkoutUrl: 'https://paymob.example/checkout/123',
      providerPaymentRef: 'paymob-ref-1',
    });

    const paymentProviderRegistryService = {
      get: jest.fn().mockReturnValue({ initiateSessionPayment }),
    };

    const validatePaymentStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };

    const paymentRuntimeConfigService = {
      resolveTrustedReturnUrl: jest.fn((url: string | null) => url),
      getAppBaseUrl: jest.fn().mockReturnValue('https://sawiyaa.com'),
    };

    const useCase = new GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase(
      prisma as never,
      enrollmentRepository as never,
      paymentRepository as never,
      paymentProviderRegistryService as never,
      paymentRuntimeConfigService as never,
      validatePaymentStatusTransitionService as never,
    );

    return {
      useCase,
      enrollmentRepository,
      paymentRepository,
      initiateSessionPayment,
      prisma,
      tx,
    };
  }

  it('creates canonical PAYMOB payment when enrollment.paymentId is null and initiates checkout', async () => {
    const { useCase, paymentRepository, enrollmentRepository, initiateSessionPayment, tx } = createUseCase();

    const result = await useCase.execute({
      enrollmentId: 'enrollment-1',
      token: 'token-1',
      locale: 'ar',
      returnUrl: 'https://sawiyaa.com/ar/return',
    });

    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(paymentRepository.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: PaymentProvider.PAYMOB,
        currencyCode: 'EGP',
        status: PaymentStatus.CREATED,
      }),
      expect.anything(),
    );
    expect(enrollmentRepository.updateEnrollment).toHaveBeenCalledWith(
      'enrollment-1',
      expect.objectContaining({
        paymentId: 'payment-1',
        status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
      }),
      expect.anything(),
    );
    expect(initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        currency: 'EGP',
      }),
    );
    expect(result.redirectUrl).toBe('https://paymob.example/checkout/123');
  });

  it('never mutates provider to gateway when enrollment already has PaymentProvider.MANUAL', async () => {
    const { useCase, paymentRepository, initiateSessionPayment } = createUseCase({
      payment: {
        id: 'manual-payment-1',
        provider: PaymentProvider.MANUAL,
        status: PaymentStatus.CREATED,
        amountSubtotal: '500.00' as never,
        amountDiscount: '0.00' as never,
        amountTotal: '500.00' as never,
        currencyCode: 'EGP',
        metadataJson: {},
      } as never,
    });

    const result = await useCase.execute({
      enrollmentId: 'enrollment-1',
      token: 'token-1',
      locale: 'ar',
      returnUrl: 'https://sawiyaa.com/ar/return',
    });

    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(initiateSessionPayment).not.toHaveBeenCalled();
    expect(result.redirectUrl).toContain('payment_unavailable');
  });

  it('reuses existing active gateway checkoutUrl without creating duplicate payment', async () => {
    const { useCase, paymentRepository, initiateSessionPayment } = createUseCase({
      payment: {
        id: 'gateway-payment-1',
        provider: PaymentProvider.PAYMOB,
        status: PaymentStatus.CREATED,
        amountSubtotal: '500.00' as never,
        amountDiscount: '0.00' as never,
        amountTotal: '500.00' as never,
        currencyCode: 'EGP',
        metadataJson: { checkoutUrl: 'https://paymob.example/existing' },
      } as never,
    });

    const result = await useCase.execute({
      enrollmentId: 'enrollment-1',
      token: 'token-1',
      locale: 'ar',
      returnUrl: 'https://sawiyaa.com/ar/return',
    });

    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(initiateSessionPayment).not.toHaveBeenCalled();
    expect(result.redirectUrl).toBe('https://paymob.example/existing');
  });

  it('returns payment_expired when seat reservation has expired', async () => {
    const { useCase, paymentRepository, initiateSessionPayment } = createUseCase({
      seatReservationExpiresAt: new Date(Date.now() - 60 * 1000),
    });

    const result = await useCase.execute({
      enrollmentId: 'enrollment-1',
      token: 'token-1',
      locale: 'ar',
      returnUrl: 'https://sawiyaa.com/ar/return',
    });

    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(initiateSessionPayment).not.toHaveBeenCalled();
    expect(result.redirectUrl).toContain('payment_expired');
  });
});
