import { SessionStatus } from '@prisma/client';

export type SessionOutcomeClassification =
  | 'COMPLETION_CANDIDATE'
  | 'PATIENT_NO_SHOW_CANDIDATE'
  | 'PRACTITIONER_NO_SHOW_CANDIDATE'
  | 'BOTH_NO_SHOW_CANDIDATE'
  | 'NEEDS_ADMIN_REVIEW'
  | 'NOT_READY_FOR_EVALUATION';

export type SessionOutcomeConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED';

export type SessionOutcomeReasonCode =
  | 'COMPLETION_OVERLAP_THRESHOLD_MET'
  | 'MINIMUM_OVERLAP_THRESHOLD_MET'
  | 'COMPLETION_OVERLAP_THRESHOLD_NOT_MET'
  | 'MINIMUM_OVERLAP_THRESHOLD_NOT_MET'
  | 'PATIENT_ATTENDANCE_CONFIRMED'
  | 'PRACTITIONER_ATTENDANCE_CONFIRMED'
  | 'PATIENT_NOT_PRESENT'
  | 'PRACTITIONER_NOT_PRESENT'
  | 'BOTH_PARTICIPANTS_NOT_PRESENT'
  | 'PATIENT_NO_SHOW_GRACE_ELAPSED'
  | 'PRACTITIONER_NO_SHOW_GRACE_ELAPSED'
  | 'PATIENT_NO_SHOW_GRACE_NOT_ELAPSED'
  | 'PRACTITIONER_NO_SHOW_GRACE_NOT_ELAPSED'
  | 'FINALIZATION_GRACE_NOT_ELAPSED'
  | 'SESSION_NOT_ENDED'
  | 'SESSION_ALREADY_TERMINAL'
  | 'SESSION_CANCELLED'
  | 'SESSION_EXPIRED'
  | 'SESSION_STATUS_NOT_ELIGIBLE'
  | 'UNTRUSTED_EVIDENCE'
  | 'UNKNOWN_PARTICIPANT_PRESENT'
  | 'IDENTITY_AMBIGUITY'
  | 'MISSING_LEAVE'
  | 'OPEN_ATTENDANCE_INTERVAL'
  | 'OUT_OF_ORDER_EVIDENCE'
  | 'CONFLICTING_EVIDENCE'
  | 'MEETING_BOUNDS_UNKNOWN'
  | 'PROVIDER_OUTAGE'
  | 'ROOM_CREATION_FAILURE'
  | 'RECONCILIATION_NOT_AVAILABLE'
  | 'EVIDENCE_INCOMPLETE'
  | 'LATE_EVIDENCE_RISK'
  | 'RECONCILIATION_CONFLICT'
  | 'PROVIDER_HEALTH_UNKNOWN'
  | 'ROOM_NOT_FOUND'
  | 'LATE_EVIDENCE_WINDOW_NOT_ELAPSED'
  | 'POLICY_SNAPSHOT_MISSING';

export type SessionOutcomeEvaluationPolicy = {
  completionOverlapPercent: number;
  minimumOverlapMinutes: number;
  patientNoShowGraceMinutes: number;
  practitionerNoShowGraceMinutes: number;
  finalizationGraceMinutes: number;
  lateEvidenceWaitingMinutes?: number;
};

export type SessionOutcomeEvaluationInput = {
  session: {
    id: string;
    status: SessionStatus;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    durationMinutes: number;
    patientId: string;
    practitionerId: string;
    cancelledAt?: Date | null;
  };
  attendance: {
    patientPresenceSeconds: number;
    practitionerPresenceSeconds: number;
    overlapSeconds: number;
    patientTrustedJoinCount: number;
    practitionerTrustedJoinCount: number;
    unknownParticipantCount: number;
    hasOpenIntervals: boolean;
    hasMissingLeave: boolean;
    hasOutOfOrderEvidence: boolean;
    hasConflictingEvidence: boolean;
    hasIdentityAmbiguity: boolean;
    hasEvidenceOutsideWindow: boolean;
  };
  providerHealth: {
    webhookAuthenticated: boolean;
    evidenceSourceTrusted: boolean;
    meetingBoundsKnown: boolean;
    providerOutageKnown: boolean;
    roomCreationFailed: boolean;
    reconciliationCompleted: boolean;
    reconciliationHealthyForNoShow?: boolean;
    reconciliationConflict?: boolean;
  };
  policy: SessionOutcomeEvaluationPolicy;
  policySnapshotPresent?: boolean;
  evaluatedAt: Date;
};

export type SessionOutcomeEvaluationResult = {
  classification: SessionOutcomeClassification;
  confidence: SessionOutcomeConfidence;
  eligibleForAdminApproval: boolean;
  recommendedTerminalStatus:
    | 'COMPLETED'
    | 'PATIENT_NO_SHOW'
    | 'PRACTITIONER_NO_SHOW'
    | 'BOTH_NO_SHOW'
    | null;
  reasonCodes: SessionOutcomeReasonCode[];
  evidenceSummary: {
    sessionDurationMinutes: number;
    patientPresenceMinutes: number;
    practitionerPresenceMinutes: number;
    overlapMinutes: number;
    overlapPercentage: number;
  };
  policySnapshot: SessionOutcomeEvaluationPolicy;
  evaluatedAt: Date;
};

/** Backend-owned decision boundary consumed by Admin review clients. */
export type SessionReviewDecision = {
  canApproveNormally: boolean;
  requiresResolution: boolean;
  reasonCode: string;
  recommendation: string;
};
