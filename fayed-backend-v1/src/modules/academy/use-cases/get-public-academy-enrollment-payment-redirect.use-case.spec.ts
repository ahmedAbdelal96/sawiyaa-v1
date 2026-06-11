/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-member-access */
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { AcademyRepository } from '../repositories/academy.repository';
import { GetPublicAcademyEnrollmentPaymentRedirectUseCase } from './get-public-academy-enrollment-payment-redirect.use-case';

describe('GetPublicAcademyEnrollmentPaymentRedirectUseCase', () => {
  const prisma = {
    $transaction: jest.fn((callback: (tx: never) => unknown) =>
      callback({} as never),
    ),
  } as unknown as PrismaService;

  const academyRepository = {
    findEnrollmentByIdForPublic: jest.fn(),
    createPaymentAttempt: jest.fn(),
    updatePaymentAttempt: jest.fn(),
    updateEnrollment: jest.fn(),
  } as unknown as AcademyRepository;

  const paymentRepository = {
    createPayment: jest.fn(),
    updateStatus: jest.fn(),
    createEvent: jest.fn(),
  } as unknown as PaymentRepository;

  const paymentProviderRegistryService = {
    get: jest.fn(),
  } as unknown as PaymentProviderRegistryService;

  const paymentRuntimeConfigService = {
    getAppBaseUrl: jest.fn(() => 'https://app.fayed.example'),
    getTrustedReturnUrlOrigins: jest.fn(() => [
      'https://app.fayed.example',
      'http://localhost:3000',
      'http://localhost:8081',
    ]),
    resolveTrustedReturnUrl: jest.fn((value: string | null) => {
      if (!value) {
        return null;
      }

      if (
        value.startsWith('fayed://') ||
        value.startsWith('http://localhost:3000') ||
        value.startsWith('http://localhost:8081') ||
        value.startsWith('https://app.fayed.example')
      ) {
        return value;
      }

      return null;
    }),
  } as unknown as PaymentRuntimeConfigService;

  const validatePaymentStatusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidatePaymentStatusTransitionService;

  const useCase = new GetPublicAcademyEnrollmentPaymentRedirectUseCase(
    prisma,
    academyRepository,
    paymentRepository,
    paymentProviderRegistryService,
    paymentRuntimeConfigService,
    validatePaymentStatusTransitionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function amount(value: string) {
    return {
      toString: () => value,
    };
  }

  function buildEnrollment(overrides?: Partial<Record<string, unknown>>) {
    return {
      id: 'enrollment_1',
      enrollmentStatus: 'PENDING_PAYMENT',
      academyCourse: {
        id: 'course_1',
        slug: 'anxiety-foundations-101',
        title: 'Anxiety Foundations 101',
      },
      academyLearner: {
        id: 'learner_1',
        email: 'learner.one@example.com',
        countryCode: 'EG',
      },
      payment: null,
      paymentAttempts: [
        {
          id: 'attempt_old',
          provider: PaymentProvider.PAYMOB,
          status: PaymentStatus.CREATED,
          amountSubtotal: amount('100'),
          amountDiscount: amount('0'),
          amountTotal: amount('100'),
          currencyCode: 'EGP',
          checkoutUrl: 'https://checkout.local/stale',
          clientSecret: 'old-secret',
        },
      ],
      ...overrides,
    };
  }

  it('creates a fresh checkout at request time and updates the new attempt', async () => {
    (academyRepository.findEnrollmentByIdForPublic as jest.Mock).mockResolvedValue(
      buildEnrollment(),
    );
    (academyRepository.createPaymentAttempt as jest.Mock).mockResolvedValue({
      id: 'attempt_2',
    });
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'payment_2',
      status: PaymentStatus.CREATED,
      amountTotal: amount('100'),
      currencyCode: 'EGP',
      metadataJson: {},
    });
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'payment_2',
      status: PaymentStatus.PENDING,
      amountTotal: amount('100'),
      currencyCode: 'EGP',
      metadataJson: {},
    });
    (paymentRepository.createEvent as jest.Mock).mockResolvedValue({});
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue({
      initiateSessionPayment: jest.fn().mockResolvedValue({
        providerPaymentRef: 'pay_2',
        providerOrderRef: 'order_2',
        providerCustomerRef: 'customer_2',
        checkoutUrl: 'https://paymob.example/checkout/fresh',
        clientSecret: 'secret_2',
        status: PaymentStatus.PENDING,
      }),
    });

    const result = await useCase.execute({
      enrollmentId: 'enrollment_1',
      token: 'public-token',
      locale: 'ar',
      returnUrl: 'fayed://academy/enrollments/enrollment_1/payment-return?token=public-token',
    });

    expect(result.redirectUrl).toBe('https://paymob.example/checkout/fresh');
    expect(paymentProviderRegistryService.get).toHaveBeenCalledWith(
      PaymentProvider.PAYMOB,
      expect.objectContaining({
        checkoutCountryIsoCode: 'EG',
        operatingCountryIsoCode: 'EG',
      }),
    );
    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      'payment_2',
      expect.objectContaining({
        status: PaymentStatus.PENDING,
        providerPaymentRef: 'pay_2',
        providerOrderRef: 'order_2',
        providerCustomerRef: 'customer_2',
      }),
      expect.anything(),
    );
    const providerAdapter = (
      paymentProviderRegistryService.get as jest.Mock
    ).mock.results[0]?.value as
      | {
          initiateSessionPayment: jest.Mock;
        }
      | undefined;
    expect(providerAdapter?.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectionUrl: expect.stringContaining('/payment-return?token=public-token'),
      }),
    );
    expect(academyRepository.updatePaymentAttempt).toHaveBeenCalledWith(
      'attempt_2',
      expect.objectContaining({
        providerPaymentRef: 'pay_2',
        providerOrderRef: 'order_2',
        providerCustomerRef: 'customer_2',
        checkoutUrl: 'https://paymob.example/checkout/fresh',
        clientSecret: 'secret_2',
      }),
      expect.anything(),
    );
  });

  it('redirects to a safe unavailable state when the enrollment is missing', async () => {
    (academyRepository.findEnrollmentByIdForPublic as jest.Mock).mockResolvedValue(
      null,
    );

    const result = await useCase.execute({
      enrollmentId: 'missing',
      token: 'public-token',
      locale: 'ar',
      returnUrl: 'fayed://academy/enrollments/missing/payment-return?token=public-token',
    });

    expect(result.redirectUrl).toContain('redirect_status=payment_unavailable');
    expect(paymentProviderRegistryService.get).not.toHaveBeenCalled();
  });

  it('keeps the same web surface when the returnUrl is invalid but the caller surface is trusted', async () => {
    (academyRepository.findEnrollmentByIdForPublic as jest.Mock).mockResolvedValue(
      null,
    );

    const result = await useCase.execute({
      enrollmentId: 'missing',
      token: 'public-token',
      locale: 'ar',
      returnUrl: 'https://evil.example/academy/enrollments/missing/payment-return?token=public-token',
      callerSurfaceUrl: 'http://localhost:8081',
    });

    expect(result.redirectUrl).toContain('http://localhost:8081');
    expect(result.redirectUrl).toContain('redirect_status=payment_unavailable');
    expect(result.redirectUrl).not.toContain('http://localhost:3000');
  });

  it('returns succeeded when the enrollment is already confirmed', async () => {
    (academyRepository.findEnrollmentByIdForPublic as jest.Mock).mockResolvedValue(
      buildEnrollment({
        enrollmentStatus: 'CONFIRMED',
      }),
    );

    const result = await useCase.execute({
      enrollmentId: 'enrollment_1',
      token: 'public-token',
      locale: 'ar',
      returnUrl: 'fayed://academy/enrollments/enrollment_1/payment-return?token=public-token',
    });

    expect(result.redirectUrl).toContain('redirect_status=succeeded');
    expect(paymentProviderRegistryService.get).not.toHaveBeenCalled();
  });

  it('preserves a valid Expo Web returnUrl on localhost:8081', async () => {
    (academyRepository.findEnrollmentByIdForPublic as jest.Mock).mockResolvedValue(
      buildEnrollment(),
    );
    (academyRepository.createPaymentAttempt as jest.Mock).mockResolvedValue({
      id: 'attempt_2',
    });
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'payment_2',
      status: PaymentStatus.CREATED,
      amountTotal: amount('100'),
      currencyCode: 'EGP',
      metadataJson: {},
    });
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'payment_2',
      status: PaymentStatus.PENDING,
      amountTotal: amount('100'),
      currencyCode: 'EGP',
      metadataJson: {},
    });
    (paymentRepository.createEvent as jest.Mock).mockResolvedValue({});
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue({
      initiateSessionPayment: jest.fn().mockResolvedValue({
        providerPaymentRef: 'pay_2',
        providerOrderRef: 'order_2',
        providerCustomerRef: 'customer_2',
        checkoutUrl: 'https://paymob.example/checkout/fresh',
        clientSecret: 'secret_2',
        status: PaymentStatus.PENDING,
      }),
    });

    const returnUrl =
      'http://localhost:8081/academy/enrollments/enrollment_1/payment-return?token=public-token';

    const result = await useCase.execute({
      enrollmentId: 'enrollment_1',
      token: 'public-token',
      locale: 'ar',
      returnUrl,
    });

    expect(result.redirectUrl).toBe('https://paymob.example/checkout/fresh');
    const providerAdapter = (
      paymentProviderRegistryService.get as jest.Mock
    ).mock.results[0]?.value as
      | {
          initiateSessionPayment: jest.Mock;
        }
      | undefined;
    expect(providerAdapter?.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectionUrl: returnUrl,
      }),
    );
  });
});
