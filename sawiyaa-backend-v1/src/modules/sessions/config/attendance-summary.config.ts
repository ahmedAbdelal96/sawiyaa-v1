/**
 * Centralized policy thresholds for the Attendance Summary Engine.
 *
 * These thresholds are used ONLY for recommendation flags and evidence
 * quality signals. They do NOT make final business decisions.
 *
 * All values are in minutes unless otherwise specified.
 */

export const ATTENDANCE_SUMMARY_THRESHOLDS = {
  /** Patient is considered late if they join more than this many minutes after scheduledStartAt */
  PATIENT_LATE_AFTER_MINUTES: 5,

  /** Practitioner is considered late if they join more than this many minutes after scheduledStartAt */
  PRACTITIONER_LATE_AFTER_MINUTES: 5,

  /**
   * Patient is a no-show candidate if they have not joined within this many minutes
   * after the scheduled start AND the meeting has started.
   */
  PATIENT_NO_SHOW_AFTER_MINUTES: 15,

  /**
   * Practitioner is a no-show candidate if they have not joined within this many minutes
   * after the scheduled start AND the meeting has started.
   */
  PRACTITIONER_NO_SHOW_AFTER_MINUTES: 10,

  /**
   * Minimum overlap (as percentage of scheduled duration) for the session to be
   * considered a valid completion candidate.
   */
  MIN_OVERLAP_FOR_COMPLETION_PERCENT: 70,

  /**
   * Minimum absolute overlap in minutes for the session to be considered a
   * valid completion candidate.
   */
  MIN_OVERLAP_FOR_COMPLETION_MINUTES: 20,

  /**
   * If a participant rejoins within this many minutes after leaving, it is treated
   * as a technical reconnect rather than a new session.
   */
  TECHNICAL_REJOIN_GAP_MINUTES: 3,

  /**
   * Maximum number of reconnects before the session is flagged for technical review.
   */
  MAX_RECONNECT_COUNT_BEFORE_TECHNICAL_FLAG: 3,
} as const;

export type AttendanceSummaryThresholds = typeof ATTENDANCE_SUMMARY_THRESHOLDS;

/**
 * Phase 2 policy snapshot used by the outcome evaluator. Attendance thresholds
 * remain owned by this canonical code policy; finalization grace preserves the
 * existing sweeper ENV contract and is resolved by the read-only orchestrator.
 */
export const DEFAULT_SESSION_FINALIZATION_GRACE_MINUTES = 15;

export function resolveSessionFinalizationGraceMinutes(): number {
  const configured = Number.parseInt(
    process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_GRACE_MINUTES ?? '',
    10,
  );
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_SESSION_FINALIZATION_GRACE_MINUTES;
}
