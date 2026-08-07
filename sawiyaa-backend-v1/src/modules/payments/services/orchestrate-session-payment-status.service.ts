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
import { SessionSchedulePolicyService } from '@modules/config/services/session-schedule-policy.service';
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
    private readonly sessionSchedulePolicyService: SessionSchedulePolicyService,
  ) {}

  async markSessionConfirmedFromPayment(input: {
    session: {
      id: string;
      status: SessionStatus;
      scheduledStartAt?: Date | null;
      scheduledEndAt?: Date | null;
      scheduleRevision?: number;
    };
    actorUserId?: string | null;
  }) {
    const schedulePolicy = this.sessionSchedulePolicyService.withScheduleRevision(
      await this.sessionSchedulePolicyService.resolve(),
      input.session.scheduleRevision ?? 1,
    );
    const joinOpenAt = input.session.scheduledStartAt
      ? new Date(
          input.session.scheduledStartAt.getTime() -
            schedulePolicy.join.joinEarlyMinutes * 60_000,
        )
      : null;
    const joinCloseAt = input.session.scheduledEndAt
      ? new Date(
          input.session.scheduledEndAt.getTime() +
            schedulePolicy.join.joinAfterEndGraceMinutes * 60_000,
        )
      : null;

    const transitionResult = await this.prisma.$transaction(async (tx) => {
      const result =
        await this.sessionLifecycleService.transitionIfCurrentStatus({
          sessionId: input.session.id,
          expectedStatuses: [SessionStatus.PENDING_PAYMENT],
          to: SessionStatus.UPCOMING,
          actorUserId: input.actorUserId ?? null,
          data: {
            joinOpenAt,
            joinCloseAt,
            schedulePolicySnapshotJson:
              schedulePolicy as unknown as Prisma.InputJsonValue,
          },
          tx,
        });

      if (result.outcome === 'transitioned') {
        await this.sessionRepository.createEvent(
          {
            sessionId: input.session.id,
            eventType: SessionEventType.PAYMENT_CONFIRMED,
            actorUserId: input.actorUserId ?? null,
          },
          tx,
        );
      }

      return result;
    });

    const sessionId = transitionResult.session?.id ?? input.session.id;
    const hydratedSession = await this.sessionRepository.findById(sessionId);
    if (hydratedSession && transitionResult.outcome === 'transitioned') {
      await this.operationalNotificationService.notifySessionConfirmed({
        sessionId: hydratedSession.id,
        patientProfileId: hydratedSession.patient.id,
        practitionerProfileId: hydratedSession.practitioner.id,
        scheduledStartAt: hydratedSession.scheduledStartAt,
        scheduledEndAt: hydratedSession.scheduledEndAt,
        scheduleRevision: hydratedSession.scheduleRevision,
        schedulePolicySnapshot: hydratedSession.schedulePolicySnapshotJson,
      });
    }

    return hydratedSession ?? transitionResult.session;
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

  async markSessionRefunded(sessionId: string, tx?: Prisma.TransactionClient) {
    const session = await this.sessionRepository.findById(sessionId, tx);

    // Refund completion is intentionally orthogonal to Session.status.
    return session;
  }
}
