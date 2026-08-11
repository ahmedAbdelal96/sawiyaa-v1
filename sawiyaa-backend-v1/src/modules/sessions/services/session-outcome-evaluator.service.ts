import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import {
  SessionOutcomeEvaluationInput,
  SessionOutcomeEvaluationResult,
  SessionOutcomeReasonCode,
} from '../types/session-outcome-evaluation.types';

const TERMINAL_STATUSES = new Set<SessionStatus>([
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
  SessionStatus.EXPIRED,
]);

const EVALUABLE_STATUSES = new Set<SessionStatus>([
  SessionStatus.IN_PROGRESS,
  SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
]);

/** Pure Phase 2 classification boundary. It never writes lifecycle state. */
@Injectable()
export class SessionOutcomeEvaluator {
  evaluate(
    input: SessionOutcomeEvaluationInput,
  ): SessionOutcomeEvaluationResult {
    const evidenceSummary = this.buildEvidenceSummary(input);
    const policySnapshot = { ...input.policy };

    const notReady = (
      reasonCodes: SessionOutcomeReasonCode[],
    ): SessionOutcomeEvaluationResult =>
      this.result(input, evidenceSummary, policySnapshot, {
        classification: 'NOT_READY_FOR_EVALUATION',
        confidence: 'LOW',
        eligibleForAdminApproval: false,
        recommendedTerminalStatus: null,
        reasonCodes,
      });

    if (TERMINAL_STATUSES.has(input.session.status)) {
      return notReady([
        input.session.status === SessionStatus.CANCELLED
          ? 'SESSION_CANCELLED'
          : input.session.status === SessionStatus.EXPIRED
            ? 'SESSION_EXPIRED'
            : 'SESSION_ALREADY_TERMINAL',
      ]);
    }

    if (!EVALUABLE_STATUSES.has(input.session.status)) {
      return notReady(['SESSION_STATUS_NOT_ELIGIBLE']);
    }

    if (input.session.cancelledAt) {
      return notReady(['SESSION_CANCELLED']);
    }

    if (input.policySnapshotPresent === false) {
      return notReady(['POLICY_SNAPSHOT_MISSING']);
    }

    if (!input.session.scheduledStartAt || !input.session.scheduledEndAt) {
      return notReady(['EVIDENCE_INCOMPLETE', 'SESSION_NOT_ENDED']);
    }

    const finalizationAt = new Date(
      input.session.scheduledEndAt.getTime() +
        (input.policy.finalizationGraceMinutes +
          (input.policy.lateEvidenceWaitingMinutes ?? 0)) *
          60_000,
    );
    if (input.evaluatedAt < input.session.scheduledEndAt) {
      return notReady(['SESSION_NOT_ENDED']);
    }
    if (input.evaluatedAt < finalizationAt) {
      return notReady(['FINALIZATION_GRACE_NOT_ELAPSED']);
    }

    const technicalReasons = this.technicalReasonCodes(input);
    if (technicalReasons.length > 0) {
      return this.review(
        input,
        evidenceSummary,
        policySnapshot,
        technicalReasons,
        input.providerHealth.webhookAuthenticated &&
          input.providerHealth.evidenceSourceTrusted
          ? 'MEDIUM'
          : 'UNTRUSTED',
      );
    }

    const patientPresent = input.attendance.patientTrustedJoinCount > 0;
    const practitionerPresent =
      input.attendance.practitionerTrustedJoinCount > 0;
    const noShowReasons: SessionOutcomeReasonCode[] = [];
    if (patientPresent) noShowReasons.push('PATIENT_ATTENDANCE_CONFIRMED');
    else noShowReasons.push('PATIENT_NOT_PRESENT');
    if (practitionerPresent) {
      noShowReasons.push('PRACTITIONER_ATTENDANCE_CONFIRMED');
    } else {
      noShowReasons.push('PRACTITIONER_NOT_PRESENT');
    }

    if (!patientPresent && !practitionerPresent) {
      noShowReasons.push('BOTH_PARTICIPANTS_NOT_PRESENT');
      if (!this.isGraceElapsed(input, input.policy.patientNoShowGraceMinutes)) {
        noShowReasons.push('PATIENT_NO_SHOW_GRACE_NOT_ELAPSED');
      }
      if (
        !this.isGraceElapsed(input, input.policy.practitionerNoShowGraceMinutes)
      ) {
        noShowReasons.push('PRACTITIONER_NO_SHOW_GRACE_NOT_ELAPSED');
      }
      if (noShowReasons.some((reason) => reason.endsWith('NOT_ELAPSED'))) {
        return this.result(input, evidenceSummary, policySnapshot, {
          classification: 'NOT_READY_FOR_EVALUATION',
          confidence: 'LOW',
          eligibleForAdminApproval: false,
          recommendedTerminalStatus: null,
          reasonCodes: noShowReasons,
        });
      }
      if (this.hasStrongNoShowProviderHealth(input)) {
        noShowReasons.push(
          'PATIENT_NO_SHOW_GRACE_ELAPSED',
          'PRACTITIONER_NO_SHOW_GRACE_ELAPSED',
        );
        return this.reviewWithRecommendation(
          input,
          evidenceSummary,
          policySnapshot,
          'BOTH_NO_SHOW',
          noShowReasons,
          'HIGH',
        );
      }
      return this.review(
        input,
        evidenceSummary,
        policySnapshot,
        [...noShowReasons, 'RECONCILIATION_NOT_AVAILABLE'],
        'MEDIUM',
      );
    }

    if (!patientPresent && practitionerPresent) {
      if (!this.isGraceElapsed(input, input.policy.patientNoShowGraceMinutes)) {
        return this.result(input, evidenceSummary, policySnapshot, {
          classification: 'NOT_READY_FOR_EVALUATION',
          confidence: 'LOW',
          eligibleForAdminApproval: false,
          recommendedTerminalStatus: null,
          reasonCodes: [...noShowReasons, 'PATIENT_NO_SHOW_GRACE_NOT_ELAPSED'],
        });
      }
      return this.reviewWithRecommendation(
        input,
        evidenceSummary,
        policySnapshot,
        'PATIENT_NO_SHOW',
        [...noShowReasons, 'PATIENT_NO_SHOW_GRACE_ELAPSED', ...(input.providerHealth.reconciliationCompleted ? [] : ['RECONCILIATION_NOT_AVAILABLE'])] as SessionOutcomeReasonCode[],
        input.providerHealth.reconciliationCompleted ? 'HIGH' : 'MEDIUM',
      );
    }

    if (patientPresent && !practitionerPresent) {
      if (
        !this.isGraceElapsed(input, input.policy.practitionerNoShowGraceMinutes)
      ) {
        return this.result(input, evidenceSummary, policySnapshot, {
          classification: 'NOT_READY_FOR_EVALUATION',
          confidence: 'LOW',
          eligibleForAdminApproval: false,
          recommendedTerminalStatus: null,
          reasonCodes: [
            ...noShowReasons,
            'PRACTITIONER_NO_SHOW_GRACE_NOT_ELAPSED',
          ],
        });
      }
      return this.reviewWithRecommendation(
        input,
        evidenceSummary,
        policySnapshot,
        'PRACTITIONER_NO_SHOW',
        [...noShowReasons, 'PRACTITIONER_NO_SHOW_GRACE_ELAPSED', ...(input.providerHealth.reconciliationCompleted ? [] : ['RECONCILIATION_NOT_AVAILABLE'])] as SessionOutcomeReasonCode[],
        input.providerHealth.reconciliationCompleted ? 'HIGH' : 'MEDIUM',
      );
    }

    const overlapPercentage =
      input.session.durationMinutes > 0
        ? (input.attendance.overlapSeconds /
            (input.session.durationMinutes * 60)) *
          100
        : 0;
    const completionReasons: SessionOutcomeReasonCode[] = [
      'PATIENT_ATTENDANCE_CONFIRMED',
      'PRACTITIONER_ATTENDANCE_CONFIRMED',
      overlapPercentage >= input.policy.completionOverlapPercent
        ? 'COMPLETION_OVERLAP_THRESHOLD_MET'
        : 'COMPLETION_OVERLAP_THRESHOLD_NOT_MET',
      input.attendance.overlapSeconds >= input.policy.minimumOverlapMinutes * 60
        ? 'MINIMUM_OVERLAP_THRESHOLD_MET'
        : 'MINIMUM_OVERLAP_THRESHOLD_NOT_MET',
    ];
    const completionPassed =
      overlapPercentage >= input.policy.completionOverlapPercent &&
      input.attendance.overlapSeconds >=
        input.policy.minimumOverlapMinutes * 60;
    if (completionPassed) {
      return this.candidate(
        input,
        evidenceSummary,
        policySnapshot,
        'COMPLETION_CANDIDATE',
        'COMPLETED',
        completionReasons,
      );
    }
    return this.review(
      input,
      evidenceSummary,
      policySnapshot,
      completionReasons,
      'MEDIUM',
    );
  }

  private technicalReasonCodes(
    input: SessionOutcomeEvaluationInput,
  ): SessionOutcomeReasonCode[] {
    const reasons: SessionOutcomeReasonCode[] = [];
    const health = input.providerHealth;
    const attendance = input.attendance;
    if (!health.webhookAuthenticated || !health.evidenceSourceTrusted) {
      reasons.push('UNTRUSTED_EVIDENCE');
    }
    if (attendance.unknownParticipantCount > 0) {
      reasons.push('UNKNOWN_PARTICIPANT_PRESENT');
    }
    if (attendance.hasIdentityAmbiguity) reasons.push('IDENTITY_AMBIGUITY');
    if (attendance.hasOpenIntervals) reasons.push('OPEN_ATTENDANCE_INTERVAL');
    if (attendance.hasMissingLeave) reasons.push('MISSING_LEAVE');
    if (attendance.hasOutOfOrderEvidence) reasons.push('OUT_OF_ORDER_EVIDENCE');
    if (attendance.hasConflictingEvidence) reasons.push('CONFLICTING_EVIDENCE');
    if (attendance.hasEvidenceOutsideWindow) reasons.push('LATE_EVIDENCE_RISK');
    if (!health.meetingBoundsKnown) reasons.push('MEETING_BOUNDS_UNKNOWN');
    if (health.providerOutageKnown) reasons.push('PROVIDER_OUTAGE');
    if (health.roomCreationFailed) reasons.push('ROOM_CREATION_FAILURE');
    if (health.reconciliationConflict) reasons.push('RECONCILIATION_CONFLICT');
    return reasons;
  }

  private hasStrongNoShowProviderHealth(
    input: SessionOutcomeEvaluationInput,
  ): boolean {
    const health = input.providerHealth;
    return (
      health.webhookAuthenticated &&
      health.evidenceSourceTrusted &&
      health.meetingBoundsKnown &&
      !health.providerOutageKnown &&
      !health.roomCreationFailed &&
      health.reconciliationCompleted
    );
  }

  private isGraceElapsed(
    input: SessionOutcomeEvaluationInput,
    graceMinutes: number,
  ): boolean {
    if (!input.session.scheduledStartAt) return false;
    return (
      input.evaluatedAt.getTime() >=
      input.session.scheduledStartAt.getTime() + graceMinutes * 60_000
    );
  }

  private candidate(
    input: SessionOutcomeEvaluationInput,
    evidenceSummary: SessionOutcomeEvaluationResult['evidenceSummary'],
    policySnapshot: SessionOutcomeEvaluationResult['policySnapshot'],
    classification: SessionOutcomeEvaluationResult['classification'],
    recommendedTerminalStatus: NonNullable<
      SessionOutcomeEvaluationResult['recommendedTerminalStatus']
    >,
    reasonCodes: SessionOutcomeReasonCode[],
  ): SessionOutcomeEvaluationResult {
    return this.result(input, evidenceSummary, policySnapshot, {
      classification,
      confidence: 'HIGH',
      eligibleForAdminApproval: true,
      recommendedTerminalStatus,
      reasonCodes,
    });
  }

  private noShowCandidate(
    input: SessionOutcomeEvaluationInput,
    evidenceSummary: SessionOutcomeEvaluationResult['evidenceSummary'],
    policySnapshot: SessionOutcomeEvaluationResult['policySnapshot'],
    classification: SessionOutcomeEvaluationResult['classification'],
    recommendedTerminalStatus: NonNullable<
      SessionOutcomeEvaluationResult['recommendedTerminalStatus']
    >,
    reasonCodes: SessionOutcomeReasonCode[],
  ): SessionOutcomeEvaluationResult {
    const reconciliationConfirmed =
      input.providerHealth.reconciliationCompleted;
    return this.result(input, evidenceSummary, policySnapshot, {
      classification,
      confidence: reconciliationConfirmed ? 'HIGH' : 'MEDIUM',
      eligibleForAdminApproval: reconciliationConfirmed,
      recommendedTerminalStatus,
      reasonCodes: reconciliationConfirmed
        ? reasonCodes
        : [...reasonCodes, 'RECONCILIATION_NOT_AVAILABLE'],
    });
  }

  private reviewWithRecommendation(
    input: SessionOutcomeEvaluationInput,
    evidenceSummary: SessionOutcomeEvaluationResult['evidenceSummary'],
    policySnapshot: SessionOutcomeEvaluationResult['policySnapshot'],
    recommendedTerminalStatus: NonNullable<SessionOutcomeEvaluationResult['recommendedTerminalStatus']>,
    reasonCodes: SessionOutcomeReasonCode[],
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED',
  ): SessionOutcomeEvaluationResult {
    return {
      ...this.result(input, evidenceSummary, policySnapshot, {
        classification: 'NEEDS_ADMIN_REVIEW',
        confidence,
        eligibleForAdminApproval: false,
        recommendedTerminalStatus,
        reasonCodes,
      }),
    };
  }

  private review(
    input: SessionOutcomeEvaluationInput,
    evidenceSummary: SessionOutcomeEvaluationResult['evidenceSummary'],
    policySnapshot: SessionOutcomeEvaluationResult['policySnapshot'],
    reasonCodes: SessionOutcomeReasonCode[],
    confidence: 'MEDIUM' | 'LOW' | 'UNTRUSTED',
  ): SessionOutcomeEvaluationResult {
    return this.result(input, evidenceSummary, policySnapshot, {
      classification: 'NEEDS_ADMIN_REVIEW',
      confidence,
        eligibleForAdminApproval: false,
      recommendedTerminalStatus: null,
      reasonCodes,
    });
  }

  private result(
    input: SessionOutcomeEvaluationInput,
    evidenceSummary: SessionOutcomeEvaluationResult['evidenceSummary'],
    policySnapshot: SessionOutcomeEvaluationResult['policySnapshot'],
    result: Pick<
      SessionOutcomeEvaluationResult,
      | 'classification'
      | 'confidence'
      | 'eligibleForAdminApproval'
      | 'recommendedTerminalStatus'
      | 'reasonCodes'
    >,
  ): SessionOutcomeEvaluationResult {
    return {
      ...result,
      evidenceSummary,
      policySnapshot,
      evaluatedAt: new Date(input.evaluatedAt.getTime()),
    };
  }

  private buildEvidenceSummary(
    input: SessionOutcomeEvaluationInput,
  ): SessionOutcomeEvaluationResult['evidenceSummary'] {
    const duration = input.session.durationMinutes;
    return {
      sessionDurationMinutes: duration,
      patientPresenceMinutes: input.attendance.patientPresenceSeconds / 60,
      practitionerPresenceMinutes:
        input.attendance.practitionerPresenceSeconds / 60,
      overlapMinutes: input.attendance.overlapSeconds / 60,
      overlapPercentage:
        duration > 0
          ? (input.attendance.overlapSeconds / (duration * 60)) * 100
          : 0,
    };
  }
}
