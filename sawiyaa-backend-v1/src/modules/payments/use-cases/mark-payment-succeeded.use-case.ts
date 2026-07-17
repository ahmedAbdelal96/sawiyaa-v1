import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentPurpose,
  PaymentProvider,
  PaymentStatus,
  Payment,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { RedeemCouponUseCase } from '@modules/financial-rules/use-cases/redeem-coupon.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { OrchestrateAcademyProgramEnrollmentPaymentStatusService } from '../services/orchestrate-academy-program-enrollment-payment-status.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { ReconcilePackagePurchasePaymentUseCase } from '@modules/package-plans/use-cases/reconcile-package-purchase-payment.use-case';
import { CorporateSponsorshipConsumeService } from '@modules/corporate-sponsorship/services/corporate-sponsorship-consume.service';
import { SecurityAuditActorType as AuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';

@Injectable()
export class MarkPaymentSucceededUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly orchestrateAcademyProgramEnrollmentPaymentStatusService: OrchestrateAcademyProgramEnrollmentPaymentStatusService,
    private readonly paymentMapper: PaymentMapper,
    private readonly sessionEarningReviewService: SessionEarningReviewService,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly redeemCouponUseCase: RedeemCouponUseCase,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly reconcilePackagePurchasePaymentUseCase: ReconcilePackagePurchasePaymentUseCase,
    private readonly corporateSponsorshipConsumeService: CorporateSponsorshipConsumeService,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    paymentId: string;
    providerEventRef: string;
    payload: Record<string, unknown>;
  }) {
    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    this.validatePaymentStatusTransitionService.assertCanTransition(
      payment.status,
      PaymentStatus.CAPTURED,
    );

    const paymobPaymentMethod = this.resolvePaymobPaymentMethodSnapshot(
      payment.provider,
      input.payload,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.PROVIDER_WEBHOOK_RECEIVED,
          providerEventRef: input.providerEventRef,
          previousStatus: payment.status,
          payloadJson: input.payload as Prisma.InputJsonValue,
        },
        tx,
      );

      const captured = await this.paymentRepository.updateStatus(
        payment.id,
        {
          status: PaymentStatus.CAPTURED,
          capturedAt: new Date(),
          metadataJson: {
            ...((payment.metadataJson ?? {}) as Record<string, unknown>),
            ...(paymobPaymentMethod
              ? {
                  paymobPaymentMethod,
                }
              : {}),
          },
        },
        tx,
      );

      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.PAYMENT_CAPTURED,
          providerEventRef: input.providerEventRef,
          actorType: AuditActorType.PAYMENT_WEBHOOK,
          source: SecurityAuditSource.PAYMENT_WEBHOOK,
          previousStatus: payment.status,
          newStatus: PaymentStatus.CAPTURED,
        },
        tx,
      );

      const sponsorshipId = (payment.metadataJson as Record<string, unknown>)?.sponsorshipId as string | undefined;
      const hasValidSponsorshipMetadata =
        typeof sponsorshipId === 'string' &&
        sponsorshipId.length > 0 &&
        typeof payment.sessionId === 'string';
      if (hasValidSponsorshipMetadata) {
        await this.corporateSponsorshipConsumeService.consumeAfterPayment(
          {
            sponsorshipId,
            sessionId: payment.sessionId!,
            paymentId: payment.id,
            paidAmount: captured.amountTotal.toFixed(2),
            currency: captured.currencyCode,
          },
          tx,
        );
      }

      return captured;
    });

    const paymentMetadata = (payment.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const isAcademyProgramEnrollment =
      payment.paymentPurpose === PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT ||
      paymentMetadata.source === 'academy-program-enrollment';

    if (payment.paymentPurpose === PaymentPurpose.SESSION_PACKAGE_PURCHASE) {
      await this.reconcilePackagePurchasePaymentUseCase.execute({
        paymentId: payment.id,
        providerEventRef: input.providerEventRef,
        payload: input.payload,
        payment: updated,
      });

      this.logger.info(
        {
          message: 'Payment marked as succeeded',
          paymentId: payment.id,
          provider: payment.provider,
          providerEventRef: input.providerEventRef,
        },
        undefined,
        'Payments',
      );

      return {
        item: this.paymentMapper.toViewModel(updated),
      };
    }

    if (
      !isAcademyProgramEnrollment &&
      updated.amountFromWallet.gt(0)
    ) {
      await this.customerWalletAccountingService.captureReservationForPayment({
        paymentId: updated.id,
        currencyCode: updated.currencyCode,
      });
    }

    if (!isAcademyProgramEnrollment) {
      await this.redeemCouponUseCase.execute({
        couponId: updated.couponId,
        couponCode: updated.couponCodeSnapshot?.toString() ?? null,
        sessionId: updated.sessionId,
        paymentId: updated.id,
        patientId: updated.patientId ?? '',
        practitionerId: updated.practitionerId ?? null,
        currencyCode: updated.currencyCode,
        grossAmount: updated.amountSubtotal.toString(),
        discountAmount: updated.amountDiscount.toString(),
        couponPlatformSharePercent:
          updated.couponPlatformShareSnapshot?.toString() ?? null,
        couponPractitionerSharePercent:
          updated.couponPractitionerShareSnapshot?.toString() ?? null,
      });
    }

    if (payment.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payment.sessionId },
        select: {
          id: true,
          status: true,
          scheduledStartAt: true,
        },
      });

      if (session && session.status === 'PENDING_PAYMENT') {
        await this.orchestrateSessionPaymentStatusService.markSessionConfirmedFromPayment(
          {
            session,
          },
        );
      }

      await this.sessionEarningReviewService.syncForSessionCompletion({
        sessionId: payment.sessionId,
      });
    }

    if (isAcademyProgramEnrollment) {
      await this.orchestrateAcademyProgramEnrollmentPaymentStatusService.markEnrollmentConfirmedFromPayment(
        payment.id,
      );
    }

    this.logger.info(
      {
        message: 'Payment marked as succeeded',
        paymentId: payment.id,
        provider: payment.provider,
        providerEventRef: input.providerEventRef,
      },
      undefined,
      'Payments',
    );

    if (!isAcademyProgramEnrollment && updated.patientId) {
      await this.operationalNotificationService.notifyPaymentSucceeded({
        patientProfileId: updated.patientId,
        paymentId: updated.id,
        amount: updated.amountTotal.toString(),
        currencyCode: updated.currencyCode,
      });
    }

    return {
      item: this.paymentMapper.toViewModel(updated),
    };
  }

  private resolvePaymobPaymentMethodSnapshot(
    provider: Payment['provider'],
    payload: Record<string, unknown>,
  ): string | null {
    if (provider !== PaymentProvider.PAYMOB) {
      return null;
    }

    const sourceData = payload.source_data;
    if (!sourceData || typeof sourceData !== 'object') {
      return null;
    }

    const source = sourceData as Record<string, unknown>;
    const type = typeof source.type === 'string' ? source.type.trim() : '';
    const subType =
      typeof source.sub_type === 'string' ? source.sub_type.trim() : '';
    const candidate = type || subType;

    return candidate ? candidate.toUpperCase() : null;
  }
}
