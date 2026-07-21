import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, SessionStatus } from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentSessionRepository } from '../repositories/payment-session.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';

@Injectable()
export class ReconcileSessionPaymentReturnUseCase {
  constructor(
    private readonly paymentSessionRepository: PaymentSessionRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly paymentMapper: PaymentMapper,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    providerReference?: string | null;
    redirectStatus?: string | null;
    success?: boolean | null;
    pending?: boolean | null;
  }) {
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

    const isProviderSuccess =
      input.redirectStatus === 'succeeded' ||
      (input.success === true && input.pending === false);

    if (!isProviderSuccess) {
      return {
        item: null,
        reconciled: false,
      };
    }

    const payment =
      (input.providerReference?.trim()
        ? await this.paymentRepository.findByProviderReference(
            PaymentProvider.PAYMOB,
            input.providerReference.trim(),
          )
        : null) ??
      (await this.paymentRepository.findLatestActiveBySessionId(session.id)) ??
      (await this.paymentRepository.findSuccessfulBySessionId(session.id));

    if (!payment) {
      this.logger.warn(
        {
          message:
            'Unable to reconcile payment return because no payment was found',
          sessionId: session.id,
          providerReference: input.providerReference ?? null,
          redirectStatus: input.redirectStatus ?? null,
        },
        'Payments',
      );

      return {
        item: null,
        reconciled: false,
      };
    }

    if (
      payment.status === PaymentStatus.CAPTURED ||
      payment.status === PaymentStatus.AUTHORIZED
    ) {
      if (session.status === SessionStatus.PENDING_PAYMENT) {
        await this.orchestrateSessionPaymentStatusService.markSessionConfirmedFromPayment(
          {
            session: {
              id: session.id,
              status: session.status,
              scheduledStartAt: session.scheduledStartAt,
            },
          },
        );
      }

      const refreshed = await this.paymentRepository.findById(payment.id);

      return {
        item: this.paymentMapper.toViewModel(refreshed ?? payment),
        reconciled: true,
      };
    }

    return {
      // A browser redirect is not proof of settlement. The payment webhook
      // must provide the provider amount/currency and perform the capture.
      item: this.paymentMapper.toViewModel(payment),
      reconciled: false,
    };
  }
}
