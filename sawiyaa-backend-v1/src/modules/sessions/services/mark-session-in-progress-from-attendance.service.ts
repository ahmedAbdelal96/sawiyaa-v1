import { Injectable } from '@nestjs/common';
import { Prisma, SessionStatus } from '@prisma/client';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { SessionRepository } from '../repositories/session.repository';
import { SessionLifecycleService } from './session-lifecycle.service';
import type { TrustedAttendanceEvidence } from '../types/session-attendance.types';

@Injectable()
export class MarkSessionInProgressFromAttendanceService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly lifecycle: SessionLifecycleService,
  ) {}

  async execute(input: {
    evidence: TrustedAttendanceEvidence;
    tx: Prisma.TransactionClient;
  }): Promise<'transitioned' | 'idempotent' | 'skipped'> {
    if (!input.evidence.lifecycleEligible) return 'skipped';

    const session = await this.sessionRepository.findByIdForUpdate(
      input.evidence.sessionId,
      input.tx,
    );
    if (!session) return 'skipped';
    if (session.status === SessionStatus.IN_PROGRESS) return 'idempotent';
    if (
      session.status !== SessionStatus.UPCOMING &&
      session.status !== SessionStatus.READY_TO_JOIN
    ) {
      return 'skipped';
    }

    let current = session;
    if (current.status === SessionStatus.UPCOMING) {
      current = await this.lifecycle.transition({
        session: current,
        to: SessionStatus.READY_TO_JOIN,
        actorType: SecurityAuditActorType.SYSTEM,
        source: SecurityAuditSource.DAILY_WEBHOOK,
        reason: 'trusted_attendance_readiness_recovery',
        at: input.evidence.providerOccurredAt,
        metadata: {
          providerEventId: input.evidence.providerEventId,
          ingestionKey: input.evidence.ingestionKey,
          participantUserId: input.evidence.participantUserId,
          participantRole: input.evidence.participantRole,
        },
        tx: input.tx,
      });
    }

    await this.lifecycle.transition({
      session: current,
      to: SessionStatus.IN_PROGRESS,
      actorType: SecurityAuditActorType.SYSTEM,
      source: SecurityAuditSource.DAILY_WEBHOOK,
      reason: 'trusted_participant_joined',
      at: input.evidence.providerOccurredAt,
      metadata: {
        providerEventId: input.evidence.providerEventId,
        ingestionKey: input.evidence.ingestionKey,
        participantUserId: input.evidence.participantUserId,
        participantRole: input.evidence.participantRole,
        trustLevel: input.evidence.trustLevel,
      },
      tx: input.tx,
    });
    return 'transitioned';
  }
}
