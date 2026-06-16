/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  PaymentPurpose,
  RefundPolicyType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentGeoContextService } from '../services/payment-geo-context.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentPatientRepository } from '../repositories/payment-patient.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentSessionRepository } from '../repositories/payment-session.repository';
import { MarkPaymentSucceededUseCase } from './mark-payment-succeeded.use-case';
import { PaymentProviderRegistryService } from '../services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '../services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '../services/payment-runtime-config.service';
import { ResolveSessionPaymentPricingService } from '../services/resolve-session-payment-pricing.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { RefundPolicyService } from '@modules/refund-policies/services/refund-policy.service';
import { CorporateSponsorshipPaymentService } from '@modules/corporate-sponsorship/services/corporate-sponsorship-payment.service';
import {
  PaymentProviderAdapter,
  PaymentProviderInitiationResult,
} from '../providers/payment-provider-adapter.interface';
@Injectable()
export class InitiateSessionPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentPatientRepository: PaymentPatientRepository,
    private readonly paymentSessionRepository: PaymentSessionRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentProviderResolverService: PaymentProviderResolverService,
    private readonly paymentGeoContextService: PaymentGeoContextService,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly markPaymentSucceededUseCase: MarkPaymentSucceededUseCase,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly resolveSessionPaymentPricingService: ResolveSessionPaymentPricingService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly paymentMapper: PaymentMapper,
    private readonly refundPolicyService: RefundPolicyService,
    private readonly corporateSponsorshipPaymentService: CorporateSponsorshipPaymentService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
    acceptedRefundPolicyId: string;
    couponCode?: string | null;
    useWalletBalance?: boolean;
    paymobMethod?: string | null;
    returnUrl?: string | null;
    displayLocale: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const patient = await this.paymentPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'payments.errors.patientNotFound',
        error: 'PAYMENT_PATIENT_NOT_FOUND',
      });
    }

    const session = await this.paymentSessionRepository.findPatientOwnedSession(
      input.sessionId,
      input.userId,
    );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'payments.errors.sessionNotFound',
        error: 'PAYMENT_SESSION_NOT_FOUND',
      });
    }

    if (session.status !== SessionStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        messageKey: 'payments.errors.sessionNotPayable',
        error: 'PAYMENT_SESSION_NOT_PAYABLE',
      });
    }

    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException({
        messageKey: 'payments.errors.sessionPaymentExpired',
        error: 'PAYMENT_SESSION_PAYMENT_EXPIRED',
      });
    }

    const successfulPayment =
      await this.paymentRepository.findSuccessfulBySessionId(session.id);

    if (successfulPayment) {
      throw new ConflictException({
        messageKey: 'payments.errors.paymentAlreadyCompleted',
        error: 'PAYMENT_ALREADY_COMPLETED',
      });
    }

    const activePayment =
      await this.paymentRepository.findLatestActiveBySessionId(session.id);

    const pricing = await this.resolveSessionPaymentPricingService.resolve({
      session,
      couponCode: input.couponCode ?? null,
    });

    // Check corporate sponsorship eligibility
    const sponsorshipEligibility =
      await this.corporateSponsorshipPaymentService.checkPaymentEligibility({
        sessionId: session.id,
        userId: input.userId,
        paymentCurrency: pricing.currencyCode,
      });

    let effectiveAmountTotal = pricing.amountTotal;
    let effectiveAmountSubtotal = pricing.amountSubtotal;
    let effectiveAmountDiscount = pricing.amountDiscount;
    let effectiveBreakdown = pricing.breakdown;
    let corporateSponsorshipMetadata: Record<string, unknown> | null = null;

    if (sponsorshipEligibility.eligible && sponsorshipEligibility.sponsorship) {
      const sp = sponsorshipEligibility.sponsorship;
      effectiveAmountTotal = sp.patientPayAmount;
      effectiveAmountSubtotal = sp.originalAmount;
      effectiveAmountDiscount = sp.coveredAmount;
      effectiveBreakdown = {
        ...pricing.breakdown,
        grossAmount: sp.originalAmount,
        discountAmount: sp.coveredAmount,
        netPaidAmount: sp.patientPayAmount,
      };
      corporateSponsorshipMetadata = {
        sponsorshipId: sp.sponsorshipId,
        corporateOrganizationId: sp.organizationId,
        corporateContractId: sp.contractId,
        corporateBenefitPlanId: sp.benefitPlanId,
        coveredAmount: sp.coveredAmount,
        originalAmount: sp.originalAmount,
        patientPayAmount: sp.patientPayAmount,
        currency: sp.currency,
      };
    } else if (sponsorshipEligibility.error) {
      throw new BadRequestException({
        messageKey: sponsorshipEligibility.error.messageKey,
        error: sponsorshipEligibility.error.error,
      });
    }

    const accountingConfig =
      this.paymentRuntimeConfigService.getAccountingConfig();
    const appBaseUrl = this.paymentRuntimeConfigService.getAppBaseUrl();
    const totalAmountDecimal = new Prisma.Decimal(effectiveAmountTotal);
    const useWalletBalance = input.useWalletBalance === true;
    const availableWalletBalance = useWalletBalance
      ? await this.customerWalletAccountingService.getAvailableBalance({
          patientId: patient.id,
          currencyCode: effectiveBreakdown.currency ?? pricing.currencyCode,
        })
      : new Prisma.Decimal(0);
    const amountFromWallet = useWalletBalance
      ? Prisma.Decimal.min(availableWalletBalance, totalAmountDecimal)
      : new Prisma.Decimal(0);
    const amountFromGateway = totalAmountDecimal.sub(amountFromWallet);
    const platformCommissionAmountDecimal = new Prisma.Decimal(
      pricing.breakdown.platformCommissionAmount,
    );
    const vatRatePercentDecimal = accountingConfig.vatEnabled
      ? new Prisma.Decimal(accountingConfig.vatRatePercent)
      : new Prisma.Decimal(0);
    const vatAmountDecimal = accountingConfig.vatEnabled
      ? platformCommissionAmountDecimal
          .mul(vatRatePercentDecimal)
          .div(100)
          .toDecimalPlaces(2)
      : new Prisma.Decimal(0);
    const gatewayFeeRatePercentDecimal = new Prisma.Decimal(
      accountingConfig.gatewayFeeRatePercent,
    );
    const gatewayFeeFixedAmountDecimal = new Prisma.Decimal(
      accountingConfig.gatewayFeeFixedAmount,
    );
    const gatewayFeeAmountDecimal = amountFromGateway.gt(0)
      ? amountFromGateway
          .mul(gatewayFeeRatePercentDecimal)
          .div(100)
          .add(gatewayFeeFixedAmountDecimal)
          .toDecimalPlaces(2)
      : new Prisma.Decimal(0);

    let provider: PaymentProvider;
    if (amountFromGateway.lte(0)) {
      provider = PaymentProvider.INTERNAL_WALLET;
    } else {
      provider = this.paymentProviderResolverService.resolveProvider({
        currencyCode: pricing.currencyCode,
        commissionMarketType: pricing.marketType,
        operatingCountryIsoCode: session.practitioner.country?.isoCode ?? null,
        checkoutCountryIsoCode: session.patient.country?.isoCode ?? null,
      });
    }
    const providerCode = String(provider);
    const isInternalWalletProvider = providerCode === 'INTERNAL_WALLET';
    const isPaymobProvider = providerCode === 'PAYMOB';
    const providerRedirectionUrl = this.resolveProviderRedirectionUrl({
      provider,
      locale: input.locale,
      sessionId: session.id,
      returnUrl: input.returnUrl ?? null,
      appBaseUrl,
    });
    const paymobContext = {
      checkoutCountryIsoCode: session.patient.country?.isoCode ?? null,
      operatingCountryIsoCode: session.practitioner.country?.isoCode ?? null,
    };
    const amountMinor = this.toMinorUnits(amountFromGateway.toFixed(2));
    const providerAdapter: PaymentProviderAdapter | null =
      isInternalWalletProvider
        ? null
        : this.paymentProviderRegistryService.get(
            provider,
            isPaymobProvider ? paymobContext : undefined,
          );
    const redirectUrls = this.paymentRuntimeConfigService.getRedirectUrls();
    const paymobCheckoutFlow = isPaymobProvider
      ? this.paymentRuntimeConfigService.getPaymobCheckoutFlow()
      : null;
    const selectedPaymobMethod =
      isPaymobProvider && paymobCheckoutFlow === 'legacy'
        ? this.paymentRuntimeConfigService.resolvePaymobCheckoutMethod(
            input.paymobMethod ?? null,
            paymobContext,
          )
        : null;
    if (
      isPaymobProvider &&
      paymobCheckoutFlow === 'legacy' &&
      !selectedPaymobMethod
    ) {
      throw new BadRequestException({
        messageKey: 'payments.errors.providerNotConfigured',
        error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        messageParams: {
          provider: PaymentProvider.PAYMOB,
        },
      });
    }
    const providerMode = isInternalWalletProvider
      ? 'internal'
      : this.paymentRuntimeConfigService.isTestMode(provider)
        ? 'test'
        : 'live';
    const countrySnapshot = this.paymentGeoContextService.buildCountrySnapshot({
      declaredCountryCode: session.patient.country?.isoCode ?? null,
      resolvedCountryCode: pricing.resolvedCountryIsoCode,
      countrySource: 'ACCOUNT',
      countryMismatch: false,
      phoneCountryCode: null,
      operatingCountryCode: session.practitioner.country?.isoCode ?? null,
      checkoutCountryCode: session.patient.country?.isoCode ?? null,
      pricingCurrencyCode: pricing.currencyCode,
      pricingMarketType: pricing.marketType,
      provider,
    });

    const payment =
      activePayment ??
      (await this.prisma.$transaction(async (tx) => {
        const paymobRegistrySnapshot = isPaymobProvider
          ? this.paymentRuntimeConfigService
              .getPaymobMethodRegistry()
              .map((item) => ({
                key: item.key,
                label: item.label,
                type: item.type,
                enabled: item.enabled,
                supportedCheckoutFlows: item.supportedCheckoutFlows,
              }))
          : [];

        const created = await this.paymentRepository.createPayment(
          {
            sessionId: session.id,
            patientId: patient.id,
            practitionerId: session.practitioner.id,
            paymentPurpose: pricing.paymentPurpose,
            provider,
            status: PaymentStatus.CREATED,
            amountSubtotal: effectiveAmountSubtotal,
            amountDiscount: effectiveAmountDiscount,
            amountTotal: effectiveAmountTotal,
            amountFromWallet: amountFromWallet.toFixed(2),
            amountFromGateway: amountFromGateway.toFixed(2),
            currencyCode: effectiveBreakdown.currency ?? pricing.currencyCode,
            commissionRuleId: pricing.commissionRuleId,
            commissionPlatformRatePercent: pricing.commissionPlatformRatePercent,
            commissionPractitionerRatePercent:
              pricing.commissionPractitionerRatePercent,
            couponId: pricing.couponId,
            couponCodeSnapshot: pricing.couponCodeSnapshot,
            couponDiscountSnapshot: pricing.couponDiscountSnapshot,
            couponPlatformShareSnapshot: pricing.couponPlatformSharePercent,
            couponPractitionerShareSnapshot:
              pricing.couponPractitionerSharePercent,
            vatRatePercentSnapshot: vatRatePercentDecimal.toFixed(2),
            vatAmountSnapshot: vatAmountDecimal.toFixed(2),
            gatewayFeeRatePercentSnapshot:
              gatewayFeeRatePercentDecimal.toFixed(2),
            gatewayFeeFixedAmountSnapshot:
              gatewayFeeFixedAmountDecimal.toFixed(2),
            gatewayFeeAmountSnapshot: gatewayFeeAmountDecimal.toFixed(2),
            metadataJson: {
              source: 'session-payment-initiation',
              providerMode,
              redirectUrls,
              providerMethod: selectedPaymobMethod ?? null,
              paymobCheckoutFlow,
              paymobRegistrySnapshot,
              amountFromWallet: amountFromWallet.toFixed(2),
              amountFromGateway: amountFromGateway.toFixed(2),
              regionalPricingMode: pricing.regionalPricingMode,
              resolvedCountryIsoCode: pricing.resolvedCountryIsoCode,
              pricingCurrencyCode: pricing.currencyCode,
              countrySnapshot,
              financialBreakdown: {
                ...effectiveBreakdown,
                vatRatePercent: vatRatePercentDecimal.toFixed(2),
                vatAmount: vatAmountDecimal.toFixed(2),
                gatewayFeeRatePercent: gatewayFeeRatePercentDecimal.toFixed(2),
                gatewayFeeFixedAmount: gatewayFeeFixedAmountDecimal.toFixed(2),
                gatewayFeeAmount: gatewayFeeAmountDecimal.toFixed(2),
              },
              ...(corporateSponsorshipMetadata ?? {}),
            },
          },
          tx,
        );

        if (amountFromWallet.gt(0)) {
          await this.customerWalletAccountingService.reserveForSessionPayment({
            patientId: patient.id,
            paymentId: created.id,
            sessionId: session.id,
            currencyCode: effectiveBreakdown.currency ?? pricing.currencyCode,
            amount: amountFromWallet.toFixed(2),
            expiresAt: session.expiresAt ?? null,
            tx,
          });
        }

        await this.refundPolicyService.ensureAcceptedRefundPolicyForPayment(
          {
            policyType: RefundPolicyType.SESSION,
            acceptedRefundPolicyId: input.acceptedRefundPolicyId,
            acceptedByUserId: input.userId,
            paymentId: created.id,
            sessionId: session.id,
            displayLocale: input.displayLocale,
            userAgent: input.userAgent ?? null,
            ipAddress: input.ipAddress ?? null,
            metadataJson: {
              paymentPurpose: pricing.paymentPurpose,
              sessionId: session.id,
              policyType: RefundPolicyType.SESSION,
              ...(corporateSponsorshipMetadata ?? {}),
            },
          },
          tx,
        );

        await this.paymentRepository.createEvent(
          {
            paymentId: created.id,
            eventType: PaymentEventType.PAYMENT_CREATED,
            payloadJson: {
              source: 'patient-initiation',
              resolvedProvider: provider,
              providerMode,
              providerMethod: selectedPaymobMethod ?? null,
              paymobCheckoutFlow,
              countrySnapshot,
            },
          },
          tx,
        );

        return created;
      }));

    if (activePayment) {
      await this.refundPolicyService.ensureAcceptedRefundPolicyForPayment({
        policyType: RefundPolicyType.SESSION,
        acceptedRefundPolicyId: input.acceptedRefundPolicyId,
        acceptedByUserId: input.userId,
        paymentId: activePayment.id,
        sessionId: session.id,
        displayLocale: input.displayLocale,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        metadataJson: {
          paymentPurpose: pricing.paymentPurpose,
          sessionId: session.id,
          policyType: RefundPolicyType.SESSION,
        },
      });
    }

    if (isInternalWalletProvider) {
      const captured = await this.markPaymentSucceededUseCase.execute({
        paymentId: payment.id,
        providerEventRef: `internal-wallet-${payment.id}`,
        payload: {
          source: 'internal-wallet',
          amountFromWallet: amountFromWallet.toFixed(2),
          amountFromGateway: amountFromGateway.toFixed(2),
        },
      });

      return captured;
    }

    let providerResult: PaymentProviderInitiationResult;
    try {
      providerResult = await providerAdapter!.initiateSessionPayment({
        paymentId: payment.id,
        amountMinor,
        currency: effectiveBreakdown.currency ?? pricing.currencyCode,
        description: `Session payment for ${session.practitioner.user.displayName ?? session.practitioner.publicSlug}`,
        sessionId: session.id,
        patientEmail: patient.user.emails[0]?.email ?? null,
        redirectionUrl: providerRedirectionUrl,
        paymobMethod: selectedPaymobMethod,
        checkoutCountryIsoCode: paymobContext.checkoutCountryIsoCode,
        operatingCountryIsoCode: paymobContext.operatingCountryIsoCode,
      });
    } catch {
      await this.prisma.$transaction(async (tx) => {
        await this.paymentRepository.updateStatus(
          payment.id,
          {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
          },
          tx,
        );

        await this.paymentRepository.createEvent(
          {
            paymentId: payment.id,
            eventType: PaymentEventType.PAYMENT_FAILED,
            payloadJson: {
              source: 'provider-initiation',
              reason: 'provider-initiation-failed',
            },
          },
          tx,
        );
      });

      if (amountFromWallet.gt(0)) {
        await this.customerWalletAccountingService.releaseReservationForPayment(
          {
            paymentId: payment.id,
            currencyCode: pricing.currencyCode,
            releaseReason: 'PAYMENT_FAILED',
          },
        );
      }

      throw new ConflictException({
        messageKey: 'payments.errors.providerInitiationFailed',
        error: 'PAYMENT_PROVIDER_INITIATION_FAILED',
      });
    }

    this.validatePaymentStatusTransitionService.assertCanTransition(
      payment.status,
      providerResult.status,
    );

    const initializedPayment = await this.prisma.$transaction(async (tx) => {
      const updated = await this.paymentRepository.updateStatus(
        payment.id,
        {
          status: providerResult.status,
          providerPaymentRef: providerResult.providerPaymentRef,
          providerOrderRef: providerResult.providerOrderRef ?? null,
          providerCustomerRef: providerResult.providerCustomerRef ?? null,
          metadataJson: {
            ...((payment.metadataJson as Record<string, unknown> | null) ?? {}),
            source: 'session-payment-initiation',
            providerMode,
            redirectUrls,
            providerMethod:
              providerResult.providerMethod ?? selectedPaymobMethod ?? null,
            paymobCheckoutFlow,
            checkoutUrl: providerResult.checkoutUrl ?? null,
            clientSecret: providerResult.clientSecret ?? null,
            regionalPricingMode: pricing.regionalPricingMode,
            resolvedCountryIsoCode: pricing.resolvedCountryIsoCode,
            pricingCurrencyCode: pricing.currencyCode,
            ...(providerResult.metadata ?? {}),
          },
        },
        tx,
      );

      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.PROVIDER_CHECKOUT_CREATED,
          providerEventRef: providerResult.providerPaymentRef,
          payloadJson: {
            provider,
            providerMode,
            providerMethod:
              providerResult.providerMethod ?? selectedPaymobMethod ?? null,
            paymobCheckoutFlow,
            checkoutUrl: providerResult.checkoutUrl ?? null,
            clientSecret: providerResult.clientSecret ? 'present' : null,
            redirectUrls,
          },
        },
        tx,
      );

      return updated;
    });

    return {
      item: this.paymentMapper.toViewModel(initializedPayment),
    };
  }

  private toMinorUnits(amount: string): number {
    return Math.round(Number(amount) * 100);
  }

  private resolveProviderRedirectionUrl(input: {
    provider: PaymentProvider;
    locale: SupportedLocale;
    sessionId: string;
    returnUrl: string | null;
    appBaseUrl: string;
  }): string | null {
    if (input.provider !== 'PAYMOB') {
      return null;
    }

    if (input.returnUrl?.trim()) {
      const trustedReturnUrl = this.paymentRuntimeConfigService.resolveTrustedReturnUrl(
        input.returnUrl.trim(),
      );

      if (!trustedReturnUrl) {
        throw new BadRequestException({
          messageKey: 'payments.errors.invalidReturnUrl',
          error: 'PAYMENT_INVALID_RETURN_URL',
        });
      }

      return trustedReturnUrl;
    }

    return `${input.appBaseUrl}/${input.locale}/patient/sessions/${input.sessionId}/payment-return`;
  }
}
