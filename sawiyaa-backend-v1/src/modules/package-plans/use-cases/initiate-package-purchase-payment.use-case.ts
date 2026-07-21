import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MarketType,
  PaymentEventType,
  PaymentPurpose,
  PaymentStatus,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { resolveProviderForCurrency } from '@common/payments/payment-region.resolver';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { RefundPolicyType } from '@prisma/client';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { PaymentMapper } from '@modules/payments/mappers/payment.mapper';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { RefundPolicyService } from '@modules/refund-policies/services/refund-policy.service';
import { toGatewayMinorUnits } from '@modules/payments/utils/money-units.util';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import {
  PaymentProviderAdapter,
  PaymentProviderInitiationResult,
} from '@modules/payments/providers/payment-provider-adapter.interface';

const ACTIVE_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.CREATED,
  PaymentStatus.PENDING,
  PaymentStatus.REQUIRES_ACTION,
  PaymentStatus.AUTHORIZED,
];

@Injectable()
export class InitiatePackagePurchasePaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentProviderResolverService: PaymentProviderResolverService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly paymentGeoContextService: PaymentGeoContextService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly paymentMapper: PaymentMapper,
    private readonly refundPolicyService: RefundPolicyService,
  ) {}

  async execute(input: {
    userId: string;
    purchaseId: string;
    acceptedRefundPolicyId: string;
    returnUrl?: string | null;
    displayLocale: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    requestCountryIsoCode?: string | null;
  }) {
    const patient = await this.patientProfileRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.patientNotFound',
        error: 'PACKAGE_PURCHASE_PATIENT_NOT_FOUND',
      });
    }

    const purchase = await this.packagePurchaseRepository.findByIdForPatient({
      purchaseId: input.purchaseId,
      patientId: patient.id,
    });

    if (!purchase) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.notFound',
        error: 'PACKAGE_PURCHASE_NOT_FOUND',
      });
    }

    if (purchase.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.notPayable',
        error: 'PACKAGE_PURCHASE_NOT_PAYABLE',
      });
    }

    if (
      !purchase.paymentExpiresAt ||
      purchase.paymentExpiresAt.getTime() <= Date.now()
    ) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.paymentExpired',
        error: 'PACKAGE_PURCHASE_PAYMENT_EXPIRED',
      });
    }

    if (!purchase.sessions.length) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.noLinkedSessions',
        error: 'PACKAGE_PURCHASE_NO_LINKED_SESSIONS',
      });
    }

    if (
      purchase.sessions.some((session) => session.status !== 'PENDING_PAYMENT')
    ) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.linkedSessionsNotPending',
        error: 'PACKAGE_PURCHASE_LINKED_SESSIONS_NOT_PENDING',
      });
    }

    const activePackagePayment = purchase.payment;
    const isRefreshingActivePayment = Boolean(activePackagePayment);
    if (
      activePackagePayment &&
      !ACTIVE_PAYMENT_STATUSES.includes(activePackagePayment.status)
    ) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.paymentAlreadyExists',
        error: 'PACKAGE_PURCHASE_PAYMENT_ALREADY_EXISTS',
      });
    }

    const currencyCode = (purchase.currencyCodeSnapshot ?? '')
      .trim()
      .toUpperCase();
    const amount = purchase.patientPayableTotalSnapshot?.toString?.() ?? null;

    if (!amount || !currencyCode) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.missingPaymentSnapshot',
        error: 'PACKAGE_PURCHASE_MISSING_PAYMENT_SNAPSHOT',
      });
    }

    const practitionerCountryIsoCode =
      purchase.practitioner?.country?.isoCode ?? null;
    const requestCountryIsoCode = input.requestCountryIsoCode ?? null;

    const provider = this.resolveProvider({
      currencyCode,
      patientCountryIsoCode: requestCountryIsoCode,
      practitionerCountryIsoCode,
    });

    const amountDecimal = new Prisma.Decimal(amount).toDecimalPlaces(2);
    const amountMinor = toGatewayMinorUnits(amountDecimal, currencyCode);
    const countrySnapshot = this.paymentGeoContextService.buildCountrySnapshot({
      declaredCountryCode: requestCountryIsoCode,
      resolvedCountryCode: requestCountryIsoCode,
      countrySource: 'SYSTEM',
      countryMismatch: false,
      phoneCountryCode: null,
      operatingCountryCode: practitionerCountryIsoCode,
      checkoutCountryCode: requestCountryIsoCode,
      pricingCurrencyCode: currencyCode,
      pricingMarketType:
        currencyCode === 'EGP' ? MarketType.LOCAL : MarketType.CROSS_BORDER,
      provider,
    });
    const paymentMetadata = {
      source: 'package-purchase-payment-initiation',
      paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
      packagePurchaseId: purchase.id,
      packagePlanId: purchase.packagePlanId,
      packagePlanCode: purchase.planCodeSnapshot,
      patientId: patient.id,
      practitionerId: purchase.practitionerId,
      selectedCurrencyCode: currencyCode,
      selectedBaseSessionPrice:
        purchase.selectedBaseSessionPriceSnapshot?.toString?.() ?? null,
      patientPayableTotal: amountDecimal.toFixed(2),
      countrySnapshot,
    } as const;

    const payment =
      activePackagePayment ??
      (await this.prisma.$transaction(async (tx) => {
        const createdPayment = await this.paymentRepository.createPayment(
          {
            sessionId: null,
            patientId: patient.id,
            practitionerId: purchase.practitionerId,
            paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
            provider,
            status: PaymentStatus.CREATED,
            amountSubtotal: amountDecimal.toFixed(2),
            amountDiscount: '0',
            amountTotal: amountDecimal.toFixed(2),
            currencyCode,
            metadataJson: paymentMetadata,
          },
          tx,
        );

        await this.paymentRepository.createEvent(
          {
            paymentId: createdPayment.id,
            eventType: PaymentEventType.PAYMENT_CREATED,
            payloadJson: {
              source: 'package-purchase-payment-initiation',
              packagePurchaseId: purchase.id,
              packagePlanCode: purchase.planCodeSnapshot,
              paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
              patientId: patient.id,
              practitionerId: purchase.practitionerId,
            },
          },
          tx,
        );

        await this.packagePurchaseRepository.updatePaymentInitiation(
          purchase.id,
          {
            paymentId: createdPayment.id,
            paymentInitiatedAt: new Date(),
          },
          tx,
        );

        return createdPayment;
      }));

    await this.refundPolicyService.ensureAcceptedRefundPolicyForPayment({
      policyType: RefundPolicyType.PACKAGE,
      acceptedRefundPolicyId: input.acceptedRefundPolicyId,
      acceptedByUserId: input.userId,
      paymentId: payment.id,
      packagePurchaseId: purchase.id,
      displayLocale: input.displayLocale,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      metadataJson: {
        paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
        packagePurchaseId: purchase.id,
        policyType: RefundPolicyType.PACKAGE,
      },
    });

    if (payment.status === PaymentStatus.AUTHORIZED) {
      return {
        item: this.paymentMapper.toViewModel(payment as never),
      };
    }

    const practitionerSlug =
      purchase.practitioner?.publicSlug ?? purchase.practitionerId;

    const providerAdapter: PaymentProviderAdapter =
      this.paymentProviderRegistryService.get(provider, {
        currencyCode,
        checkoutCountryIsoCode: requestCountryIsoCode,
        operatingCountryIsoCode: practitionerCountryIsoCode,
      });

    let providerResult: PaymentProviderInitiationResult;
    try {
      const trustedReturnUrl = this.resolveProviderRedirectionUrl({
        provider,
        returnUrl: input.returnUrl ?? null,
      });

      providerResult = await providerAdapter.initiateSessionPayment({
        paymentId: payment.id,
        amountMinor,
        currency: currencyCode,
        description: `Package purchase payment: ${purchase.planCodeSnapshot ?? purchase.id}`,
        sessionId: purchase.id,
        patientEmail: null,
        redirectionUrl: trustedReturnUrl,
        checkoutCountryIsoCode: requestCountryIsoCode,
        operatingCountryIsoCode: practitionerCountryIsoCode,
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await this.paymentRepository.updateStatus(
          payment.id,
          {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            metadataJson: {
              ...((payment.metadataJson ?? {}) as Record<string, unknown>),
              source: 'package-purchase-payment-initiation',
              packagePurchaseId: purchase.id,
              practitionerSlug,
              providerInitiationFailed: true,
              providerInitiationError:
                error instanceof Error
                  ? error.message.slice(0, 500)
                  : 'provider-initiation-failed',
            },
          },
          tx,
        );

        await this.paymentRepository.createEvent(
          {
            paymentId: payment.id,
            eventType: PaymentEventType.PAYMENT_FAILED,
            payloadJson: {
              source: 'package-purchase-payment-initiation',
              packagePurchaseId: purchase.id,
              reason:
                error instanceof Error
                  ? error.message.slice(0, 500)
                  : 'provider-initiation-failed',
            },
          },
          tx,
        );
      });

      throw error;
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
          initiatedAt: new Date(),
          providerPaymentRef: providerResult.providerPaymentRef,
          providerOrderRef: providerResult.providerOrderRef ?? null,
          providerCustomerRef: providerResult.providerCustomerRef ?? null,
          metadataJson: {
            ...((paymentMetadata ?? {}) as Record<string, unknown>),
            practitionerSlug,
            checkoutUrl: providerResult.checkoutUrl ?? null,
            clientSecret: providerResult.clientSecret ?? null,
            countrySnapshot,
            ...(providerResult.metadata ?? {}),
          },
        },
        tx,
      );

      if (isRefreshingActivePayment) {
        await this.packagePurchaseRepository.updatePaymentInitiation(
          purchase.id,
          {
            paymentId: payment.id,
            paymentInitiatedAt: new Date(),
          },
          tx,
        );
      }

      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.PROVIDER_CHECKOUT_CREATED,
          providerEventRef: providerResult.providerPaymentRef,
          payloadJson: {
            provider,
            checkoutUrl: providerResult.checkoutUrl ?? null,
            clientSecret: providerResult.clientSecret ? 'present' : null,
            packagePurchaseId: purchase.id,
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

  private resolveProvider(input: {
    currencyCode: string;
    patientCountryIsoCode: string | null;
    practitionerCountryIsoCode: string | null;
  }): PaymentProvider {
    const provider = resolveProviderForCurrency(input.currencyCode);
    if (provider === PaymentProvider.PAYMOB) {
      const normalizedCurrencyCode = input.currencyCode.trim().toUpperCase();

      if (normalizedCurrencyCode === 'USD') {
        return this.paymentProviderResolverService.resolveProvider({
          currencyCode: 'USD',
          commissionMarketType: MarketType.CROSS_BORDER,
          operatingCountryIsoCode: input.practitionerCountryIsoCode,
          checkoutCountryIsoCode: input.patientCountryIsoCode,
        });
      }

      return this.paymentProviderResolverService.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: input.patientCountryIsoCode,
        checkoutCountryIsoCode: input.patientCountryIsoCode,
      });
    }

    throw new BadRequestException({
      messageKey: 'packagePurchases.errors.unsupportedCurrency',
      error: 'PACKAGE_PURCHASE_UNSUPPORTED_CURRENCY',
      messageParams: {
        currencyCode: input.currencyCode,
      },
    });
  }

  private resolveProviderRedirectionUrl(input: {
    provider: PaymentProvider;
    returnUrl: string | null;
  }): string | null {
    if (input.provider !== PaymentProvider.PAYMOB) {
      return null;
    }

    const trustedReturnUrl =
      this.paymentRuntimeConfigService.resolveTrustedReturnUrl(input.returnUrl);

    if (!trustedReturnUrl) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidReturnUrl',
        error: 'PAYMENT_INVALID_RETURN_URL',
      });
    }

    return trustedReturnUrl;
  }
}
