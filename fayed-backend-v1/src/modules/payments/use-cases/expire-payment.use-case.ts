import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
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

    if (payment.sessionId) {
      await this.orchestrateSessionPaymentStatusService.expireSessionFromPayment(
        payment.sessionId,
      );
    }

    if (payment.paymentPurpose === PaymentPurpose.COURSE_ENROLLMENT) {
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
