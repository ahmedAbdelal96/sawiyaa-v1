import { SessionStatus } from '@prisma/client';
import { SessionOutcomeEvaluator } from './session-outcome-evaluator.service';
import type { SessionOutcomeEvaluationInput } from '../types/session-outcome-evaluation.types';

describe('SessionOutcomeEvaluator', () => {
  const evaluator = new SessionOutcomeEvaluator();
  const evaluatedAt = new Date('2026-08-03T11:00:00.000Z');
  const policy = {
    completionOverlapPercent: 70,
    minimumOverlapMinutes: 20,
    patientNoShowGraceMinutes: 15,
    practitionerNoShowGraceMinutes: 10,
    finalizationGraceMinutes: 15,
  };

  type InputOverrides = {
    session?: Partial<SessionOutcomeEvaluationInput['session']>;
    attendance?: Partial<SessionOutcomeEvaluationInput['attendance']>;
    providerHealth?: Partial<SessionOutcomeEvaluationInput['providerHealth']>;
    policy?: Partial<SessionOutcomeEvaluationInput['policy']>;
    evaluatedAt?: Date;
  };

  function input(
    overrides: InputOverrides = {},
  ): SessionOutcomeEvaluationInput {
    return {
      session: {
        id: 'session-1',
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        scheduledStartAt: new Date('2026-08-03T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-08-03T10:30:00.000Z'),
        durationMinutes: 30,
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        cancelledAt: null,
        ...overrides.session,
      },
      attendance: {
        patientPresenceSeconds: 1_800,
        practitionerPresenceSeconds: 1_800,
        overlapSeconds: 1_260,
        patientTrustedJoinCount: 1,
        practitionerTrustedJoinCount: 1,
        unknownParticipantCount: 0,
        hasOpenIntervals: false,
        hasMissingLeave: false,
        hasOutOfOrderEvidence: false,
        hasConflictingEvidence: false,
        hasIdentityAmbiguity: false,
        hasEvidenceOutsideWindow: false,
        ...overrides.attendance,
      },
      providerHealth: {
        webhookAuthenticated: true,
        evidenceSourceTrusted: true,
        meetingBoundsKnown: true,
        providerOutageKnown: false,
        roomCreationFailed: false,
        reconciliationCompleted: true,
        ...overrides.providerHealth,
      },
      policy: { ...policy, ...overrides.policy },
      evaluatedAt: overrides.evaluatedAt ?? evaluatedAt,
    };
  }

  it('returns the same result for the same input and never mutates it', () => {
    const source = input();
    const first = evaluator.evaluate(source);
    const second = evaluator.evaluate(source);

    expect(second).toEqual(first);
    expect(source.session.status).toBe(
      SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
    );
  });

  it('classifies exact inclusive completion thresholds as auto-completable', () => {
    const result = evaluator.evaluate(
      input({
        attendance: {
          overlapSeconds: 1_260,
        },
      }),
    );

    expect(result.classification).toBe('COMPLETION_CANDIDATE');
    expect(result.eligibleForAdminApproval).toBe(true);
    expect(result.recommendedTerminalStatus).toBe('COMPLETED');
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining([
        'COMPLETION_OVERLAP_THRESHOLD_MET',
        'MINIMUM_OVERLAP_THRESHOLD_MET',
      ]),
    );
  });

  it('routes insufficient overlap to review', () => {
    const result = evaluator.evaluate(
      input({ attendance: { overlapSeconds: 1_200 } }),
    );

    expect(result.classification).toBe('NEEDS_ADMIN_REVIEW');
    expect(result.eligibleForAdminApproval).toBe(false);
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining(['COMPLETION_OVERLAP_THRESHOLD_NOT_MET']),
    );
  });

  it('routes completion before finalization grace to not ready', () => {
    const result = evaluator.evaluate(
      input({
        evaluatedAt: new Date('2026-08-03T10:44:59.999Z'),
      }),
    );

    expect(result.classification).toBe('NOT_READY_FOR_EVALUATION');
    expect(result.reasonCodes).toEqual(['FINALIZATION_GRACE_NOT_ELAPSED']);
  });

  it('classifies a healthy patient no-show after grace', () => {
    const result = evaluator.evaluate(
      input({
        attendance: {
          patientTrustedJoinCount: 0,
          practitionerTrustedJoinCount: 1,
          overlapSeconds: 0,
        },
      }),
    );

    expect(result.classification).toBe('NEEDS_ADMIN_REVIEW');
    expect(result.eligibleForAdminApproval).toBe(false);
    expect(result.recommendedTerminalStatus).toBe('PATIENT_NO_SHOW');
  });

  it('keeps one-party no-show advisory when reconciliation is unavailable', () => {
    const result = evaluator.evaluate(
      input({
        attendance: {
          patientTrustedJoinCount: 0,
          practitionerTrustedJoinCount: 1,
          overlapSeconds: 0,
        },
        providerHealth: { reconciliationCompleted: false },
      }),
    );

    expect(result.classification).toBe('NEEDS_ADMIN_REVIEW');
    expect(result.confidence).toBe('MEDIUM');
    expect(result.eligibleForAdminApproval).toBe(false);
    expect(result.reasonCodes).toContain('RECONCILIATION_NOT_AVAILABLE');
  });

  it('classifies a healthy practitioner no-show after grace', () => {
    const result = evaluator.evaluate(
      input({
        attendance: {
          patientTrustedJoinCount: 1,
          practitionerTrustedJoinCount: 0,
          overlapSeconds: 0,
        },
      }),
    );

    expect(result.classification).toBe('NEEDS_ADMIN_REVIEW');
    expect(result.eligibleForAdminApproval).toBe(false);
    expect(result.recommendedTerminalStatus).toBe('PRACTITIONER_NO_SHOW');
  });

  it('does not infer both no-show when provider health is not proven', () => {
    const result = evaluator.evaluate(
      input({
        attendance: {
          patientTrustedJoinCount: 0,
          practitionerTrustedJoinCount: 0,
          overlapSeconds: 0,
        },
        providerHealth: { reconciliationCompleted: false },
      }),
    );

    expect(result.classification).toBe('NEEDS_ADMIN_REVIEW');
    expect(result.recommendedTerminalStatus).toBeNull();
    expect(result.reasonCodes).toContain('RECONCILIATION_NOT_AVAILABLE');
  });

  it('routes identity, open-interval, and provider risks to review before success', () => {
    const result = evaluator.evaluate(
      input({
        attendance: {
          unknownParticipantCount: 1,
          hasOpenIntervals: true,
        },
      }),
    );

    expect(result.classification).toBe('NEEDS_ADMIN_REVIEW');
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining([
        'UNKNOWN_PARTICIPANT_PRESENT',
        'OPEN_ATTENDANCE_INTERVAL',
      ]),
    );
  });

  it.each([
    SessionStatus.UPCOMING,
    SessionStatus.READY_TO_JOIN,
    SessionStatus.IN_PROGRESS,
  ])('does not evaluate %s before the scheduled end', (status) => {
    const result = evaluator.evaluate(
      input({
        session: { status },
        evaluatedAt: new Date('2026-08-03T10:29:59.999Z'),
      }),
    );

    expect(result.classification).toBe('NOT_READY_FOR_EVALUATION');
  });

  it.each([
    SessionStatus.COMPLETED,
    SessionStatus.CANCELLED,
    SessionStatus.EXPIRED,
    SessionStatus.PATIENT_NO_SHOW,
    SessionStatus.PRACTITIONER_NO_SHOW,
    SessionStatus.BOTH_NO_SHOW,
  ])('does not evaluate terminal status %s', (status) => {
    const result = evaluator.evaluate(input({ session: { status } }));

    expect(result.classification).toBe('NOT_READY_FOR_EVALUATION');
    expect(result.eligibleForAdminApproval).toBe(false);
  });
});
