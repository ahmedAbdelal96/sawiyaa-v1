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
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
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

@Injectable()
export class InitiateSessionPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentPatientRepository: PaymentPatientRepository,
    private readonly paymentSessionRepository: PaymentSessionRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentProviderResolverService: PaymentProviderResolverService,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly markPaymentSucceededUseCase: MarkPaymentSucceededUseCase,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly resolveSessionPaymentPricingService: ResolveSessionPaymentPricingService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly paymentMapper: PaymentMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
    couponCode?: string | null;
    useWalletBalance?: boolean;
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

    if (activePayment) {
      return {
        item: this.paymentMapper.toViewModel(activePayment),
      };
    }

    const pricing = await this.resolveSessionPaymentPricingService.resolve({
      session,
      couponCode: input.couponCode ?? null,
    });
    const accountingConfig = this.paymentRuntimeConfigService.getAccountingConfig();
    const totalAmountDecimal = new Prisma.Decimal(pricing.amountTotal);
    const useWalletBalance = input.useWalletBalance === true;
    const availableWalletBalance = useWalletBalance
      ? await this.customerWalletAccountingService.getAvailableBalance({
          patientId: patient.id,
          currencyCode: pricing.currencyCode,
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

    const provider = amountFromGateway.lte(0)
      ? PaymentProvider.INTERNAL_WALLET
      : this.paymentProviderResolverService.resolveProvider({
          currencyCode: pricing.currencyCode,
          commissionMarketType: pricing.marketType,
          operatingCountryIsoCode:
            session.practitioner.country?.isoCode ?? null,
          checkoutCountryIsoCode: session.patient.country?.isoCode ?? null,
        });
    const amountMinor = this.toMinorUnits(amountFromGateway.toFixed(2));
    const providerAdapter =
      provider === PaymentProvider.INTERNAL_WALLET
        ? null
        : this.paymentProviderRegistryService.get(provider);
    const redirectUrls = this.paymentRuntimeConfigService.getRedirectUrls();
    const providerMode =
      provider === PaymentProvider.INTERNAL_WALLET
        ? 'internal'
        : this.paymentRuntimeConfigService.isTestMode(provider)
          ? 'test'
          : 'live';

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await this.paymentRepository.createPayment(
        {
          sessionId: session.id,
          patientId: patient.id,
          practitionerId: session.practitioner.id,
          paymentPurpose: pricing.paymentPurpose,
          provider,
          status: PaymentStatus.CREATED,
          amountSubtotal: pricing.amountSubtotal,
          amountDiscount: pricing.amountDiscount,
          amountTotal: pricing.amountTotal,
          amountFromWallet: amountFromWallet.toFixed(2),
          amountFromGateway: amountFromGateway.toFixed(2),
          currencyCode: pricing.currencyCode,
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
            amountFromWallet: amountFromWallet.toFixed(2),
            amountFromGateway: amountFromGateway.toFixed(2),
            financialBreakdown: {
              ...pricing.breakdown,
              vatRatePercent: vatRatePercentDecimal.toFixed(2),
              vatAmount: vatAmountDecimal.toFixed(2),
              gatewayFeeRatePercent:
                gatewayFeeRatePercentDecimal.toFixed(2),
              gatewayFeeFixedAmount:
                gatewayFeeFixedAmountDecimal.toFixed(2),
              gatewayFeeAmount: gatewayFeeAmountDecimal.toFixed(2),
            },
          },
        },
        tx,
      );

      if (amountFromWallet.gt(0)) {
        await this.customerWalletAccountingService.reserveForSessionPayment({
          patientId: patient.id,
          paymentId: created.id,
          sessionId: session.id,
          currencyCode: pricing.currencyCode,
          amount: amountFromWallet.toFixed(2),
          expiresAt: session.expiresAt ?? null,
          tx,
        });
      }

      await this.paymentRepository.createEvent(
        {
          paymentId: created.id,
          eventType: PaymentEventType.PAYMENT_CREATED,
          payloadJson: {
            source: 'patient-initiation',
            resolvedProvider: provider,
            providerMode,
          },
        },
        tx,
      );

      return created;
    });

    if (provider === PaymentProvider.INTERNAL_WALLET) {
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

    let providerResult;
    try {
      providerResult = await providerAdapter!.initiateSessionPayment({
        paymentId: payment.id,
        amountMinor,
        currency: pricing.currencyCode,
        description: `Session payment for ${session.practitioner.user.displayName ?? session.practitioner.publicSlug}`,
        sessionId: session.id,
        patientEmail: patient.user.emails[0]?.email ?? null,
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
            checkoutUrl: providerResult.checkoutUrl ?? null,
            clientSecret: providerResult.clientSecret ?? null,
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
}
