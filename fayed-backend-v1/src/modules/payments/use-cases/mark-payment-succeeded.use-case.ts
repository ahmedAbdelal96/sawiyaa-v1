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
import { PostPaymentLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-payment-ledger-entries.use-case';
import { RedeemCouponUseCase } from '@modules/financial-rules/use-cases/redeem-coupon.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { AcademyEnrollmentStatus } from '@prisma/client';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { OrchestrateTrainingEnrollmentPaymentStatusService } from '../services/orchestrate-training-enrollment-payment-status.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { ReconcilePackagePurchasePaymentUseCase } from '@modules/package-plans/use-cases/reconcile-package-purchase-payment.use-case';

@Injectable()
export class MarkPaymentSucceededUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly orchestrateTrainingEnrollmentPaymentStatusService: OrchestrateTrainingEnrollmentPaymentStatusService,
    private readonly paymentMapper: PaymentMapper,
    private readonly postPaymentLedgerEntriesUseCase: PostPaymentLedgerEntriesUseCase,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly redeemCouponUseCase: RedeemCouponUseCase,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly reconcilePackagePurchasePaymentUseCase: ReconcilePackagePurchasePaymentUseCase,
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
        },
        tx,
      );

      return captured;
    });

    const paymentMetadata = (payment.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const isAcademyEnrollment = paymentMetadata.source === 'academy-enrollment';

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

    if (!isAcademyEnrollment && updated.amountFromWallet.gt(0)) {
      await this.customerWalletAccountingService.captureReservationForPayment({
        paymentId: updated.id,
        currencyCode: updated.currencyCode,
      });
    }

    if (!isAcademyEnrollment) {
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

      await this.postPaymentLedgerEntriesUseCase.execute({
        paymentId: updated.id,
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
    }

    if (isAcademyEnrollment) {
      await this.prisma.academyEnrollment.updateMany({
        where: {
          paymentId: payment.id,
          enrollmentStatus: {
            in: [
              AcademyEnrollmentStatus.PENDING_PAYMENT,
              AcademyEnrollmentStatus.PAYMENT_FAILED,
            ],
          },
        },
        data: {
          enrollmentStatus: AcademyEnrollmentStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          confirmedAt: new Date(),
          failedAt: null,
          failedReason: null,
        },
      });
    } else if (payment.paymentPurpose === PaymentPurpose.COURSE_ENROLLMENT) {
      await this.orchestrateTrainingEnrollmentPaymentStatusService.markEnrollmentActiveFromPayment(
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

    if (!isAcademyEnrollment && updated.patientId) {
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
