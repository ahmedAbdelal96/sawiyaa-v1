/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  MarketType,
  PaymentProvider,
  PaymentStatus,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { PaymentMapper } from '@modules/payments/mappers/payment.mapper';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { RefundPolicyService } from '@modules/refund-policies/services/refund-policy.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import { InitiatePackagePurchasePaymentUseCase } from './initiate-package-purchase-payment.use-case';

describe('InitiatePackagePurchasePaymentUseCase', () => {
  const prisma = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback({} as never),
    ),
  } as never;
  const patientProfileRepository = {
    findByUserId: jest.fn(),
  } as unknown as PatientProfileRepository;
  const packagePurchaseRepository = {
    findByIdForPatient: jest.fn(),
    updatePaymentInitiation: jest.fn(),
  } as unknown as PatientPackagePurchaseRepository;
  const paymentRepository = {
    createPayment: jest.fn(),
    createEvent: jest.fn(),
    updateStatus: jest.fn(),
  } as unknown as PaymentRepository;
  const paymentProviderRegistryService = {
    get: jest.fn(),
  } as unknown as PaymentProviderRegistryService;
  const paymentProviderResolverService = {
    resolveProvider: jest.fn(),
  } as unknown as PaymentProviderResolverService;
  const paymentRuntimeConfigService = {
    resolveTrustedReturnUrl: jest.fn((returnUrl: string | null | undefined) =>
      returnUrl && /localhost:8081|localhost:3000|^fayed:/.test(returnUrl)
        ? returnUrl
        : null,
    ),
  } as unknown as PaymentRuntimeConfigService;
  const paymentGeoContextService = {
    buildCountrySnapshot: jest.fn((input) => input),
  } as unknown as PaymentGeoContextService;
  const validatePaymentStatusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidatePaymentStatusTransitionService;
  const refundPolicyService = {
    ensureAcceptedRefundPolicyForPayment: jest.fn(),
  } as unknown as RefundPolicyService;
  const paymentMapper = {
    toViewModel: jest.fn(
      (payment: {
        id: string;
        status: PaymentStatus;
        metadataJson?: Record<string, unknown> | null;
      }) => ({
        id: payment.id,
        status: payment.status,
        sessionId: null,
        provider: PaymentProvider.PAYMOB,
        amountSubtotal: '360.00',
        amountDiscount: '0.00',
        amountTotal: '360.00',
        amountFromWallet: '0.00',
        amountFromGateway: '360.00',
        amount: '360.00',
        currency: 'EGP',
        providerPaymentId: 'pay-1',
        providerReference: 'order-1',
        providerMethod: null,
        checkoutUrl:
          typeof payment.metadataJson?.checkoutUrl === 'string'
            ? payment.metadataJson.checkoutUrl
            : 'https://pay',
        clientSecret:
          typeof payment.metadataJson?.clientSecret === 'string'
            ? payment.metadataJson.clientSecret
            : null,
        paidAt: null,
        failedAt: null,
        expiredAt: null,
        refundedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ),
  } as unknown as PaymentMapper;

  const providerAdapter = {
    initiateSessionPayment: jest.fn(),
  };

  const useCase = new InitiatePackagePurchasePaymentUseCase(
    prisma,
    patientProfileRepository,
    packagePurchaseRepository,
    paymentRepository,
    paymentProviderRegistryService,
    paymentProviderResolverService,
    paymentRuntimeConfigService,
    paymentGeoContextService,
    validatePaymentStatusTransitionService,
    paymentMapper,
    refundPolicyService,
  );

  const basePatient = {
    id: 'patient-1',
    country: { isoCode: 'EGY' },
  };

  const basePurchase = {
    id: 'purchase-1',
    status: 'PENDING_PAYMENT',
    paymentId: null,
    paymentInitiatedAt: null,
    paymentExpiresAt: new Date('2999-01-01T00:15:00.000Z'),
    currencyCodeSnapshot: 'EGP',
    patientPayableTotalSnapshot: '360.00',
    practitionerId: 'practitioner-1',
    planCodeSnapshot: 'SESSIONS_4',
    packagePlanId: 'plan-1',
    selectedBaseSessionPriceSnapshot: '100.00',
    practitioner: {
      id: 'practitioner-1',
      publicSlug: 'dr-youssef-abdallah',
      acceptsPackages: true,
      country: { isoCode: 'EGY', currencyCode: 'EGP' },
      user: {
        displayName: 'Dr Y',
        status: 'ACTIVE',
        timezone: 'Africa/Cairo',
      },
    },
    sessions: [
      {
        id: 'session-1',
        status: SessionStatus.PENDING_PAYMENT,
        sessionCode: 'SES-1',
        scheduledStartAt: new Date('2999-01-01T10:00:00.000Z'),
        scheduledEndAt: new Date('2999-01-01T11:00:00.000Z'),
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        packageSessionIndex: 1,
      },
    ],
    payment: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue(
      basePatient,
    );
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue(basePurchase);
    (
      paymentProviderResolverService.resolveProvider as jest.Mock
    ).mockReturnValue(PaymentProvider.PAYMOB);
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue(
      providerAdapter,
    );
    (providerAdapter.initiateSessionPayment as jest.Mock).mockResolvedValue({
      providerPaymentRef: 'provider-payment-1',
      providerOrderRef: 'provider-order-1',
      providerCustomerRef: null,
      status: PaymentStatus.PENDING,
      checkoutUrl: 'https://checkout',
      clientSecret: null,
      metadata: {},
    });
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CREATED,
      metadataJson: {},
    });
    (paymentRepository.createEvent as jest.Mock).mockResolvedValue({});
    (paymentRepository.updateStatus as jest.Mock).mockImplementation(
      async (paymentId: string, data: { status?: PaymentStatus; metadataJson?: Record<string, unknown> }) => ({
        id: paymentId,
        status: data.status ?? PaymentStatus.PENDING,
        sessionId: null,
        provider: PaymentProvider.PAYMOB,
        amountSubtotal: '360.00',
        amountDiscount: '0.00',
        amountTotal: '360.00',
        amountFromWallet: '0.00',
        amountFromGateway: '360.00',
        currencyCode: 'EGP',
        providerPaymentRef: 'provider-payment-1',
        providerOrderRef: 'provider-order-1',
        providerCustomerRef: null,
        initiatedAt: new Date(),
        capturedAt: null,
        failedAt: null,
        expiredAt: null,
        metadataJson: data.metadataJson ?? {},
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    (
      refundPolicyService.ensureAcceptedRefundPolicyForPayment as jest.Mock
    ).mockResolvedValue({
      id: 'acceptance-1',
      refundPolicyVersionId: 'refund-policy-version-1',
    });
    (
      packagePurchaseRepository.updatePaymentInitiation as jest.Mock
    ).mockResolvedValue({
      ...basePurchase,
      paymentId: 'payment-1',
      paymentInitiatedAt: new Date('2026-01-01T00:05:00.000Z'),
    });
  });

  it('creates one payment and links it to the purchase without confirming sessions', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      purchaseId: 'purchase-1',
      acceptedRefundPolicyId: 'refund-policy-version-1',
      returnUrl: 'http://localhost:8081/package-purchases/purchase-1/pay',
      displayLocale: 'en',
    });

    expect(paymentRepository.createPayment).toHaveBeenCalledTimes(1);
    expect(
      refundPolicyService.ensureAcceptedRefundPolicyForPayment,
    ).toHaveBeenCalledTimes(1);
    expect(
      refundPolicyService.ensureAcceptedRefundPolicyForPayment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        policyType: 'PACKAGE',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        paymentId: 'payment-1',
        packagePurchaseId: 'purchase-1',
      }),
    );
    expect(paymentRepository.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentPurpose: 'SESSION_PACKAGE_PURCHASE',
        amountSubtotal: '360.00',
        amountTotal: '360.00',
        currencyCode: 'EGP',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        sessionId: null,
        metadataJson: expect.objectContaining({
          packagePurchaseId: 'purchase-1',
          packagePlanCode: 'SESSIONS_4',
          paymentPurpose: 'SESSION_PACKAGE_PURCHASE',
          patientId: 'patient-1',
          practitionerId: 'practitioner-1',
          selectedCurrencyCode: 'EGP',
          patientPayableTotal: '360.00',
        }),
      }),
      expect.anything(),
    );
    expect(
      packagePurchaseRepository.updatePaymentInitiation,
    ).toHaveBeenCalledWith(
      'purchase-1',
      expect.objectContaining({
        paymentId: 'payment-1',
        paymentInitiatedAt: expect.any(Date),
      }),
      expect.anything(),
    );
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledTimes(1);
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        amountMinor: 36000,
        currency: 'EGP',
        sessionId: 'purchase-1',
        redirectionUrl: 'http://localhost:8081/package-purchases/purchase-1/pay',
      }),
    );
    expect(result.item.status).toBe(PaymentStatus.PENDING);
    expect(result.item.sessionId).toBeNull();
  });

  it('refreshes an active hosted checkout instead of reusing a stale URL', async () => {
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      ...basePurchase,
      payment: {
        id: 'payment-existing',
        status: PaymentStatus.CREATED,
        sessionId: null,
        provider: PaymentProvider.PAYMOB,
        amountSubtotal: '360.00',
        amountDiscount: '0.00',
        amountTotal: '360.00',
        amountFromWallet: '0.00',
        amountFromGateway: '360.00',
        currencyCode: 'EGP',
        providerPaymentRef: null,
        providerOrderRef: null,
        providerCustomerRef: null,
        initiatedAt: new Date('2026-01-01T00:00:00.000Z'),
        capturedAt: null,
        failedAt: null,
        expiredAt: null,
        metadataJson: {
          checkoutUrl: 'https://checkout-existing',
          clientSecret: 'secret-existing',
        },
      },
    });

    (providerAdapter.initiateSessionPayment as jest.Mock).mockResolvedValueOnce({
      providerPaymentRef: 'provider-payment-2',
      providerOrderRef: 'provider-order-2',
      providerCustomerRef: null,
      status: PaymentStatus.PENDING,
      checkoutUrl: 'https://checkout-refreshed',
      clientSecret: null,
      metadata: {},
    });

    const result = await useCase.execute({
      userId: 'user-1',
      purchaseId: 'purchase-1',
      acceptedRefundPolicyId: 'refund-policy-version-1',
      returnUrl: 'http://localhost:3000/en/patient/package-purchases/purchase-1',
      displayLocale: 'en',
    });

    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledTimes(1);
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-existing',
        redirectionUrl:
          'http://localhost:3000/en/patient/package-purchases/purchase-1',
      }),
    );
    expect(
      refundPolicyService.ensureAcceptedRefundPolicyForPayment,
    ).toHaveBeenCalledTimes(1);
    expect(result.item.id).toBe('payment-existing');
    expect(result.item.checkoutUrl).toBe('https://checkout-refreshed');
    expect(result.item.clientSecret).toBeNull();
  });

  it('rejects an untrusted returnUrl instead of silently falling back to the web default', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        returnUrl: 'https://evil.example/package-purchases/purchase-1/pay',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(providerAdapter.initiateSessionPayment).not.toHaveBeenCalled();
  });

  it('rejects missing returnUrl for Paymob instead of falling back to the web default', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(providerAdapter.initiateSessionPayment).not.toHaveBeenCalled();
  });

  it('reuses an authorized payment without reopening checkout', async () => {
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      ...basePurchase,
      payment: {
        id: 'payment-authorized',
        status: PaymentStatus.AUTHORIZED,
        sessionId: null,
        provider: PaymentProvider.PAYMOB,
        amountSubtotal: '360.00',
        amountDiscount: '0.00',
        amountTotal: '360.00',
        amountFromWallet: '0.00',
        amountFromGateway: '360.00',
        currencyCode: 'EGP',
        providerPaymentRef: 'provider-payment-authorized',
        providerOrderRef: 'provider-order-authorized',
        providerCustomerRef: null,
        initiatedAt: new Date('2026-01-01T00:00:00.000Z'),
        capturedAt: new Date('2026-01-01T00:10:00.000Z'),
        failedAt: null,
        expiredAt: null,
        metadataJson: {
          checkoutUrl: 'https://checkout-authorized',
          clientSecret: null,
        },
      },
    });

    const result = await useCase.execute({
      userId: 'user-1',
      purchaseId: 'purchase-1',
      acceptedRefundPolicyId: 'refund-policy-version-1',
      displayLocale: 'en',
    });

    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(providerAdapter.initiateSessionPayment).not.toHaveBeenCalled();
    expect(result.item.id).toBe('payment-authorized');
    expect(result.item.status).toBe(PaymentStatus.AUTHORIZED);
  });

  it('rejects missing accepted refund policy ids', async () => {
    (
      refundPolicyService.ensureAcceptedRefundPolicyForPayment as jest.Mock
    ).mockImplementationOnce(
      (input: { acceptedRefundPolicyId?: string | null }) => {
        if (!input.acceptedRefundPolicyId) {
          return Promise.reject(
            new BadRequestException({
              messageKey: 'refundPolicies.errors.acceptanceRequired',
              error: 'REFUND_POLICY_ACCEPTANCE_REQUIRED',
            }),
          );
        }
        return Promise.resolve({ id: 'acceptance-1' });
      },
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: '',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects stale accepted refund policy ids', async () => {
    (
      refundPolicyService.ensureAcceptedRefundPolicyForPayment as jest.Mock
    ).mockRejectedValueOnce(
      new ConflictException({
        messageKey: 'refundPolicies.errors.acceptanceStale',
        error: 'REFUND_POLICY_ACCEPTANCE_STALE',
      }),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'stale-version',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when no active package refund policy exists', async () => {
    (
      refundPolicyService.ensureAcceptedRefundPolicyForPayment as jest.Mock
    ).mockRejectedValueOnce(
      new NotFoundException({
        messageKey: 'refundPolicies.errors.activePolicyNotFound',
        error: 'REFUND_POLICY_ACTIVE_NOT_FOUND',
      }),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a purchase that is not owned by the patient', async () => {
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects expired or non-payable purchases', async () => {
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      ...basePurchase,
      status: 'EXPIRED',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects purchases with missing or expired payment windows', async () => {
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      ...basePurchase,
      paymentExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects purchases without linked pending sessions', async () => {
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      ...basePurchase,
      sessions: [],
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects purchases with non-pending linked sessions', async () => {
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      ...basePurchase,
      sessions: [
        {
          ...basePurchase.sessions[0],
          status: SessionStatus.CONFIRMED,
        },
      ],
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not fallback to practitioner country for EGP when patient country is unknown', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValueOnce({
      ...basePatient,
      country: null,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        purchaseId: 'purchase-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(paymentProviderResolverService.resolveProvider).not.toHaveBeenCalled();
  });
});
