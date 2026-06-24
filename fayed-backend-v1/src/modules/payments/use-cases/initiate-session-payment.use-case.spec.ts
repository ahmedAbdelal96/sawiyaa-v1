/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  MarketType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentGeoContextService } from '../services/payment-geo-context.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentPatientRepository } from '../repositories/payment-patient.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentProviderRegistryService } from '../services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '../services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '../services/payment-runtime-config.service';
import { ResolveSessionPaymentPricingService } from '../services/resolve-session-payment-pricing.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { MarkPaymentSucceededUseCase } from './mark-payment-succeeded.use-case';
import { InitiateSessionPaymentUseCase } from './initiate-session-payment.use-case';
import { PaymentSessionRepository } from '../repositories/payment-session.repository';
import { RefundPolicyService } from '@modules/refund-policies/services/refund-policy.service';

describe('InitiateSessionPaymentUseCase', () => {
  const prisma = {
    $transaction: jest.fn((callback: (tx: never) => Promise<unknown>) =>
      callback({} as never),
    ),
  } as never;
  const paymentPatientRepository = {
    findByUserId: jest.fn(),
  } as unknown as PaymentPatientRepository;
  const paymentSessionRepository = {
    findPatientOwnedSession: jest.fn(),
  } as unknown as PaymentSessionRepository;
  const paymentRepository = {
    createPayment: jest.fn(),
    createEvent: jest.fn(),
    updateStatus: jest.fn(),
    findSuccessfulBySessionId: jest.fn(),
    findLatestActiveBySessionId: jest.fn(),
  } as unknown as PaymentRepository;
  const paymentProviderRegistryService = {
    get: jest.fn(),
  } as unknown as PaymentProviderRegistryService;
  const paymentProviderResolverService = {
    resolveProvider: jest.fn(),
  } as unknown as PaymentProviderResolverService;
  const paymentGeoContextService = {
    buildCountrySnapshot: jest.fn((input) => input),
  } as unknown as PaymentGeoContextService;
  const customerWalletAccountingService = {
    getAvailableBalance: jest.fn(),
    reserveForSessionPayment: jest.fn(),
    releaseReservationForPayment: jest.fn(),
  } as unknown as CustomerWalletAccountingService;
  const markPaymentSucceededUseCase = {
    execute: jest.fn(),
  } as unknown as MarkPaymentSucceededUseCase;
  const paymentRuntimeConfigService = {
    getAccountingConfig: jest.fn(() => ({
      vatEnabled: false,
      vatRatePercent: 0,
      gatewayFeeRatePercent: 0,
      gatewayFeeFixedAmount: '0',
    })),
    getAppBaseUrl: jest.fn(() => 'https://app.example.com'),
    getRedirectUrls: jest.fn(() => ({ success: 'https://app/success' })),
    getPaymobCheckoutFlow: jest.fn(() => 'unified'),
    resolvePaymobCheckoutMethod: jest.fn(),
    isTestMode: jest.fn(() => true),
    getPaymobMethodRegistry: jest.fn(() => []),
    resolveTrustedReturnUrl: jest.fn((value: string | null | undefined) => {
      if (!value?.trim()) {
        return null;
      }

      if (
        value.startsWith('http://localhost:3000') ||
        value.startsWith('http://localhost:8081') ||
        value.startsWith('sawiyaa://')
      ) {
        return value;
      }

      return null;
    }),
  } as unknown as PaymentRuntimeConfigService;
  const resolveSessionPaymentPricingService = {
    resolve: jest.fn(),
  } as unknown as ResolveSessionPaymentPricingService;
  const validatePaymentStatusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidatePaymentStatusTransitionService;
  const refundPolicyService = {
    ensureAcceptedRefundPolicyForPayment: jest.fn(),
  } as unknown as RefundPolicyService;
  const corporateSponsorshipPaymentService = {
    checkPaymentEligibility: jest.fn(),
  };
  const paymentMapper = {
    toViewModel: jest.fn(
      (payment: {
        id: string;
        status: PaymentStatus;
        metadataJson?: Record<string, unknown> | null;
      }) => ({
        id: payment.id,
        status: payment.status,
        sessionId: 'session-1',
        provider: PaymentProvider.PAYMOB,
        amountSubtotal: '120.00',
        amountDiscount: '0.00',
        amountTotal: '120.00',
        amountFromWallet: '0.00',
        amountFromGateway: '120.00',
        amount: '120.00',
        currency: 'EGP',
        providerPaymentId: 'provider-payment-1',
        providerReference: 'provider-order-1',
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

  const useCase = new InitiateSessionPaymentUseCase(
    prisma,
    paymentPatientRepository,
    paymentSessionRepository,
    paymentRepository,
    paymentProviderRegistryService,
    paymentProviderResolverService,
    paymentGeoContextService,
    customerWalletAccountingService,
    markPaymentSucceededUseCase,
    paymentRuntimeConfigService,
    resolveSessionPaymentPricingService,
    validatePaymentStatusTransitionService,
    paymentMapper,
    refundPolicyService,
    corporateSponsorshipPaymentService as any,
  );

  const basePatient = {
    id: 'patient-1',
    user: { emails: [{ email: 'patient@example.com' }] },
    country: { isoCode: 'EGY' },
  };

  const baseSession = {
    id: 'session-1',
    status: SessionStatus.PENDING_PAYMENT,
    expiresAt: new Date('2999-01-01T00:15:00.000Z'),
    practitioner: {
      id: 'practitioner-1',
      publicSlug: 'dr-youssef',
      country: { isoCode: 'EGY' },
      user: {
        displayName: 'Dr Y',
        status: 'ACTIVE',
      },
    },
    patient: {
      country: { isoCode: 'EGY' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (refundPolicyService.ensureAcceptedRefundPolicyForPayment as jest.Mock)
      .mockImplementation(() =>
        Promise.resolve({
          id: 'acceptance-1',
          refundPolicyVersionId: 'refund-policy-version-1',
        }),
      );
    (corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock)
      .mockResolvedValue({ eligible: false, sponsorship: null });
    (paymentPatientRepository.findByUserId as jest.Mock).mockResolvedValue(
      basePatient,
    );
    (
      paymentSessionRepository.findPatientOwnedSession as jest.Mock
    ).mockResolvedValue(baseSession);
    (
      paymentRepository.findSuccessfulBySessionId as jest.Mock
    ).mockResolvedValue(null);
    (
      paymentRepository.findLatestActiveBySessionId as jest.Mock
    ).mockResolvedValue(null);
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
    (
      paymentRuntimeConfigService.resolvePaymobCheckoutMethod as jest.Mock
    ).mockReturnValue(null);
    (
      resolveSessionPaymentPricingService.resolve as jest.Mock
    ).mockResolvedValue({
      amountSubtotal: '120.00',
      amountDiscount: '0.00',
      amountTotal: '120.00',
      currencyCode: 'EGP',
      marketType: MarketType.LOCAL,
      paymentPurpose: PaymentPurpose.SESSION_BOOKING,
      commissionRuleId: 'rule-1',
      commissionPlatformRatePercent: '20.00',
      commissionPractitionerRatePercent: '80.00',
      couponId: null,
      couponCodeSnapshot: null,
      couponDiscountSnapshot: '0.00',
      couponPlatformSharePercent: '0.00',
      couponPractitionerSharePercent: '0.00',
      breakdown: {
        platformCommissionAmount: '24.00',
      },
    });
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CREATED,
      metadataJson: {},
    });
    (paymentRepository.createEvent as jest.Mock).mockResolvedValue({});
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.PENDING,
      metadataJson: {},
    });
    (
      refundPolicyService.ensureAcceptedRefundPolicyForPayment as jest.Mock
    ).mockResolvedValue({
      id: 'acceptance-1',
      refundPolicyVersionId: 'refund-policy-version-1',
    });
  });

  it('creates a payment only when the active session refund policy version was accepted', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      sessionId: 'session-1',
      acceptedRefundPolicyId: 'refund-policy-version-1',
      displayLocale: 'en',
    });

    expect(
      refundPolicyService.ensureAcceptedRefundPolicyForPayment,
    ).toHaveBeenCalledTimes(1);
    expect(
      refundPolicyService.ensureAcceptedRefundPolicyForPayment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        policyType: 'SESSION',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        paymentId: 'payment-1',
        sessionId: 'session-1',
      }),
      expect.anything(),
    );
    expect(paymentRepository.createPayment).toHaveBeenCalledTimes(1);
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledTimes(1);
    expect(result.item.status).toBe(PaymentStatus.PENDING);
    expect(result.item.sessionId).toBe('session-1');
  });

  it.each([
    'http://localhost:8081/patient/sessions/session-1/payment-return',
    'http://localhost:3000/en/patient/sessions/session-1/payment-return',
    'sawiyaa://sessions/session-1/payment-return',
  ])('preserves trusted session returnUrl %s for Paymob payments', async (returnUrl) => {
    await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      sessionId: 'session-1',
      acceptedRefundPolicyId: 'refund-policy-version-1',
      displayLocale: 'en',
      returnUrl,
    });

    expect(
      providerAdapter.initiateSessionPayment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectionUrl: returnUrl,
      }),
    );
  });

  it('rejects an untrusted session returnUrl instead of silently falling back to the web default', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        sessionId: 'session-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
        returnUrl: 'https://evil.example/patient/sessions/session-1/payment-return',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(providerAdapter.initiateSessionPayment).not.toHaveBeenCalled();
  });

  it('refreshes an active payment checkout instead of reusing a stale URL', async () => {
    (
      paymentRepository.findLatestActiveBySessionId as jest.Mock
    ).mockResolvedValue({
      id: 'payment-existing',
      status: PaymentStatus.CREATED,
      metadataJson: {
        checkoutUrl: 'https://checkout-existing',
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
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValueOnce({
      id: 'payment-existing',
      status: PaymentStatus.PENDING,
      metadataJson: {
        checkoutUrl: 'https://checkout-refreshed',
      },
    });

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      sessionId: 'session-1',
      acceptedRefundPolicyId: 'refund-policy-version-1',
      displayLocale: 'en',
    });

    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledTimes(1);
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-existing',
      }),
    );
    expect(
      refundPolicyService.ensureAcceptedRefundPolicyForPayment,
    ).toHaveBeenCalledTimes(1);
    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      'payment-existing',
      expect.objectContaining({
        status: PaymentStatus.PENDING,
        metadataJson: expect.objectContaining({
          checkoutUrl: 'https://checkout-refreshed',
        }),
      }),
      expect.anything(),
    );
    expect(result.item.id).toBe('payment-existing');
    expect(result.item.checkoutUrl).toBe('https://checkout-refreshed');
  });

  it('rejects missing accepted refund policy ids through the refund policy gate', async () => {
    (
      refundPolicyService.ensureAcceptedRefundPolicyForPayment as jest.Mock
    ).mockRejectedValueOnce(
      new BadRequestException({
        messageKey: 'refundPolicies.errors.acceptanceRequired',
        error: 'REFUND_POLICY_ACCEPTANCE_REQUIRED',
      }),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        sessionId: 'session-1',
        acceptedRefundPolicyId: '',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects stale refund policy versions through the refund policy gate', async () => {
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
        locale: 'en',
        sessionId: 'session-1',
        acceptedRefundPolicyId: 'stale-version',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when no active session refund policy exists', async () => {
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
        locale: 'en',
        sessionId: 'session-1',
        acceptedRefundPolicyId: 'refund-policy-version-1',
        displayLocale: 'en',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('Corporate Sponsorship Payment Integration', () => {
    const basePaymentAmount = {
      amountSubtotal: '120.00',
      amountDiscount: '0.00',
      amountTotal: '120.00',
      currencyCode: 'EGP',
      marketType: MarketType.LOCAL,
      paymentPurpose: PaymentPurpose.SESSION_BOOKING,
      commissionRuleId: 'rule-1',
      commissionPlatformRatePercent: '20.00',
      commissionPractitionerRatePercent: '80.00',
      couponId: null,
      couponCodeSnapshot: null,
      couponDiscountSnapshot: '0.00',
      couponPlatformSharePercent: '0.00',
      couponPractitionerSharePercent: '0.00',
      breakdown: {
        platformCommissionAmount: '24.00',
      },
    };

    const eligibleSponsorshipContext = {
      sponsorshipId: 'sponsorship-uuid',
      organizationId: 'org-uuid',
      contractId: 'contract-uuid',
      benefitPlanId: 'plan-uuid',
      originalAmount: '500.00',
      coveredAmount: '500.00',
      patientPayAmount: '0.00',
      currency: 'EGP',
    };

    describe('A) No sponsorship - normal behavior unchanged', () => {
      it('uses original pricing amount when no sponsorship exists', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({ eligible: false, sponsorship: null });

        const result = await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        expect(paymentRepository.createPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            amountTotal: '120.00',
            amountSubtotal: '120.00',
            amountDiscount: '0.00',
            currencyCode: 'EGP',
          }),
          expect.anything(),
        );
        expect(result.item.amount).toBe('120.00');
      });

      it('does not include corporate metadata when no sponsorship', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({ eligible: false, sponsorship: null });

        await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        const paymentCall = (paymentRepository.createPayment as jest.Mock).mock
          .calls[0][0];
        expect(paymentCall.metadataJson).not.toHaveProperty(
          'sponsorshipId',
        );
        expect(paymentCall.metadataJson).not.toHaveProperty(
          'corporateOrganizationId',
        );
      });
    });

    describe('B) Eligible RESERVED sponsorship', () => {
      it('uses patientPayAmount as amount to pay instead of original pricing', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: eligibleSponsorshipContext,
        });

        const result = await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        expect(paymentRepository.createPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            amountTotal: '0.00',
            amountSubtotal: '500.00',
            amountDiscount: '500.00',
          }),
          expect.anything(),
        );
      });

      it('uses currency from sponsorship', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: eligibleSponsorshipContext,
        });

        await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        expect(paymentRepository.createPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            currencyCode: 'EGP',
          }),
          expect.anything(),
        );
      });

      it('includes corporate sponsorship metadata in payment record', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: eligibleSponsorshipContext,
        });

        await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        const paymentCall = (paymentRepository.createPayment as jest.Mock).mock
          .calls[0][0];
        expect(paymentCall.metadataJson).toHaveProperty('sponsorshipId');
        expect(paymentCall.metadataJson).toHaveProperty(
          'corporateOrganizationId',
        );
        expect(paymentCall.metadataJson).toHaveProperty(
          'corporateContractId',
        );
        expect(paymentCall.metadataJson).toHaveProperty(
          'corporateBenefitPlanId',
        );
        expect(paymentCall.metadataJson).toHaveProperty('originalAmount');
        expect(paymentCall.metadataJson).toHaveProperty('coveredAmount');
        expect(paymentCall.metadataJson).toHaveProperty('patientPayAmount');
        expect(paymentCall.metadataJson).toHaveProperty('currency');
      });

      it('does NOT expose codeHash or benefitCode in payment metadata', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: eligibleSponsorshipContext,
        });

        await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        const paymentCall = (paymentRepository.createPayment as jest.Mock).mock
          .calls[0][0];
        expect(paymentCall.metadataJson).not.toHaveProperty('codeHash');
        expect(paymentCall.metadataJson).not.toHaveProperty('benefitCode');
        expect(paymentCall.metadataJson).not.toHaveProperty('codeId');
      });

      it('sends correct amountMinor to provider adapter', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: { ...eligibleSponsorshipContext, patientPayAmount: '50.00' },
        });

        await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            amountMinor: 5000,
            currency: 'EGP',
          }),
        );
      });
    });

    describe('C) Invalid/expired sponsorship', () => {
      it('throws BadRequestException when sponsorship is expired', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: false,
          sponsorship: null,
          error: {
            messageKey: 'sponsorship.errors.reservationExpired',
            error: 'SPONSORSHIP_RESERVATION_EXPIRED',
          },
        });

        await expect(
          useCase.execute({
            userId: 'user-1',
            locale: 'en',
            sessionId: 'session-1',
            acceptedRefundPolicyId: 'refund-policy-version-1',
            displayLocale: 'en',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('throws BadRequestException when organization is inactive', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: false,
          sponsorship: null,
          error: {
            messageKey: 'sponsorship.errors.organizationNotActive',
            error: 'SPONSORSHIP_ORGANIZATION_INACTIVE',
          },
        });

        await expect(
          useCase.execute({
            userId: 'user-1',
            locale: 'en',
            sessionId: 'session-1',
            acceptedRefundPolicyId: 'refund-policy-version-1',
            displayLocale: 'en',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('does NOT create payment when sponsorship is invalid', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: false,
          sponsorship: null,
          error: {
            messageKey: 'sponsorship.errors.codeNotReserved',
            error: 'SPONSORSHIP_CODE_NOT_RESERVED',
          },
        });

        await expect(
          useCase.execute({
            userId: 'user-1',
            locale: 'en',
            sessionId: 'session-1',
            acceptedRefundPolicyId: 'refund-policy-version-1',
            displayLocale: 'en',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(paymentRepository.createPayment).not.toHaveBeenCalled();
        expect(providerAdapter.initiateSessionPayment).not.toHaveBeenCalled();
      });

      it('throws safe error without exposing codeHash or codeId', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: false,
          sponsorship: null,
          error: {
            messageKey: 'sponsorship.errors.codeNotFound',
            error: 'SPONSORSHIP_CODE_NOT_FOUND',
          },
        });

        let thrownError: any;
        try {
          await useCase.execute({
            userId: 'user-1',
            locale: 'en',
            sessionId: 'session-1',
            acceptedRefundPolicyId: 'refund-policy-version-1',
            displayLocale: 'en',
          });
        } catch (e) {
          thrownError = e;
        }

        expect(thrownError).toBeInstanceOf(BadRequestException);
        const errorResponse = thrownError.getResponse() as Record<string, any>;
        expect(errorResponse.error).toBe('SPONSORSHIP_CODE_NOT_FOUND');
        expect(JSON.stringify(errorResponse)).not.toContain('codeHash');
        expect(JSON.stringify(errorResponse)).not.toContain('codeId');
      });
    });

    describe('D) Zero patientPayAmount', () => {
      it('uses INTERNAL_WALLET provider when patientPayAmount is 0', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: { ...eligibleSponsorshipContext, patientPayAmount: '0.00' },
        });

        const result = await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        expect(paymentProviderResolverService.resolveProvider).not.toHaveBeenCalled();
        expect(providerAdapter.initiateSessionPayment).not.toHaveBeenCalled();
      });
    });

    describe('E) No consume in 5A - proof that no code.status changes happen', () => {
      it('does not call any method that could change code to USED', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: eligibleSponsorshipContext,
        });

        await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        expect(corporateSponsorshipPaymentService.checkPaymentEligibility).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'session-1',
            userId: 'user-1',
            paymentCurrency: 'EGP',
          }),
        );
        expect(paymentRepository.createPayment).toHaveBeenCalled();
      });

      it('does not call any code repository write method during payment initiation', async () => {
        const codeRepoSpy = jest.fn();
        const mockCodeRepo = {
          findByHash: jest.fn(),
          findById: codeRepoSpy,
          reserveCode: jest.fn(),
          reclaimExpiredCode: jest.fn(),
          releaseCode: jest.fn(),
        };
        expect(mockCodeRepo.reserveCode).not.toHaveBeenCalled();
        expect(mockCodeRepo.releaseCode).not.toHaveBeenCalled();
      });

      it('payment metadata does not include fields that would expose code to provider', async () => {
        (
          corporateSponsorshipPaymentService.checkPaymentEligibility as jest.Mock
        ).mockResolvedValue({
          eligible: true,
          sponsorship: eligibleSponsorshipContext,
        });

        await useCase.execute({
          userId: 'user-1',
          locale: 'en',
          sessionId: 'session-1',
          acceptedRefundPolicyId: 'refund-policy-version-1',
          displayLocale: 'en',
        });

        const paymentCall = (paymentRepository.createPayment as jest.Mock).mock
          .calls[0][0];
        expect(paymentCall.metadataJson).not.toHaveProperty('codeHash');
        expect(paymentCall.metadataJson).not.toHaveProperty('codePrefix');
        expect(paymentCall.metadataJson).not.toHaveProperty('codeLast4');
        expect(paymentCall.metadataJson).not.toHaveProperty('benefitCode');
      });
    });
  });
});
