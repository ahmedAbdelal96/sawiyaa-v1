import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionEventType, SessionStatus } from '@prisma/client';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { SessionSchedulePolicyService } from '@modules/config/services/session-schedule-policy.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class RescheduleSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionRepository,
    private readonly schedulePolicy: SessionSchedulePolicyService,
    private readonly notifications: OperationalNotificationService,
  ) {}

  /**
   * Rebuilds the authoritative schedule as one revision. Existing jobs keep
   * their old revision and the reminder worker safely no-ops them.
   */
  async execute(input: {
    sessionId: string;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    actorUserId?: string | null;
    actorType?: SecurityAuditActorType;
    source?: SecurityAuditSource | string | null;
    requestId?: string | null;
    correlationId?: string | null;
    reason?: string | null;
  }) {
    if (
      Number.isNaN(input.scheduledStartAt.getTime()) ||
      Number.isNaN(input.scheduledEndAt.getTime()) ||
      input.scheduledEndAt <= input.scheduledStartAt
    ) {
      throw new ConflictException({ error: 'SESSION_RESCHEDULE_TIME_INVALID' });
    }

    const current = await this.sessions.findById(input.sessionId);
    if (!current) throw new NotFoundException({ error: 'SESSION_NOT_FOUND' });
    if (
      !(
        [
          SessionStatus.PENDING_PAYMENT,
          SessionStatus.UPCOMING,
          SessionStatus.READY_TO_JOIN,
        ] as SessionStatus[]
      ).includes(current.status)
    ) {
      throw new ConflictException({ error: 'SESSION_NOT_RESCHEDULABLE' });
    }

    const policy = this.schedulePolicy.withScheduleRevision(
      await this.schedulePolicy.resolve(),
      current.scheduleRevision + 1,
    );
    const joinOpenAt = new Date(
      input.scheduledStartAt.getTime() - policy.join.joinEarlyMinutes * 60_000,
    );
    const joinCloseAt = new Date(
      input.scheduledEndAt.getTime() +
        policy.join.joinAfterEndGraceMinutes * 60_000,
    );

    await this.prisma.$transaction(async (tx) => {
      const locked = await this.sessions.findByIdForUpdate(input.sessionId, tx);
      if (!locked || locked.scheduleRevision !== current.scheduleRevision) {
        throw new ConflictException({ error: 'SESSION_SCHEDULE_CHANGED' });
      }
      await this.sessions.updateStatus(
        input.sessionId,
        {
          scheduledStartAt: input.scheduledStartAt,
          scheduledEndAt: input.scheduledEndAt,
          joinOpenAt,
          joinCloseAt,
          scheduleRevision: policy.scheduleRevision,
          schedulePolicySnapshotJson: policy as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      const previousStartAt = locked.scheduledStartAt?.toISOString() ?? null;
      const previousEndAt = locked.scheduledEndAt?.toISOString() ?? null;
      const nextStartAt = input.scheduledStartAt.toISOString();
      const nextEndAt = input.scheduledEndAt.toISOString();
      await this.sessions.createEvent(
        {
          sessionId: input.sessionId,
          eventType: SessionEventType.RESCHEDULED,
          actorType:
            input.actorType ??
            (input.actorUserId
              ? SecurityAuditActorType.USER
              : SecurityAuditActorType.SYSTEM),
          actorUserId: input.actorUserId ?? null,
          source: input.source ??
            (input.actorUserId
              ? SecurityAuditSource.HTTP_REQUEST
              : SecurityAuditSource.SYSTEM),
          requestId: input.requestId ?? null,
          correlationId: input.correlationId ?? null,
          reason: input.reason ?? null,
          occurredAt: new Date(),
          metadataJson: {
            previousStartAt,
            previousEndAt,
            newStartAt: nextStartAt,
            newEndAt: nextEndAt,
            previousScheduledStartAt: previousStartAt,
            previousScheduledEndAt: previousEndAt,
            newScheduledStartAt: nextStartAt,
            newScheduledEndAt: nextEndAt,
            scheduleRevision: policy.scheduleRevision,
          },
        },
        tx,
      );
    });

    const updated = await this.sessions.findById(input.sessionId);
    if (!updated) throw new NotFoundException({ error: 'SESSION_NOT_FOUND' });
    await this.notifications.queueSessionReminders({
      sessionId: updated.id,
      patientProfileId: updated.patient.id,
      practitionerProfileId: updated.practitioner.id,
      scheduledStartAt: updated.scheduledStartAt,
      scheduledEndAt: updated.scheduledEndAt,
      scheduleRevision: updated.scheduleRevision,
      schedulePolicySnapshot: updated.schedulePolicySnapshotJson,
    });
    return updated;
  }
}
