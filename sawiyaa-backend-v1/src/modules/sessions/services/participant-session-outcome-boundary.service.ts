import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
  SessionStatus,
} from '@prisma/client';
import { SessionRepository } from '../repositories/session.repository';
import { SessionOutcomePolicySnapshotService } from './session-outcome-policy-snapshot.service';

export type ParticipantOutcomeDecision =
  | { kind: 'ALLOW' }
  | { kind: 'REJECT'; error: string; messageKey: string }
  | { kind: 'REQUIRES_ADMIN_RESOLUTION'; reason: string };

/**
 * The single decision boundary for participant-initiated outcomes. It does not
 * write Session.status; callers must lock the session and mutate through
 * SessionLifecycleService only after receiving an ALLOW decision.
 */
@Injectable()
export class ParticipantSessionOutcomeBoundaryService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly outcomePolicySnapshotService: SessionOutcomePolicySnapshotService,
  ) {}

  async decidePatientNoShow(input: {
    session: { id: string; status: SessionStatus; scheduledStartAt: Date | null };
    tx?: Prisma.TransactionClient;
    now: Date;
  }): Promise<ParticipantOutcomeDecision> {
    if (this.isTerminal(input.session.status)) {
      return {
        kind: 'REJECT',
        error: input.session.status === SessionStatus.PATIENT_NO_SHOW
          ? 'SESSION_ALREADY_NO_SHOW'
          : 'SESSION_OUTCOME_ALREADY_TERMINAL',
        messageKey: input.session.status === SessionStatus.PATIENT_NO_SHOW
          ? 'sessions.errors.sessionAlreadyNoShow'
          : 'sessions.errors.sessionOutcomeAlreadyTerminal',
      };
    }

    if (input.session.status === SessionStatus.AWAITING_ADMIN_RESOLUTION) {
      return {
        kind: 'REQUIRES_ADMIN_RESOLUTION',
        reason: 'SESSION_ALREADY_AWAITING_ADMIN_RESOLUTION',
      };
    }

    if (!input.session.scheduledStartAt) {
      return {
        kind: 'REQUIRES_ADMIN_RESOLUTION',
        reason: 'SESSION_SCHEDULE_MISSING',
      };
    }

    const policy = await this.outcomePolicySnapshotService.getForSession(
      input.session.id,
      input.tx,
    );
    if (!policy) {
      return {
        kind: 'REQUIRES_ADMIN_RESOLUTION',
        reason: 'OUTCOME_POLICY_SNAPSHOT_MISSING',
      };
    }

    const noShowAt = new Date(
      input.session.scheduledStartAt.getTime() +
        policy.patientNoShowGraceMinutes * 60_000,
    );
    if (input.now < noShowAt) {
      return {
        kind: 'REJECT',
        error: 'SESSION_NO_SHOW_GRACE_NOT_ELAPSED',
        messageKey: 'sessions.errors.sessionNoShowGraceNotElapsed',
      };
    }

    const [events, reconciliation] = await Promise.all([
      this.sessionRepository.listAttendanceEventsBySessionId(input.session.id, input.tx),
      this.sessionRepository.findLatestAttendanceReconciliation(input.session.id, input.tx),
    ]);
    const trustedJoins = events.filter((event) =>
      event.attendanceEventType === SessionAttendanceEventType.JOINED &&
      event.ingestionMetaJson &&
      typeof event.ingestionMetaJson === 'object' &&
      (event.ingestionMetaJson as Record<string, unknown>).trustLevel === 'TRUSTED',
    );
    const patientTrustedAttendance = trustedJoins.some(
      (event) => event.participantRole === SessionAttendanceParticipantRole.PATIENT,
    );
    const practitionerTrustedAttendance = trustedJoins.some(
      (event) => event.participantRole === SessionAttendanceParticipantRole.PRACTITIONER,
    );
    const reconciliationConfirmed = reconciliation?.status === 'CONFIRMED' &&
      reconciliation.evaluationStale === false;

    if (patientTrustedAttendance || (reconciliationConfirmed && reconciliation!.patientJoined)) {
      return {
        kind: 'REJECT',
        error: 'SESSION_PATIENT_ATTENDANCE_CONFIRMED',
        messageKey: 'sessions.errors.sessionPatientAttendanceConfirmed',
      };
    }

    // Platform authorisation events are intentionally not consulted: a token or
    // JOIN_ALLOWED proves neither presence nor absence.
    if (
      reconciliationConfirmed &&
      reconciliation!.patientIdentityConfirmed &&
      !reconciliation.patientJoined &&
      reconciliation.practitionerIdentityConfirmed &&
      reconciliation.practitionerJoined &&
      practitionerTrustedAttendance &&
      reconciliation.unknownParticipantCount === 0
    ) {
      return { kind: 'ALLOW' };
    }

    return {
      kind: 'REQUIRES_ADMIN_RESOLUTION',
      reason: reconciliation
        ? 'ATTENDANCE_RECONCILIATION_INSUFFICIENT_OR_CONFLICTING'
        : 'ATTENDANCE_RECONCILIATION_NOT_AVAILABLE',
    };
  }

  decideRoomClosure(input: { status: SessionStatus }): ParticipantOutcomeDecision {
    if (this.isTerminal(input.status)) {
      return {
        kind: 'REJECT',
        error: 'SESSION_OUTCOME_ALREADY_TERMINAL',
        messageKey: 'sessions.errors.sessionOutcomeAlreadyTerminal',
      };
    }
    if (input.status === SessionStatus.AWAITING_ADMIN_RESOLUTION) {
      return { kind: 'REQUIRES_ADMIN_RESOLUTION', reason: 'SESSION_ALREADY_AWAITING_ADMIN_RESOLUTION' };
    }
    return { kind: 'REQUIRES_ADMIN_RESOLUTION', reason: 'ROOM_CLOSED_OUTCOME_UNRESOLVED' };
  }

  private isTerminal(status: SessionStatus): boolean {
    const terminalStatuses: SessionStatus[] = [
      SessionStatus.COMPLETED,
      SessionStatus.CANCELLED,
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
      SessionStatus.EXPIRED,
    ];
    return terminalStatuses.includes(status);
  }
}
