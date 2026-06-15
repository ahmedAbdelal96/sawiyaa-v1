import { SessionAttendanceEventType, SessionAttendanceParticipantRole } from '@prisma/client';

// =============================================================================
// Raw evidence input types
// =============================================================================

/** A single attendance event from SessionAttendanceEvent table */
export interface AttendanceEvent {
  id: string;
  sessionId: string;
  attendanceEventType: SessionAttendanceEventType;
  participantRole: SessionAttendanceParticipantRole;
  participantUserId: string | null;
  providerEventType: string;
  providerEventRef: string | null;
  providerRoomRef: string | null;
  providerParticipantRef: string | null;
  occurredAt: Date;
  ingestedAt: Date;
}

/** A platform SessionEvent (JOIN_ATTEMPTED, MEETING_STARTED, etc.) */
export interface PlatformEvent {
  id: string;
  sessionId: string;
  eventType: string;
  actorUserId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
}

// =============================================================================
// Presence interval
// =============================================================================

export interface PresenceInterval {
  /** When this participant joined */
  joinedAt: Date;
  /** When this participant left (null if still present) */
  leftAt: Date | null;
  /** Duration in seconds (leftAt - joinedAt). NaN if open interval. */
  durationSeconds: number;
}

// =============================================================================
// Per-role summary
// =============================================================================

export interface RoleAttendanceSummary {
  /** Earliest JOINED event occurredAt for this role */
  firstJoinedAt: Date | null;
  /** Latest LEFT event occurredAt for this role (or open interval close) */
  lastLeftAt: Date | null;
  /** Total seconds across all closed intervals */
  totalPresenceSeconds: number;
  /** All computed presence intervals (real joins only — duplicates excluded) */
  joinedIntervals: PresenceInterval[];
  /** Number of distinct real join intervals (duplicates excluded) */
  joinCount: number;
  /** Number of reconnects: JOINED → LEFT → JOINED pattern (duplicates excluded) */
  reconnectCount: number;
  /** Seconds late relative to scheduledStartAt + grace period */
  lateSeconds: number | null;
  /** Whether this participant joined at or before scheduledStartAt + grace */
  joinedOnTime: boolean;
  /** Whether this participant left before scheduledEndAt */
  leftEarly: boolean;
  /** Whether this participant appears to be a no-show candidate */
  noShowCandidate: boolean;
  /** Whether platform ever recorded a join attempt for this user */
  hadAnyJoinAttempt: boolean;
  /** Whether platform ever recorded a blocked join attempt for this user */
  hadBlockedJoinAttempt: boolean;
  /** Last blocked reason if any */
  lastBlockedReason: string | null;
  /** Number of token issuance events for this user */
  tokenIssuedCount: number;
  /** Whether this role sent a JOINED while already joined */
  hasDuplicateLikeJoinEvents: boolean;
  /** Count of duplicate-like JOINED events for this role */
  duplicateLikeJoinEventCount: number;
}

// =============================================================================
// Meeting bounds
// =============================================================================

export interface MeetingBounds {
  meetingStartedAt: Date | null;
  meetingEndedAt: Date | null;
  /** Earliest participant join across both roles */
  firstAnyParticipantJoinedAt: Date | null;
  /** Latest participant leave across both roles */
  lastAnyParticipantLeftAt: Date | null;
  /** Total observed meeting duration in seconds */
  totalMeetingObservedSeconds: number | null;
  /**
   * How confident we are in the meeting bounds: HIGH/MEDIUM/LOW.
   * HIGH requires MEETING_STARTED/ENDED with valid provider occurredAt.
   * MEDIUM if using backend createdAt as fallback, or only participant events.
   * LOW if timing evidence is incomplete.
   */
  sourceConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// =============================================================================
// Overlap calculation
// =============================================================================

export interface OverlapSummary {
  /** Total seconds both patient and practitioner were present simultaneously */
  overlapSeconds: number;
  /** Total minutes (derived from overlapSeconds) */
  overlapMinutes: number;
  /** Overlap as percentage of scheduled duration (0–100) */
  overlapPercentOfScheduledDuration: number | null;
  /** When the first simultaneous presence began */
  firstOverlapAt: Date | null;
  /** When the last simultaneous presence ended */
  lastOverlapAt: Date | null;
  /** Whether overlap is meaningful for a valid session */
  hasMeaningfulOverlap: boolean;
  /**
   * Confidence flags about the overlap calculation.
   * 'LOW_CONFIDENCE_DURATION_MISSING' — scheduled duration unavailable, used minutes-only threshold.
   */
  confidenceFlags: string[];
}

// =============================================================================
// Evidence quality flags
// =============================================================================

export interface EvidenceFlags {
  /** Total count of SessionAttendanceEvent records */
  attendanceEventCount: number;
  /** Total count of platform join attempts (JOIN_ATTEMPTED events) */
  platformJoinAttemptCount: number;
  /** Count of events with UNKNOWN participant role */
  unknownParticipantEventCount: number;
  /** Count of duplicates ignored via ingestion key */
  duplicateIgnoredCount: number;
  /** Whether events arrived out of occurredAt order */
  hasOutOfOrderEvents: boolean;
  /**
   * Whether a LEFT event arrived without a preceding real JOINED for the same role.
   * Based on interval-builder state, not raw event counts (duplicate JOINED is excluded).
   */
  hasMissingJoinEvent: boolean;
  /**
   * Whether a real JOINED event has no following LEFT and no close boundary was applied.
   * Based on interval-builder state — open intervals with a safe close boundary are excluded.
   */
  hasMissingLeaveEvent: boolean;
  /** Whether only patient joined (practitioner never joined) */
  hasOnlyPatientJoined: boolean;
  /** Whether only practitioner joined (patient never joined) */
  hasOnlyPractitionerJoined: boolean;
  /** Whether no participant events exist at all */
  hasNoParticipants: boolean;
  /** Whether any participant reconnected (JOINED → LEFT → JOINED pattern) */
  hasReconnects: boolean;
  /** Whether any participant sent a JOINED while already joined (duplicate-like) */
  hasDuplicateLikeJoinEvents: boolean;
  /** Count of duplicate-like JOINED events across all roles */
  duplicateLikeJoinEventCount: number;
  /** Whether the session may not be ready for a no-show decision (threshold not passed) */
  hasPrematureDecisionRisk: boolean;
  /** Whether technical issues may have affected the session */
  hasTechnicalRisk: boolean;
  /**
   * Whether any open interval lacks a safe close boundary (meetingEndedAt / scheduledEndAt / input.now).
   * When true, overlap calculation may be unreliable and completion recommendation is withheld.
   */
  hasOpenIntervalsWithoutCloseBoundary: boolean;
  /** Total count of open intervals (leftAt = null) across both roles */
  openIntervalCount: number;
  /**
   * Count of LEFT events that arrived without a preceding real JOINED for the same role.
   * Excludes duplicate JOINED edge cases.
   */
  missingJoinEventCount: number;
  /**
   * Count of real JOINED events that have no following LEFT and no close boundary was applied.
   * Excludes properly closed open intervals.
   */
  missingLeaveEventCount: number;
}

// =============================================================================
// Recommendation
// =============================================================================

export type RecommendedOutcome =
  | 'COMPLETION_CANDIDATE'
  | 'PATIENT_NO_SHOW_CANDIDATE'
  | 'PRACTITIONER_NO_SHOW_CANDIDATE'
  | 'BOTH_NO_SHOW_CANDIDATE'
  | 'TECHNICAL_REVIEW_CANDIDATE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'MANUAL_REVIEW_REQUIRED';

export interface Recommendation {
  recommendedOutcome: RecommendedOutcome;
  recommendedReason: string;
  /** Non-blocking risk flags for the admin to consider */
  riskFlags: string[];
  /** Always false — recommendations are advisory only, not final business decisions */
  isFinalDecision: false;
  /** Whether this outcome requires explicit admin review before acting */
  requiresAdminReview: boolean;
}

// =============================================================================
// Session timing context
// =============================================================================

export interface SessionTimingContext {
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  durationMinutes: number | null;
  joinWindowOpenedAt: Date | null;
  joinWindowClosedAt: Date | null;
}

/**
 * Extended input to the attendance summary engine.
 * Pass user IDs explicitly so platform events can be mapped to roles
 * even when the participant never joined Daily.
 */
export interface AttendanceSummaryInput {
  timing: SessionTimingContext;
  attendanceEvents: AttendanceEvent[];
  platformEvents: PlatformEvent[];
  /** Explicit patient user ID for platform event role mapping */
  patientUserId: string | null;
  /** Explicit practitioner user ID for platform event role mapping */
  practitionerUserId: string | null;
  /**
   * Optional explicit "now" reference for time-gated decisions.
   * When omitted the engine uses meetingEndedAt / scheduledEndAt as boundaries.
   * Must be passed for deterministic test results.
   */
  now?: Date;
}

// =============================================================================
// Full attendance summary output
// =============================================================================

export interface SessionAttendanceSummary {
  session: {
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    durationMinutes: number | null;
    joinWindowOpenedAt: Date | null;
    joinWindowClosedAt: Date | null;
  };
  patient: RoleAttendanceSummary;
  practitioner: RoleAttendanceSummary;
  meeting: MeetingBounds;
  overlap: OverlapSummary;
  evidence: EvidenceFlags;
  recommendation: Recommendation;
}
