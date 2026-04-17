import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PostPaymentLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-payment-ledger-entries.use-case';
import { RedeemCouponUseCase } from '@modules/financial-rules/use-cases/redeem-coupon.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { OrchestrateTrainingEnrollmentPaymentStatusService } from '../services/orchestrate-training-enrollment-payment-status.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';

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
    private readonly redeemCouponUseCase: RedeemCouponUseCase,
    private readonly operationalNotificationService: OperationalNotificationService,
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

    await this.redeemCouponUseCase.execute({
      couponId: updated.couponId,
      sessionId: updated.sessionId,
      paymentId: updated.id,
      patientId: updated.patientId,
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

    if (payment.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payment.sessionId },
        select: {
          id: true,
          status: true,
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

    if (payment.paymentPurpose === PaymentPurpose.COURSE_ENROLLMENT) {
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

    await this.operationalNotificationService.notifyPaymentSucceeded({
      patientProfileId: updated.patientId,
      paymentId: updated.id,
      amount: updated.amountTotal.toString(),
      currencyCode: updated.currencyCode,
    });

    return {
      item: this.paymentMapper.toViewModel(updated),
    };
  }
}
