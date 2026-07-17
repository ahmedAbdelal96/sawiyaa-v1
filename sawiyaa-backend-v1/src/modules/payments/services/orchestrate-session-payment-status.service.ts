import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentStatus,
  Prisma,
  SessionEventType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { ExpireUnpaidSessionUseCase } from '@modules/sessions/use-cases/expire-unpaid-session.use-case';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SESSION_JOIN_LEAD_MINUTES } from '@modules/sessions/utils/session-join-policy.util';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';

/**
 * Session-payment orchestration stays explicit here so payment webhooks do not directly mutate session state ad hoc.
 */
@Injectable()
export class OrchestrateSessionPaymentStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionLifecycleService: SessionLifecycleService,
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
    const joinOpenAt = input.session.scheduledStartAt
      ? new Date(
          input.session.scheduledStartAt.getTime() -
            SESSION_JOIN_LEAD_MINUTES * 60_000,
        )
      : null;

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const session = await this.sessionLifecycleService.transition({
        session: input.session,
        to: SessionStatus.UPCOMING,
        actorUserId: input.actorUserId ?? null,
        data: { joinOpenAt },
        tx,
      });

      await this.sessionRepository.createEvent(
        {
          sessionId: input.session.id,
          eventType: SessionEventType.PAYMENT_CONFIRMED,
          actorUserId: input.actorUserId ?? null,
        },
        tx,
      );

      return session;
    });

    const hydratedSession = await this.sessionRepository.findById(updatedSession.id);
    if (hydratedSession) {
      await this.operationalNotificationService.notifySessionConfirmed({
        sessionId: hydratedSession.id,
        patientProfileId: hydratedSession.patient.id,
        practitionerProfileId: hydratedSession.practitioner.id,
        scheduledStartAt: hydratedSession.scheduledStartAt,
      });
    }

    return hydratedSession ?? updatedSession;
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

  async markSessionRefundPending(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const session = await this.sessionRepository.findById(sessionId, tx);

    // Refund progress is a payment/refund concern, not session lifecycle.
    return session;
  }

  async markSessionRefunded(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const session = await this.sessionRepository.findById(sessionId, tx);

    // Refund completion is intentionally orthogonal to Session.status.
    return session;
  }
}
