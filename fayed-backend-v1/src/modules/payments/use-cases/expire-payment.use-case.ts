import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  AcademyEnrollmentStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { ReconcilePackagePurchasePaymentUseCase } from '@modules/package-plans/use-cases/reconcile-package-purchase-payment.use-case';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { OrchestrateTrainingEnrollmentPaymentStatusService } from '../services/orchestrate-training-enrollment-payment-status.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';

@Injectable()
export class ExpirePaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly orchestrateTrainingEnrollmentPaymentStatusService: OrchestrateTrainingEnrollmentPaymentStatusService,
    private readonly paymentMapper: PaymentMapper,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
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
      PaymentStatus.EXPIRED,
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

      const expired = await this.paymentRepository.updateStatus(
        payment.id,
        {
          status: PaymentStatus.EXPIRED,
          expiredAt: new Date(),
        },
        tx,
      );

      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.PAYMENT_EXPIRED,
          providerEventRef: input.providerEventRef,
        },
        tx,
      );

      return expired;
    });

    const paymentMetadata = (payment.metadataJson ?? {}) as Record<string, unknown>;
    const isAcademyEnrollment =
      paymentMetadata.source === 'academy-enrollment';

    if (payment.paymentPurpose === PaymentPurpose.SESSION_PACKAGE_PURCHASE) {
      await this.reconcilePackagePurchasePaymentUseCase.execute({
        paymentId: payment.id,
        providerEventRef: input.providerEventRef,
        payload: input.payload,
        payment: updated,
      });

      this.logger.warn(
        {
          message: 'Payment expired',
          paymentId: payment.id,
          provider: payment.provider,
          providerEventRef: input.providerEventRef,
        },
        'Payments',
      );

      return {
        item: this.paymentMapper.toViewModel(updated),
      };
    }

    if (updated.amountFromWallet.gt(0)) {
      await this.customerWalletAccountingService.releaseReservationForPayment({
        paymentId: updated.id,
        currencyCode: updated.currencyCode,
        releaseReason: 'PAYMENT_EXPIRED',
      });
    }

    if (payment.sessionId) {
      await this.orchestrateSessionPaymentStatusService.expireSessionFromPayment(
        payment.sessionId,
      );
    }

    if (isAcademyEnrollment) {
      await this.prisma.academyEnrollment.updateMany({
        where: {
          paymentId: payment.id,
          enrollmentStatus: {
            in: [
              AcademyEnrollmentStatus.PENDING_PAYMENT,
              AcademyEnrollmentStatus.PAID,
            ],
          },
        },
        data: {
          enrollmentStatus: AcademyEnrollmentStatus.PAYMENT_FAILED,
          paymentStatus: PaymentStatus.EXPIRED,
          failedAt: new Date(),
          failedReason: 'Payment expired',
        },
      });
    } else if (payment.paymentPurpose === PaymentPurpose.COURSE_ENROLLMENT) {
      await this.orchestrateTrainingEnrollmentPaymentStatusService.markEnrollmentPaymentExpired(
        payment.id,
      );
    }

    this.logger.warn(
      {
        message: 'Payment expired',
        paymentId: payment.id,
        provider: payment.provider,
        providerEventRef: input.providerEventRef,
      },
      'Payments',
    );

    return {
      item: this.paymentMapper.toViewModel(updated),
    };
  }
}
