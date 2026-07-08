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
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { OrchestrateAcademyProgramEnrollmentPaymentStatusService } from '../services/orchestrate-academy-program-enrollment-payment-status.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { ReconcilePackagePurchasePaymentUseCase } from '@modules/package-plans/use-cases/reconcile-package-purchase-payment.use-case';

@Injectable()
export class MarkPaymentFailedUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly orchestrateAcademyProgramEnrollmentPaymentStatusService: OrchestrateAcademyProgramEnrollmentPaymentStatusService,
    private readonly paymentMapper: PaymentMapper,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
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
      PaymentStatus.FAILED,
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

      const failed = await this.paymentRepository.updateStatus(
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
          eventType:
            this.orchestrateSessionPaymentStatusService.createPaymentEventTypeForFailure(
              'FAILED',
            ),
          providerEventRef: input.providerEventRef,
        },
        tx,
      );

      return failed;
    });

    if (payment.paymentPurpose === PaymentPurpose.SESSION_PACKAGE_PURCHASE) {
      await this.reconcilePackagePurchasePaymentUseCase.execute({
        paymentId: payment.id,
        providerEventRef: input.providerEventRef,
        payload: input.payload,
        payment: updated,
      });

      this.logger.warn(
        {
          message: 'Payment marked as failed',
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

    if (
      payment.paymentPurpose !== PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT &&
      updated.amountFromWallet.gt(0)
    ) {
      await this.customerWalletAccountingService.releaseReservationForPayment({
        paymentId: updated.id,
        currencyCode: updated.currencyCode,
        releaseReason: 'PAYMENT_FAILED',
      });
    }

    this.logger.warn(
      {
        message: 'Payment marked as failed',
        paymentId: payment.id,
        provider: payment.provider,
        providerEventRef: input.providerEventRef,
      },
      'Payments',
    );

    const paymentMetadata = (payment.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const isAcademyEnrollment = paymentMetadata.source === 'academy-enrollment';
    const isAcademyProgramEnrollment =
      payment.paymentPurpose === PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT ||
      paymentMetadata.source === 'academy-program-enrollment';

    if (!isAcademyEnrollment && !isAcademyProgramEnrollment && updated.patientId) {
      await this.operationalNotificationService.notifyPaymentFailed({
        patientProfileId: updated.patientId,
        paymentId: updated.id,
      });
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
          paymentStatus: PaymentStatus.FAILED,
          failedAt: new Date(),
          failedReason:
            typeof paymentMetadata.failureReason === 'string'
              ? paymentMetadata.failureReason.slice(0, 500)
              : null,
        },
      });
    } else if (isAcademyProgramEnrollment) {
      await this.orchestrateAcademyProgramEnrollmentPaymentStatusService.markEnrollmentPaymentFailed(
        payment.id,
      );
    }

    return {
      item: this.paymentMapper.toViewModel(updated),
    };
  }
}
