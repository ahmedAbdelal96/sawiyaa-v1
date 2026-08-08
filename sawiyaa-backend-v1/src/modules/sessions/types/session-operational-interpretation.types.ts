import {
  SessionAdminDecisionType,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { SessionJoinBlockedReason } from './session-video.types';
import { SessionOutcomeEvaluationResult } from './session-outcome-evaluation.types';
import type { PatientSessionActionsViewModel } from '../services/resolve-patient-session-actions.service';

/**
 * A read-only, actor-neutral interpretation of persisted Session facts.  It is
 * deliberately not a persistence model and must never be used as evidence or
 * as an input to financial settlement.
 */
export type SessionOperationalState = SessionStatus;

export type SessionOperationalReasonCode =
  | 'LIFECYCLE_STATUS'
  | 'ROOM_CLOSED_OUTCOME_UNRESOLVED'
  | 'ADMIN_RESOLUTION_REQUIRED'
  | 'REPLACED_BY_SUCCESSOR';

export type SessionOperationalActor = 'PATIENT' | 'PRACTITIONER' | 'ADMIN';

export type SessionOperationalInput = {
  session: {
    id: string;
    status: SessionStatus;
    flowType: SessionFlowType;
    sessionMode: SessionMode;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    joinOpenAt: Date | null;
    joinCloseAt: Date | null;
    expiresAt: Date | null;
    provider: SessionProvider;
    providerRoomId: string | null;
    providerSessionRef: string | null;
    videoRoomClosedAt: Date | null;
    cancelledAt?: Date | null;
    originalSessionId?: string | null;
  };
  actor: SessionOperationalActor;
  now: Date;
  /** A decision is a decision, not evidence; it does not override lifecycle. */
  finalManualDecision?: SessionAdminDecisionType | null;
  attendance?: {
    patientTrustedAttendance: boolean;
    practitionerTrustedAttendance: boolean;
    reconciliationStatus: 'NOT_AVAILABLE' | 'CONFIRMED' | 'UNCERTAIN';
  };
  /** Existing evaluator output supplied by its owner; never recomputed here. */
  outcomeEvaluation?: Pick<
    SessionOutcomeEvaluationResult,
    'classification' | 'confidence' | 'recommendedTerminalStatus' | 'reasonCodes'
  > | null;
  /** Batch-resolved by list callers to avoid per-row review/cancellation reads. */
  patientActions?: PatientSessionActionsViewModel;
  practitionerCommandActions?: {
    canComplete: boolean;
    canMarkPatientNoShow: boolean;
    noShowReasonCode: string | null;
  };
};

export type SessionOperationalInterpretation = {
  state: SessionOperationalState;
  reasonCode: SessionOperationalReasonCode;
  join: {
    allowed: boolean;
    reasonCode: SessionJoinBlockedReason | null;
    canPrepareRuntime: boolean;
  };
  actions: {
    canJoin: boolean;
    canPrepareRuntime: boolean;
    canCancel: boolean;
    canPay: boolean;
    canReview: boolean;
    canComplete: boolean;
    canMarkPatientNoShow: boolean;
    noShowReasonCode: string | null;
  };
  attendance: {
    patientTrustedAttendance: boolean;
    practitionerTrustedAttendance: boolean;
    reconciliationStatus: 'NOT_AVAILABLE' | 'CONFIRMED' | 'UNCERTAIN';
    outcomeRecommendation: Pick<
      SessionOutcomeEvaluationResult,
      'classification' | 'confidence' | 'recommendedTerminalStatus' | 'reasonCodes'
    > | null;
  };
  room: {
    state: 'NOT_APPLICABLE' | 'OPEN' | 'CLOSED' | 'NOT_PREPARED';
    closedAt: Date | null;
  };
  resolution: {
    required: boolean;
    finalDecision: SessionAdminDecisionType | null;
  };
  replacement: {
    replacesSessionId: string | null;
  };
};
