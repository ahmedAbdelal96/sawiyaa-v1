import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentStatus,
  SessionEventType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { ExpireUnpaidSessionUseCase } from '@modules/sessions/use-cases/expire-unpaid-session.use-case';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SESSION_JOIN_LEAD_MINUTES } from '@modules/sessions/utils/session-join-policy.util';
import { ValidateSessionStatusTransitionService } from '@modules/sessions/services/validate-session-status-transition.service';

/**
 * Session-payment orchestration stays explicit here so payment webhooks do not directly mutate session state ad hoc.
 */
@Injectable()
export class OrchestrateSessionPaymentStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
    private readonly expireUnpaidSessionUseCase: ExpireUnpaidSessionUseCase,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async markSessionConfirmedFromPayment(input: {
    session: {
      id: string;
      status: SessionStatus;
      scheduledStartAt?: Date | null;
    };
    actorUserId?: string | null;
  }) {
    this.validateSessionStatusTransitionService.assertCanTransition(
      input.session.status,
      SessionStatus.CONFIRMED,
    );

    const joinOpenAt = input.session.scheduledStartAt
      ? new Date(
          input.session.scheduledStartAt.getTime() -
            SESSION_JOIN_LEAD_MINUTES * 60_000,
        )
      : null;

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const session = await this.sessionRepository.updateStatus(
        input.session.id,
        {
          status: SessionStatus.CONFIRMED,
          joinOpenAt,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: input.session.id,
          eventType: SessionEventType.PAYMENT_CONFIRMED,
          actorUserId: input.actorUserId ?? null,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: input.session.id,
          eventType: SessionEventType.SESSION_CONFIRMED,
          actorUserId: input.actorUserId ?? null,
        },
        tx,
      );

      return session;
    });

    await this.operationalNotificationService.notifySessionConfirmed({
      sessionId: updatedSession.id,
      patientProfileId: updatedSession.patient.id,
      practitionerProfileId: updatedSession.practitioner.id,
      scheduledStartAt: updatedSession.scheduledStartAt,
    });

    return updatedSession;
  }

  async expireSessionFromPayment(sessionId: string) {
    return this.expireUnpaidSessionUseCase.execute({ sessionId });
  }

  createPaymentEventTypeForFailure(
    outcome: 'FAILED' | 'EXPIRED',
  ): PaymentEventType {
    return outcome === 'EXPIRED'
      ? PaymentEventType.PAYMENT_EXPIRED
      : PaymentEventType.PAYMENT_FAILED;
  }

  toPaymentStatus(outcome: 'SUCCEEDED' | 'FAILED' | 'EXPIRED'): PaymentStatus {
    switch (outcome) {
      case 'SUCCEEDED':
        return PaymentStatus.CAPTURED;
      case 'EXPIRED':
        return PaymentStatus.EXPIRED;
      case 'FAILED':
      default:
        return PaymentStatus.FAILED;
    }
  }

  async markSessionRefundPending(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (
      !session ||
      session.status === SessionStatus.REFUND_PENDING ||
      session.status === SessionStatus.REFUNDED
    ) {
      return session;
    }

    this.validateSessionStatusTransitionService.assertCanTransition(
      session.status,
      SessionStatus.REFUND_PENDING,
    );

    return this.sessionRepository.updateStatus(sessionId, {
      status: SessionStatus.REFUND_PENDING,
    });
  }

  async markSessionRefunded(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.status === SessionStatus.REFUNDED) {
      return session;
    }

    if (session.status !== SessionStatus.REFUND_PENDING) {
      this.validateSessionStatusTransitionService.assertCanTransition(
        session.status,
        SessionStatus.REFUND_PENDING,
      );

      await this.sessionRepository.updateStatus(sessionId, {
        status: SessionStatus.REFUND_PENDING,
      });
    }

    this.validateSessionStatusTransitionService.assertCanTransition(
      SessionStatus.REFUND_PENDING,
      SessionStatus.REFUNDED,
    );

    return this.sessionRepository.updateStatus(sessionId, {
      status: SessionStatus.REFUNDED,
    });
  }
}
