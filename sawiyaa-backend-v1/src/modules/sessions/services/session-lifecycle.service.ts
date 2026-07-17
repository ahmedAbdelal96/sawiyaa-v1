import { Injectable } from '@nestjs/common';
import { Prisma, Session, SessionEventType, SessionStatus } from '@prisma/client';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionStatusTransitionService } from './validate-session-status-transition.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

type LifecycleSession = Pick<Session, 'id' | 'status'>;

/** The sole writer for the canonical Session.status lifecycle. */
@Injectable()
export class SessionLifecycleService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly transitions: ValidateSessionStatusTransitionService,
  ) {}

  async transition<TSession extends LifecycleSession>(input: {
    session: TSession;
    to: SessionStatus;
    tx: Prisma.TransactionClient;
    actorUserId?: string | null;
    actorType?: SecurityAuditActorType;
    actorRoles?: string[];
    source?: SecurityAuditSource | string;
    requestId?: string | null;
    correlationId?: string | null;
    reason?: string | null;
    at?: Date;
    eventType?: SessionEventType;
    metadata?: Prisma.InputJsonObject;
    data?: Omit<Prisma.SessionUncheckedUpdateInput, 'status' | 'completedAt' | 'cancelledAt' | 'expiredAt'>;
  }) {
    if (input.session.status === input.to) return input.session;
    this.transitions.assertCanTransition(input.session.status, input.to);

    const at = input.at ?? new Date();
    const updated = await this.sessionRepository.updateStatus(
      input.session.id,
      {
        ...input.data,
        status: input.to,
        ...(input.to === SessionStatus.COMPLETED ? { completedAt: at } : {}),
        ...(input.to === SessionStatus.CANCELLED ? { cancelledAt: at } : {}),
        ...(input.to === SessionStatus.EXPIRED ? { expiredAt: at } : {}),
      },
      input.tx,
    );
    await this.sessionRepository.createEvent(
      {
        sessionId: input.session.id,
        eventType: input.eventType ?? this.eventFor(input.to),
        actorType:
          input.actorType ??
          (input.actorUserId
            ? SecurityAuditActorType.USER
            : SecurityAuditActorType.SYSTEM),
        actorUserId: input.actorUserId ?? null,
        actorRolesJson: input.actorRoles ?? undefined,
        source:
          input.source ??
          (input.actorUserId
            ? SecurityAuditSource.HTTP_REQUEST
            : SecurityAuditSource.SYSTEM),
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? null,
        reason: input.reason ?? null,
        previousStatus: input.session.status,
        newStatus: input.to,
        occurredAt: at,
        metadataJson: {
          previousStatus: input.session.status,
          nextStatus: input.to,
          ...(input.metadata ?? {}),
        },
      },
      input.tx,
    );
    // Preserve caller-loaded relations while replacing the lifecycle fields.
    return { ...input.session, ...updated } as TSession;
  }

  async transitionIfCurrentStatus(input: {
    sessionId: string;
    expectedStatuses: SessionStatus[];
    to: SessionStatus;
    tx: Prisma.TransactionClient;
    actorUserId?: string | null;
    actorType?: SecurityAuditActorType;
    actorRoles?: string[];
    source?: SecurityAuditSource | string;
    requestId?: string | null;
    correlationId?: string | null;
    reason?: string | null;
    at?: Date;
    eventType?: SessionEventType;
    metadata?: Prisma.InputJsonObject;
    data?: Omit<Prisma.SessionUncheckedUpdateInput, 'status' | 'completedAt' | 'cancelledAt' | 'expiredAt'>;
  }): Promise<{ outcome: 'transitioned' | 'skipped' | 'idempotent'; session: LifecycleSession | null }> {
    const session = await this.sessionRepository.findByIdForUpdate(
      input.sessionId,
      input.tx,
    );
    if (!session) return { outcome: 'skipped', session: null };
    if (session.status === input.to) return { outcome: 'idempotent', session };
    if (!input.expectedStatuses.includes(session.status)) {
      return { outcome: 'skipped', session };
    }

    const transitioned = await this.transition({
      ...input,
      session,
    });
    return { outcome: 'transitioned', session: transitioned };
  }

  private eventFor(status: SessionStatus): SessionEventType {
    switch (status) {
      case SessionStatus.UPCOMING: return SessionEventType.SESSION_CONFIRMED;
      case SessionStatus.READY_TO_JOIN: return SessionEventType.SESSION_READY_TO_JOIN;
      case SessionStatus.IN_PROGRESS: return SessionEventType.SESSION_STARTED;
      case SessionStatus.AWAITING_COMPLETION_CONFIRMATION: return SessionEventType.SESSION_AWAITING_COMPLETION_CONFIRMATION;
      case SessionStatus.COMPLETED: return SessionEventType.SESSION_COMPLETED;
      case SessionStatus.PATIENT_NO_SHOW: return SessionEventType.NO_SHOW_PATIENT;
      case SessionStatus.PRACTITIONER_NO_SHOW:
      case SessionStatus.BOTH_NO_SHOW: return SessionEventType.NO_SHOW_PRACTITIONER;
      case SessionStatus.EXPIRED: return SessionEventType.EXPIRED_UNPAID;
      case SessionStatus.CANCELLED: return SessionEventType.CANCELLED_BY_PATIENT;
      default: return SessionEventType.SESSION_CREATED;
    }
  }
}
