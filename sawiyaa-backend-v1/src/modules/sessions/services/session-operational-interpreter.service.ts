import { Injectable } from '@nestjs/common';
import { SessionMode, SessionStatus } from '@prisma/client';
import { ResolvePatientSessionActionsService } from './resolve-patient-session-actions.service';
import { ResolveSessionJoinReadinessService } from './resolve-session-join-readiness.service';
import {
  SessionOperationalInput,
  SessionOperationalInterpretation,
  SessionOperationalReasonCode,
  SessionOperationalState,
} from '../types/session-operational-interpretation.types';
import type { SessionJoinPolicyResolution } from '../utils/session-join-policy.util';

const TERMINAL_STATES = new Set<SessionStatus>([
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
  SessionStatus.EXPIRED,
]);

/**
 * Canonical operational read boundary. It composes existing policy results and
 * persisted facts; it never transitions a session, records evidence, or causes
 * financial effects. Endpoint migration intentionally happens in Phase 2B.
 */
@Injectable()
export class SessionOperationalInterpreterService {
  constructor(
    private readonly joinReadiness: ResolveSessionJoinReadinessService,
    private readonly patientActions: ResolvePatientSessionActionsService,
  ) {}

  async interpret(
    input: SessionOperationalInput,
  ): Promise<SessionOperationalInterpretation> {
    const now = new Date(input.now.getTime());
    const join = this.joinReadiness.resolve({ ...input.session, now, finalManualDecision: input.finalManualDecision ?? null });
    const state = this.resolveState(input, join);
    const reasonCode = this.resolveReasonCode(input, state);
    const patientActionView = input.actor === 'PATIENT'
      ? input.patientActions ?? await this.patientActions.resolveOne({
          session: input.session,
          finalManualDecision: input.finalManualDecision ?? null,
          now,
        })
      : null;
    const roomState = input.session.sessionMode !== SessionMode.VIDEO
      ? 'NOT_APPLICABLE' as const
      : input.session.videoRoomClosedAt
        ? 'CLOSED' as const
        : input.session.providerRoomId && input.session.providerSessionRef
          ? 'OPEN' as const
          : 'NOT_PREPARED' as const;

    return {
      state,
      timelineBucket: this.resolveTimelineBucket(state),
      reasonCode,
      join: {
        allowed: join.canJoin,
        reasonCode: join.blockedReason,
        canPrepareRuntime: join.canPrepareRuntime,
        opensAt: join.joinOpensAt,
        closesAt: join.joinClosesAt,
      },
      actions: patientActionView
        ? {
            canJoin: patientActionView.canJoin,
            canPrepareRuntime: patientActionView.canPrepareRoom,
            canCancel: patientActionView.canCancel,
            canPay: patientActionView.canPay,
            canReview: patientActionView.canReview,
            canMarkPatientNoShow: false,
            noShowReasonCode: null,
          }
        : {
            // Practitioner sessions expose only non-finalizing commands. Admin
            // completion is intentionally not part of participant contracts.
            canJoin: input.actor === 'PRACTITIONER' && join.canJoin,
            canPrepareRuntime: input.actor === 'PRACTITIONER' && join.canPrepareRuntime,
            canCancel: false,
            canPay: false,
            canReview: false,
            canMarkPatientNoShow: input.practitionerCommandActions?.canMarkPatientNoShow ?? false,
            noShowReasonCode: input.practitionerCommandActions?.noShowReasonCode ?? null,
          },
      attendance: {
        patientTrustedAttendance: input.attendance?.patientTrustedAttendance ?? false,
        practitionerTrustedAttendance: input.attendance?.practitionerTrustedAttendance ?? false,
        reconciliationStatus: input.attendance?.reconciliationStatus ?? 'NOT_AVAILABLE',
        outcomeRecommendation: input.outcomeEvaluation ?? null,
      },
      room: { state: roomState, closedAt: input.session.videoRoomClosedAt },
      resolution: {
        required: state === SessionStatus.AWAITING_ADMIN_RESOLUTION,
        finalDecision: input.finalManualDecision ?? null,
      },
      replacement: { replacesSessionId: input.session.originalSessionId ?? null },
    };
  }

  private resolveState(
    input: SessionOperationalInput,
    join: Pick<SessionJoinPolicyResolution, 'blockedReason'>,
  ): SessionOperationalState {
    // Phase 1 writes this state on room closure. This guard safely interprets
    // legacy inconsistent rows without mutating them or inventing an outcome.
    if (
      input.session.videoRoomClosedAt &&
      !TERMINAL_STATES.has(input.session.status) &&
      input.session.status !== SessionStatus.AWAITING_ADMIN_RESOLUTION
    ) {
      return SessionStatus.AWAITING_ADMIN_RESOLUTION;
    }
    if (
      ( [
        SessionStatus.UPCOMING,
        SessionStatus.READY_TO_JOIN,
        SessionStatus.IN_PROGRESS,
      ] as SessionStatus[]).includes(input.session.status) &&
      join.blockedReason === 'SESSION_JOIN_WINDOW_CLOSED'
    ) {
      // A missed lifecycle sweep must not make an expired session appear
      // actionable. This is a read-only convergence guard; the sweeper still
      // persists the canonical outcome through SessionLifecycleService.
      return SessionStatus.AWAITING_COMPLETION_CONFIRMATION;
    }
    return input.session.status;
  }

  private resolveReasonCode(
    input: SessionOperationalInput,
    state: SessionOperationalState,
  ): SessionOperationalReasonCode {
    if (state === SessionStatus.AWAITING_ADMIN_RESOLUTION) {
      return input.session.videoRoomClosedAt
        ? 'ROOM_CLOSED_OUTCOME_UNRESOLVED'
        : 'ADMIN_RESOLUTION_REQUIRED';
    }
    return input.session.originalSessionId ? 'REPLACED_BY_SUCCESSOR' : 'LIFECYCLE_STATUS';
  }

  private resolveTimelineBucket(state: SessionOperationalState) {
    if (state === SessionStatus.COMPLETED) return 'COMPLETED' as const;
    if (
      state === SessionStatus.CANCELLED ||
      state === SessionStatus.PATIENT_NO_SHOW ||
      state === SessionStatus.PRACTITIONER_NO_SHOW ||
      state === SessionStatus.BOTH_NO_SHOW ||
      state === SessionStatus.EXPIRED ||
      state === SessionStatus.AWAITING_ADMIN_RESOLUTION ||
      state === SessionStatus.AWAITING_COMPLETION_CONFIRMATION
    ) return 'TERMINAL' as const;
    if (
      state === SessionStatus.UPCOMING ||
      state === SessionStatus.READY_TO_JOIN ||
      state === SessionStatus.IN_PROGRESS
    ) return 'ACTIONABLE' as const;
    if (
      state === SessionStatus.PENDING_PAYMENT ||
      state === SessionStatus.PENDING_PRACTITIONER_CONFIRMATION
    ) return 'PENDING' as const;
    return 'OTHER' as const;
  }
}
