import {
  ATTENDANCE_SUMMARY_THRESHOLDS,
  resolveSessionFinalizationGraceMinutes,
} from './attendance-summary.config';
import {
  SESSION_OUTCOME_POLICY_VERSION,
  type SessionOutcomePolicySnapshotInput,
} from '../types/session-outcome-policy-snapshot.types';

/** One explicit runtime policy resolver; snapshots are the historical authority. */
export function resolveCurrentSessionOutcomePolicy(
  capturedAt = new Date(),
): SessionOutcomePolicySnapshotInput {
  return {
    version: SESSION_OUTCOME_POLICY_VERSION,
    completionOverlapPercent:
      ATTENDANCE_SUMMARY_THRESHOLDS.MIN_OVERLAP_FOR_COMPLETION_PERCENT,
    minimumOverlapMinutes:
      ATTENDANCE_SUMMARY_THRESHOLDS.MIN_OVERLAP_FOR_COMPLETION_MINUTES,
    patientNoShowGraceMinutes:
      ATTENDANCE_SUMMARY_THRESHOLDS.PATIENT_NO_SHOW_AFTER_MINUTES,
    practitionerNoShowGraceMinutes:
      ATTENDANCE_SUMMARY_THRESHOLDS.PRACTITIONER_NO_SHOW_AFTER_MINUTES,
    finalizationGraceMinutes: resolveSessionFinalizationGraceMinutes(),
    // Finalization grace is the existing late-evidence hold in this phase;
    // keeping this explicit prevents accidental double counting.
    lateEvidenceWaitingMinutes: 0,
    capturedAt,
    source: 'session-outcome-policy-v1',
  };
}
