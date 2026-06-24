import { SessionAttendanceEventType, SessionAttendanceParticipantRole } from '@prisma/client';
import { summarizeSessionAttendance } from './attendance-summary.engine';
import type { AttendanceEvent, PlatformEvent, SessionTimingContext } from '../types/attendance-summary.types';

const PATIENT = SessionAttendanceParticipantRole.PATIENT;
const PRACTITIONER = SessionAttendanceParticipantRole.PRACTITIONER;
const UNKNOWN = SessionAttendanceParticipantRole.UNKNOWN;
const JOINED = SessionAttendanceEventType.JOINED;
const LEFT = SessionAttendanceEventType.LEFT;

function makeTiming(overrides: Partial<SessionTimingContext> = {}): SessionTimingContext {
  return {
    scheduledStartAt: new Date('2024-01-01T10:00:00Z'),
    scheduledEndAt: new Date('2024-01-01T11:00:00Z'),
    durationMinutes: 60,
    joinWindowOpenedAt: new Date('2024-01-01T09:58:00Z'),
    joinWindowClosedAt: new Date('2024-01-01T11:02:00Z'),
    ...overrides,
  };
}

function attEvent(
  type: SessionAttendanceEventType,
  role: SessionAttendanceParticipantRole,
  occurredAt: Date,
  userId: string | null = 'user-1',
): AttendanceEvent {
  return {
    id: `att-${Math.random().toString(36).slice(2)}`,
    sessionId: 'session-1',
    attendanceEventType: type,
    participantRole: role,
    participantUserId: userId,
    providerEventType: type === JOINED ? 'participant-joined' : 'participant-left',
    providerEventRef: 'ref-1',
    providerRoomRef: 'room-1',
    providerParticipantRef: 'ref-1',
    occurredAt,
    ingestedAt: new Date(occurredAt.getTime() + 100),
  };
}

function platEvent(
  type: string,
  actorUserId: string | null = 'user-1',
  createdAt: Date = new Date(),
  metadataJson: Record<string, unknown> | null = null,
): PlatformEvent {
  return {
    id: `plat-${Math.random().toString(36).slice(2)}`,
    sessionId: 'session-1',
    eventType: type,
    actorUserId,
    metadataJson,
    createdAt,
  };
}

function callEngine(
  timing: SessionTimingContext,
  attendanceEvents: AttendanceEvent[],
  platformEvents: PlatformEvent[],
  opts: { patientUserId?: string | null; practitionerUserId?: string | null; now?: Date } = {},
) {
  return summarizeSessionAttendance({
    timing,
    attendanceEvents,
    platformEvents,
    patientUserId: opts.patientUserId ?? 'patient-1',
    practitionerUserId: opts.practitionerUserId ?? 'pract-1',
    now: opts.now,
  });
}

describe('summarizeSessionAttendance', () => {
  // =============================================================================
  // GROUP 1: Duplicate JOINED handling
  // =============================================================================
  describe('duplicate JOINED handling', () => {
    it('duplicate JOINED while already joined does NOT create two intervals', () => {
      const timing = makeTiming();
      // Patient sends JOINED at 10:00, then another JOINED at 10:01 (duplicate), then LEFT at 10:30
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'), // duplicate
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      // Should have exactly 1 interval, not 2
      expect(result.patient.joinedIntervals).toHaveLength(1);
      expect(result.patient.joinCount).toBe(1);
      expect(result.patient.reconnectCount).toBe(0);
    });

    it('duplicate JOINED does not double-count duration', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'), // duplicate
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      // Duration should be 30 min (10:00–10:30), not doubled
      expect(result.patient.totalPresenceSeconds).toBe(30 * 60);
    });

    it('duplicate JOINED does not create reconnectCount', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'), // duplicate
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.reconnectCount).toBe(0);
      expect(result.patient.duplicateLikeJoinEventCount).toBe(1);
      expect(result.patient.hasDuplicateLikeJoinEvents).toBe(true);
    });

    it('duplicate JOINED does not falsely increase overlap', () => {
      const timing = makeTiming();
      // Patient: 10:00–10:30 (with duplicate at 10:01)
      // Practitioner: 10:00–10:30
      // Overlap should be 30 min, not 60 min
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      expect(result.overlap.overlapMinutes).toBe(30);
      expect(result.overlap.overlapPercentOfScheduledDuration).toBe(50);
    });

    it('hasDuplicateLikeJoinEvents is set correctly', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      expect(result.evidence.hasDuplicateLikeJoinEvents).toBe(true);
      expect(result.evidence.duplicateLikeJoinEventCount).toBe(1);
      expect(result.recommendation.riskFlags).toContain('DUPLICATE_LIKE_JOIN_EVENTS');
    });

    it('real reconnect (JOINED→LEFT→JOINED) still creates two intervals', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:20:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:25:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.joinedIntervals).toHaveLength(2);
      expect(result.patient.joinCount).toBe(2);
      expect(result.patient.reconnectCount).toBe(1);
      expect(result.patient.duplicateLikeJoinEventCount).toBe(0);
    });
  });

  // =============================================================================
  // GROUP 2: joinCount / reconnectCount definition
  // =============================================================================
  describe('joinCount and reconnectCount', () => {
    it('JOINED → JOINED(duplicate) → LEFT: joinCount=1, reconnectCount=0', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.joinCount).toBe(1);
      expect(result.patient.reconnectCount).toBe(0);
    });

    it('JOINED → LEFT → JOINED → LEFT: joinCount=2, reconnectCount=1', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:10:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:15:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:40:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:40:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.joinCount).toBe(2);
      expect(result.patient.reconnectCount).toBe(1);
    });
  });

  // =============================================================================
  // GROUP 3: Platform event role mapping
  // =============================================================================
  describe('platform event role mapping', () => {
    it('patient no-show but patient had JOIN_ATTEMPTED is reflected in patient.hadAnyJoinAttempt', () => {
      const timing = makeTiming();
      // No attendance events from patient, but platform has JOIN_ATTEMPTED
      const result = callEngine(timing, [
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('JOIN_ATTEMPTED', 'patient-1', new Date('2024-01-01T09:59:00Z')),
      ], { patientUserId: 'patient-1', practitionerUserId: 'pract-1' });

      expect(result.patient.hadAnyJoinAttempt).toBe(true);
      expect(result.patient.joinCount).toBe(0);
    });

    it('practitioner no-show but practitioner had JOIN_BLOCKED is reflected in practitioner.hadBlockedJoinAttempt', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
      ], [
        platEvent('JOIN_BLOCKED', 'pract-1', new Date('2024-01-01T09:59:00Z'), {
          blockedReason: 'SESSION_NOT_STARTED',
        }),
      ], { patientUserId: 'patient-1', practitionerUserId: 'pract-1' });

      expect(result.practitioner.hadBlockedJoinAttempt).toBe(true);
      expect(result.practitioner.lastBlockedReason).toBe('SESSION_NOT_STARTED');
    });

    it('tokenIssuedCount works even if participant never joined Daily', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('JOIN_TOKEN_ISSUED', 'patient-1', new Date('2024-01-01T09:59:00Z')),
        platEvent('JOIN_TOKEN_ISSUED', 'patient-1', new Date('2024-01-01T10:00:30Z')),
      ], { patientUserId: 'patient-1', practitionerUserId: 'pract-1' });

      expect(result.patient.tokenIssuedCount).toBe(2);
      expect(result.patient.joinCount).toBe(0);
    });

    it('lastBlockedReason is mapped correctly by role', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
      ], [
        platEvent('JOIN_BLOCKED', 'pract-1', new Date('2024-01-01T09:59:00Z'), {
          blockedReason: 'ACCOUNT_NOT_ACTIVE',
        }),
        platEvent('JOIN_BLOCKED', 'pract-1', new Date('2024-01-01T10:00:00Z'), {
          blockedReason: 'SESSION_LOCKED',
        }),
      ], { patientUserId: 'patient-1', practitionerUserId: 'pract-1' });

      // Should be the last blocked reason
      expect(result.practitioner.lastBlockedReason).toBe('SESSION_LOCKED');
    });
  });

  // =============================================================================
  // GROUP 4: Meeting bounds from metadataJson.occurredAt
  // =============================================================================
  describe('meeting bounds from metadataJson.occurredAt', () => {
    it('MEETING_STARTED uses metadataJson.occurredAt over createdAt', () => {
      const timing = makeTiming();
      const providerOccurredAt = new Date('2024-01-01T10:00:30Z');
      const backendCreatedAt = new Date('2024-01-01T10:05:00Z'); // arrives later

      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('MEETING_STARTED', null, backendCreatedAt, {
          occurredAt: providerOccurredAt.toISOString(),
        }),
        platEvent('MEETING_ENDED', null, backendCreatedAt, {
          occurredAt: new Date('2024-01-01T10:52:00Z').toISOString(),
        }),
      ]);

      expect(result.meeting.meetingStartedAt).toEqual(providerOccurredAt);
      expect(result.meeting.sourceConfidence).toBe('HIGH');
    });

    it('MEETING_ENDED uses metadataJson.occurredAt over createdAt', () => {
      const timing = makeTiming();
      const providerEndedAt = new Date('2024-01-01T10:52:00Z');
      const backendCreatedAt = new Date('2024-01-01T10:55:00Z');

      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('MEETING_STARTED', null, backendCreatedAt, {
          occurredAt: new Date('2024-01-01T10:00:30Z').toISOString(),
        }),
        platEvent('MEETING_ENDED', null, backendCreatedAt, {
          occurredAt: providerEndedAt.toISOString(),
        }),
      ]);

      expect(result.meeting.meetingEndedAt).toEqual(providerEndedAt);
    });

    it('invalid metadataJson.occurredAt falls back to createdAt safely', () => {
      const timing = makeTiming();
      const backendCreatedAt = new Date('2024-01-01T10:05:00Z');

      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('MEETING_STARTED', null, backendCreatedAt, {
          occurredAt: 'not-a-valid-date',
        }),
        platEvent('MEETING_ENDED', null, backendCreatedAt, {
          occurredAt: null,
        }),
      ]);

      // Falls back to createdAt
      expect(result.meeting.meetingStartedAt).toEqual(backendCreatedAt);
      // Confidence downgraded to MEDIUM since occurredAt not used
      expect(result.meeting.sourceConfidence).toBe('MEDIUM');
    });
  });

  // =============================================================================
  // GROUP 5: Pure engine deterministic behavior
  // =============================================================================
  describe('pure engine deterministic behavior', () => {
    it('same input produces same output across repeated calls', () => {
      const timing = makeTiming();
      const events = [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ];

      const result1 = callEngine(timing, events, [], { now: new Date('2024-01-01T12:00:00Z') });
      const result2 = callEngine(timing, events, [], { now: new Date('2024-01-01T12:00:00Z') });

      expect(result1.overlap.overlapMinutes).toBe(result2.overlap.overlapMinutes);
      expect(result1.recommendation.recommendedOutcome).toBe(result2.recommendation.recommendedOutcome);
      expect(result1.patient.totalPresenceSeconds).toBe(result2.patient.totalPresenceSeconds);
    });

    it('open interval without meetingEndedAt/scheduledEndAt/now does not depend on runtime clock', () => {
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      // Patient joins but never leaves, no meetingEndedAt, no scheduledEndAt, no now
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      // Open interval should have leftAt = null (no close boundary)
      expect(result.patient.joinedIntervals[0].leftAt).toBeNull();
    });

    
    it('open interval with scheduledEndAt closes at scheduledEndAt', () => {
      const timing = makeTiming(); // has scheduledEndAt = 11:00
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT — should close at scheduledEndAt
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.joinedIntervals[0].leftAt).toEqual(timing.scheduledEndAt);
    });
  });

  // =============================================================================
  // GROUP 6: Premature no-show prevention
  // =============================================================================
  describe('premature no-show prevention', () => {
    it('before session start with no events returns INSUFFICIENT_EVIDENCE', () => {
      const timing = makeTiming();
      // now = before scheduled start
      const beforeStart = new Date('2024-01-01T09:00:00Z');

      const result = callEngine(timing, [], [], { now: beforeStart });

      // No participants + no join attempts = INSUFFICIENT_EVIDENCE
      expect(result.recommendation.recommendedOutcome).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('5 minutes after start does not return patient no-show if threshold is 15 minutes', () => {
      const timing = makeTiming();
      // now = 5 minutes after scheduled start (less than 15 min threshold)
      const fiveMinutesAfter = new Date('2024-01-01T10:05:00Z');

      const result = callEngine(timing, [
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
        // Patient never joined
      ], [], { now: fiveMinutesAfter });

      // Should NOT be PATIENT_NO_SHOW_CANDIDATE — threshold not passed
      expect(result.recommendation.recommendedOutcome).not.toBe('PATIENT_NO_SHOW_CANDIDATE');
      expect(result.evidence.hasPrematureDecisionRisk).toBe(true);
      expect(result.recommendation.riskFlags).toContain('PREMATURE_DECISION_RISK');
    });

    it('after threshold passed, patient no-show candidate is allowed if practitioner joined', () => {
      const timing = makeTiming();
      // now = 20 minutes after scheduled start (> 15 min threshold)
      const afterThreshold = new Date('2024-01-01T10:20:00Z');

      const result = callEngine(timing, [
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
        // Patient never joined
      ], [], { now: afterThreshold });

      expect(result.recommendation.recommendedOutcome).toBe('PATIENT_NO_SHOW_CANDIDATE');
      expect(result.evidence.hasPrematureDecisionRisk).toBe(false);
    });

    it('after scheduledEndAt, no-show candidate is allowed when evidence supports it', () => {
      const timing = makeTiming();
      // now = after scheduled end
      const afterEnd = new Date('2024-01-01T12:00:00Z');

      const result = callEngine(timing, [
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
        // Patient never joined
      ], [], { now: afterEnd });

      expect(result.recommendation.recommendedOutcome).toBe('PATIENT_NO_SHOW_CANDIDATE');
    });
  });

  // =============================================================================
  // GROUP 7: Conservative meaningful overlap policy
  // =============================================================================
  describe('conservative meaningful overlap policy', () => {
    it('60-min session with 20-min overlap should NOT be completion candidate if percent is below 70', () => {
      const timing = makeTiming();
      // Patient: 10:00–10:20 (20 min)
      // Practitioner: 10:00–10:20 (20 min)
      // Overlap: 20 min = 33% of 60 min — below 70% threshold
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:20:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:20:00Z'), 'pract-1'),
      ], []);

      expect(result.overlap.hasMeaningfulOverlap).toBe(false);
      expect(result.recommendation.recommendedOutcome).toBe('TECHNICAL_REVIEW_CANDIDATE');
    });

    it('60-min session with 42-min overlap should be completion candidate if threshold is 70%', () => {
      const timing = makeTiming();
      // Patient: 10:00–10:42 (42 min)
      // Practitioner: 10:00–10:42 (42 min)
      // Overlap: 42 min = 70% of 60 min — exactly at threshold
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:42:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:42:00Z'), 'pract-1'),
      ], []);

      expect(result.overlap.hasMeaningfulOverlap).toBe(true);
      expect(result.recommendation.recommendedOutcome).toBe('COMPLETION_CANDIDATE');
    });

    it('missing scheduled duration uses minutes-only and adds LOW_CONFIDENCE_DURATION_MISSING flag', () => {
      const timing = makeTiming({ scheduledStartAt: null, scheduledEndAt: null, durationMinutes: null });
      // No scheduled duration — overlap minutes-only
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:25:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:25:00Z'), 'pract-1'),
      ], []);

      expect(result.overlap.confidenceFlags).toContain('LOW_CONFIDENCE_DURATION_MISSING');
      expect(result.overlap.overlapPercentOfScheduledDuration).toBeNull();
      // 25 min >= 20 min threshold → meaningful
      expect(result.overlap.hasMeaningfulOverlap).toBe(true);
    });

    it('low overlap returns TECHNICAL_REVIEW_CANDIDATE', () => {
      const timing = makeTiming();
      // Patient: 10:00–10:05 (5 min)
      // Practitioner: 10:10–10:15 (5 min)
      // Overlap: 0 min
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:05:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:10:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:15:00Z'), 'pract-1'),
      ], []);

      expect(result.recommendation.recommendedOutcome).toBe('TECHNICAL_REVIEW_CANDIDATE');
    });
  });

  // =============================================================================
  // GROUP 8: Late threshold logic
  // =============================================================================
  describe('late threshold logic', () => {
    it('patient joins 3 minutes late with 5-min threshold → not late', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:03:00Z'), 'patient-1'), // 3 min late
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.lateSeconds).toBeGreaterThan(0);
      expect(result.patient.joinedOnTime).toBe(true);
    });

    it('patient joins 6 minutes late → late', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:06:00Z'), 'patient-1'), // 6 min late
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.lateSeconds).toBeGreaterThan(0);
      expect(result.patient.joinedOnTime).toBe(false);
    });

    it('practitioner joins 6 minutes late → late', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:06:00Z'), 'pract-1'), // 6 min late
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.practitioner.joinedOnTime).toBe(false);
    });

    it('duplicate JOINED after on-time first join does not make user late', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'), // on time
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'), // duplicate
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      // First real join is on time — lateSeconds should be 0
      expect(result.patient.lateSeconds).toBe(0);
      expect(result.patient.joinedOnTime).toBe(true);
    });
  });

  // =============================================================================
  // GROUP 9: sourceConfidence behavior
  // =============================================================================
  describe('sourceConfidence behavior', () => {
    it('provider occurredAt meeting bounds → HIGH', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('MEETING_STARTED', null, new Date('2024-01-01T10:00:30Z'), {
          occurredAt: new Date('2024-01-01T10:00:30Z').toISOString(),
        }),
        platEvent('MEETING_ENDED', null, new Date('2024-01-01T10:52:00Z'), {
          occurredAt: new Date('2024-01-01T10:52:00Z').toISOString(),
        }),
      ]);

      expect(result.meeting.sourceConfidence).toBe('HIGH');
    });

    it('fallback createdAt meeting bounds → MEDIUM', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('MEETING_STARTED', null, new Date('2024-01-01T10:00:30Z'), {}),
        platEvent('MEETING_ENDED', null, new Date('2024-01-01T10:52:00Z'), {}),
      ]);

      expect(result.meeting.sourceConfidence).toBe('MEDIUM');
    });

    it('only participant events (no meeting events) → MEDIUM', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      // No MEETING_STARTED/ENDED events, but participant JOINED/LEFT provide bounds → MEDIUM
      expect(result.meeting.sourceConfidence).toBe('MEDIUM');
    });

    it('incomplete events → LOW', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [], []);

      expect(result.meeting.sourceConfidence).toBe('LOW');
    });
  });

  // =============================================================================
  // GROUP 10: Recommendation fields
  // =============================================================================
  describe('recommendation fields', () => {
    it('isFinalDecision is always false', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.recommendation.isFinalDecision).toBe(false);
    });

    it('requiresAdminReview is true for all outcomes', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [], []);

      expect(result.recommendation.requiresAdminReview).toBe(true);
    });
  });

  // =============================================================================
  // GROUP 11: Basic case — both joined and left normally
  // =============================================================================
  describe('basic case — both joined and left normally', () => {
    it('returns COMPLETION_CANDIDATE when both join with good overlap', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:01:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:51:00Z'), 'pract-1'),
      ], []);

      expect(result.recommendation.recommendedOutcome).toBe('COMPLETION_CANDIDATE');
      expect(result.patient.joinCount).toBe(1);
      expect(result.practitioner.joinCount).toBe(1);
      expect(result.overlap.overlapSeconds).toBeGreaterThan(0);
      expect(result.evidence.hasNoParticipants).toBe(false);
    });
  });

  // =============================================================================
  // GROUP 12: No-show candidates
  // =============================================================================
  describe('no-show candidates', () => {
    it('returns PATIENT_NO_SHOW_CANDIDATE when only practitioner joins', () => {
      const timing = makeTiming();
      const afterThreshold = new Date('2024-01-01T10:20:00Z'); // past 15-min threshold
      const result = callEngine(timing, [
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:01:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:51:00Z'), 'pract-1'),
      ], [], { now: afterThreshold });

      expect(result.recommendation.recommendedOutcome).toBe('PATIENT_NO_SHOW_CANDIDATE');
      expect(result.patient.noShowCandidate).toBe(true);
      expect(result.practitioner.noShowCandidate).toBe(false);
    });

    it('returns PRACTITIONER_NO_SHOW_CANDIDATE when only patient joins', () => {
      const timing = makeTiming();
      const afterThreshold = new Date('2024-01-01T10:20:00Z'); // past 10-min threshold
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
      ], [], { now: afterThreshold });

      expect(result.recommendation.recommendedOutcome).toBe('PRACTITIONER_NO_SHOW_CANDIDATE');
      expect(result.patient.noShowCandidate).toBe(false);
      expect(result.practitioner.noShowCandidate).toBe(true);
    });

    it('returns INSUFFICIENT_EVIDENCE when neither joins and no platform attempts', () => {
      const result = callEngine(makeTiming(), [], []);

      expect(result.recommendation.recommendedOutcome).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('returns MANUAL_REVIEW_REQUIRED when join attempts exist but no attendance events', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [], [
        platEvent('JOIN_ATTEMPTED', 'patient-1', new Date('2024-01-01T09:59:00Z')),
      ]);

      expect(result.recommendation.recommendedOutcome).toBe('MANUAL_REVIEW_REQUIRED');
    });
  });

  // =============================================================================
  // GROUP 13: Overlap calculation
  // =============================================================================
  describe('overlap calculation', () => {
    it('computes correct overlap when patient joins first', () => {
      const timing = makeTiming();
      // Patient: 10:00–10:30
      // Practitioner: 10:10–10:40
      // Overlap: 10:10–10:30 = 20 minutes = 33% of 60-min session
      // With AND logic: 33% < 70% threshold → NOT meaningful overlap
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:10:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:40:00Z'), 'pract-1'),
      ], []);

      expect(result.overlap.overlapMinutes).toBe(20);
      expect(result.overlap.hasMeaningfulOverlap).toBe(false); // AND logic: 33% < 70%
      expect(result.recommendation.recommendedOutcome).toBe('TECHNICAL_REVIEW_CANDIDATE');
    });
  });

  // =============================================================================
  // GROUP 14: UNKNOWN participant events
  // =============================================================================
  describe('UNKNOWN participant events', () => {
    it('counts unknown events but excludes them from overlap', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
        attEvent(JOINED, UNKNOWN, new Date('2024-01-01T10:10:00Z'), null),
        attEvent(LEFT, UNKNOWN, new Date('2024-01-01T10:30:00Z'), null),
      ], []);

      expect(result.evidence.unknownParticipantEventCount).toBe(2);
      expect(result.recommendation.riskFlags).toContain('UNKNOWN_PARTICIPANT_EVENTS');
      expect(result.overlap.overlapMinutes).toBe(50);
    });
  });

  // =============================================================================
  // GROUP 15: Edge cases
  // =============================================================================
  describe('edge cases', () => {
    it('handles null scheduledStartAt gracefully', () => {
      const timing = makeTiming({ scheduledStartAt: null, scheduledEndAt: null, durationMinutes: null });
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.lateSeconds).toBeNull();
      expect(result.patient.noShowCandidate).toBe(false);
      expect(result.recommendation.recommendedOutcome).toBe('COMPLETION_CANDIDATE');
    });

    it('computes correct totalPresenceSeconds across multiple intervals', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:20:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      // First: 20 min = 1200s, Second: 20 min = 1200s
      expect(result.patient.totalPresenceSeconds).toBe(2400);
    });

    it('hasPrematureDecisionRisk is true when session is still active', () => {
      const timing = makeTiming();
      // now = 5 minutes after start (before thresholds)
      const fiveMinAfter = new Date('2024-01-01T10:05:00Z');

      const result = callEngine(timing, [
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [], { now: fiveMinAfter });

      expect(result.evidence.hasPrematureDecisionRisk).toBe(true);
      expect(result.recommendation.riskFlags).toContain('PREMATURE_DECISION_RISK');
    });
  });

  // =============================================================================
  // GROUP 16: input.now as close boundary for open intervals
  // =============================================================================
  describe('input.now as close boundary', () => {
    it('open interval with explicit now closes at input.now', () => {
      // input.now IS used as close boundary when meetingEndedAt and scheduledEndAt are absent
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      const explicitNow = new Date('2024-01-01T12:00:00Z');

      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [], { now: explicitNow });

      expect(result.patient.joinedIntervals[0].leftAt).toEqual(explicitNow);
      expect(result.patient.joinedIntervals[0].durationSeconds).toBe(2 * 60 * 60); // 2 hours
    });

    it('open interval without now/meetingEndedAt/scheduledEndAt stays open with leftAt=null', () => {
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT, no scheduledEndAt, no now
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.joinedIntervals[0].leftAt).toBeNull();
      expect(result.patient.joinedIntervals[0].durationSeconds).toBe(0);
      expect(result.evidence.hasOpenIntervalsWithoutCloseBoundary).toBe(true);
      expect(result.evidence.openIntervalCount).toBe(1);
    });

    it('open interval closed by scheduledEndAt has correct duration', () => {
      const timing = makeTiming(); // has scheduledEndAt = 11:00
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT — should close at scheduledEndAt
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.patient.joinedIntervals[0].leftAt).toEqual(timing.scheduledEndAt);
      expect(result.patient.joinedIntervals[0].durationSeconds).toBe(60 * 60); // 1 hour
      expect(result.evidence.hasOpenIntervalsWithoutCloseBoundary).toBe(false);
    });
  });

  // =============================================================================
  // GROUP 17: Infinity/NaN overlap prevention
  // =============================================================================
  describe('Infinity/NaN overlap prevention', () => {
    it('both open intervals without close boundary → overlap is finite (0), recommendation not completion', () => {
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT for patient
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        // No LEFT for practitioner
      ], []);

      // Overlap must be finite numbers — no Infinity, no NaN
      expect(Number.isFinite(result.overlap.overlapSeconds)).toBe(true);
      expect(Number.isFinite(result.overlap.overlapMinutes)).toBe(true);
      expect(result.overlap.overlapSeconds).toBe(0);
      expect(result.overlap.overlapMinutes).toBe(0);
      // Open intervals without close boundary cannot be completion candidates
      expect(result.recommendation.recommendedOutcome).toBe('MANUAL_REVIEW_REQUIRED');
      expect(result.recommendation.riskFlags).toContain('OPEN_INTERVAL_WITHOUT_CLOSE_BOUNDARY');
      expect(result.recommendation.riskFlags).toContain('UNRELIABLE_OVERLAP_OPEN_INTERVAL');
    });

    it('one open interval without close boundary → overlap is finite', () => {
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        // No LEFT for practitioner — open without close
      ], []);

      // Patient interval is closed (10:00–10:50), practitioner is open without close
      // Open interval excluded from overlap → overlap computed only from patient closed interval
      expect(Number.isFinite(result.overlap.overlapSeconds)).toBe(true);
      expect(result.overlap.overlapSeconds).toBe(0); // practitioner open, excluded
      expect(result.evidence.hasOpenIntervalsWithoutCloseBoundary).toBe(true);
    });

    it('open intervals with explicit now → overlap is finite and meaningful if thresholds met', () => {
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      const explicitNow = new Date('2024-01-01T11:00:00Z'); // 1 hour after join

      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        // Both still present at explicitNow
      ], [], { now: explicitNow });

      // Both closed at explicitNow → 60 min overlap
      expect(Number.isFinite(result.overlap.overlapSeconds)).toBe(true);
      expect(result.overlap.overlapMinutes).toBe(60);
      expect(result.overlap.hasMeaningfulOverlap).toBe(true);
      expect(result.recommendation.recommendedOutcome).toBe('COMPLETION_CANDIDATE');
      expect(result.evidence.hasOpenIntervalsWithoutCloseBoundary).toBe(false);
    });

    it('open intervals with scheduledEndAt → overlap is finite', () => {
      const timing = makeTiming(); // scheduledEndAt = 11:00
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        // Both still present — closed at scheduledEndAt
      ], []);

      // Both closed at scheduledEndAt → 60 min overlap
      expect(Number.isFinite(result.overlap.overlapSeconds)).toBe(true);
      expect(result.overlap.overlapMinutes).toBe(60);
      expect(result.overlap.hasMeaningfulOverlap).toBe(true);
      expect(result.evidence.hasOpenIntervalsWithoutCloseBoundary).toBe(false);
    });

    it('overlapMinutes and overlapSeconds are never negative', () => {
      const timing = makeTiming();
      // Non-overlapping sessions
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:10:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:40:00Z'), 'pract-1'),
      ], []);

      expect(result.overlap.overlapSeconds).toBe(0);
      expect(result.overlap.overlapMinutes).toBe(0);
      expect(result.overlap.overlapSeconds).toBeGreaterThanOrEqual(0);
      expect(result.overlap.overlapMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  // =============================================================================
  // GROUP 18: Missing leave/join flags with duplicate JOINED
  // =============================================================================
  describe('missing leave/join flags with duplicate JOINED', () => {
    it('JOINED, duplicate JOINED, LEFT → no missing leave', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:01:00Z'), 'patient-1'), // duplicate
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      expect(result.evidence.hasMissingLeaveEvent).toBe(false);
      expect(result.evidence.missingLeaveEventCount).toBe(0);
      expect(result.patient.hasMissingLeaveEvent).toBeUndefined(); // not on role summary
    });

    it('LEFT without preceding JOINED → has missing join event', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:30:00Z'), 'patient-1'), // no prior JOINED
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:30:00Z'), 'pract-1'),
      ], []);

      expect(result.evidence.hasMissingJoinEvent).toBe(true);
      expect(result.evidence.missingJoinEventCount).toBe(1);
    });

    it('JOINED without LEFT and no close boundary → has missing leave and open interval flag', () => {
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT, no scheduledEndAt
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.evidence.hasMissingLeaveEvent).toBe(true);
      expect(result.evidence.missingLeaveEventCount).toBe(1);
      expect(result.evidence.hasOpenIntervalsWithoutCloseBoundary).toBe(true);
      expect(result.evidence.openIntervalCount).toBe(1);
    });

    it('JOINED without LEFT but closed by scheduledEndAt → no missing leave', () => {
      const timing = makeTiming(); // has scheduledEndAt
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        // No LEFT — but closed by scheduledEndAt
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.evidence.hasMissingLeaveEvent).toBe(false);
      expect(result.evidence.missingLeaveEventCount).toBe(0);
      expect(result.evidence.hasOpenIntervalsWithoutCloseBoundary).toBe(false);
    });

    it('multiple LEFT without JOINED → missingJoinEventCount is accurate', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:05:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:10:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      expect(result.evidence.hasMissingJoinEvent).toBe(true);
      expect(result.evidence.missingJoinEventCount).toBe(3);
    });
  });

  // =============================================================================
  // GROUP 19: sourceConfidence for participant-only bounds
  // =============================================================================
  describe('sourceConfidence for participant-only bounds', () => {
    it('provider occurredAt meeting bounds → HIGH', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('MEETING_STARTED', null, new Date('2024-01-01T10:00:30Z'), {
          occurredAt: new Date('2024-01-01T10:00:30Z').toISOString(),
        }),
        platEvent('MEETING_ENDED', null, new Date('2024-01-01T10:52:00Z'), {
          occurredAt: new Date('2024-01-01T10:52:00Z').toISOString(),
        }),
      ]);

      expect(result.meeting.sourceConfidence).toBe('HIGH');
    });

    it('createdAt fallback meeting bounds → MEDIUM', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], [
        platEvent('MEETING_STARTED', null, new Date('2024-01-01T10:00:30Z'), {}),
        platEvent('MEETING_ENDED', null, new Date('2024-01-01T10:52:00Z'), {}),
      ]);

      expect(result.meeting.sourceConfidence).toBe('MEDIUM');
    });

    it('participant-only JOINED/LEFT bounds (no meeting events) → MEDIUM', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ], []);

      // No meeting events but participant events provide bounds → MEDIUM
      expect(result.meeting.sourceConfidence).toBe('MEDIUM');
    });

    it('incomplete participant evidence (only JOINED, no LEFT) → LOW', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        // No LEFT events
      ], []);

      // Has joins but no leaves → partial evidence → LOW
      expect(result.meeting.sourceConfidence).toBe('LOW');
    });

    it('no events at all → LOW', () => {
      const timing = makeTiming();
      const result = callEngine(timing, [], []);

      expect(result.meeting.sourceConfidence).toBe('LOW');
    });
  });

  // =============================================================================
  // GROUP 20: Determinism guarantee — no runtime clock calls
  // =============================================================================
  describe('determinism guarantee', () => {
    it('engine produces identical output when called with same explicit now', () => {
      const timing = makeTiming();
      const events = [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ];

      const now = new Date('2024-01-01T12:00:00Z');
      const r1 = callEngine(timing, events, [], { now });
      const r2 = callEngine(timing, events, [], { now });
      const r3 = callEngine(timing, events, [], { now });

      // All three calls must produce bit-identical output
      expect(r1.overlap.overlapMinutes).toBe(r2.overlap.overlapMinutes);
      expect(r2.overlap.overlapMinutes).toBe(r3.overlap.overlapMinutes);
      expect(r1.recommendation.recommendedOutcome).toBe(r3.recommendation.recommendedOutcome);
      expect(r1.patient.totalPresenceSeconds).toBe(r3.patient.totalPresenceSeconds);
    });

    it('engine produces identical output when called without now (uses scheduledEndAt as boundary)', () => {
      const timing = makeTiming();
      const events = [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(LEFT, PATIENT, new Date('2024-01-01T10:50:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        attEvent(LEFT, PRACTITIONER, new Date('2024-01-01T10:50:00Z'), 'pract-1'),
      ];

      // No now passed — boundary is scheduledEndAt
      const r1 = callEngine(timing, events, []);
      const r2 = callEngine(timing, events, []);

      expect(r1.overlap.overlapMinutes).toBe(r2.overlap.overlapMinutes);
      expect(r1.recommendation.recommendedOutcome).toBe(r2.recommendation.recommendedOutcome);
    });

    it('no Date.now or new Date is called inside the engine for calculations', () => {
      // This is verified by the determinism tests above.
      // The engine must always use input.now, meetingEndedAt, or scheduledEndAt as boundaries.
      // If Date.now() were used, repeated calls without now would give different results.
      const timing = makeTiming({ scheduledEndAt: null, durationMinutes: null });
      const events = [
        attEvent(JOINED, PATIENT, new Date('2024-01-01T10:00:00Z'), 'patient-1'),
        attEvent(JOINED, PRACTITIONER, new Date('2024-01-01T10:00:00Z'), 'pract-1'),
        // Both open — no boundary
      ];

      const r1 = callEngine(timing, events, []);
      const r2 = callEngine(timing, events, []);

      // If engine used Date.now() internally, these would differ
      expect(r1.overlap.overlapSeconds).toBe(r2.overlap.overlapSeconds);
      expect(r1.evidence.openIntervalCount).toBe(r2.evidence.openIntervalCount);
    });
  });
});
