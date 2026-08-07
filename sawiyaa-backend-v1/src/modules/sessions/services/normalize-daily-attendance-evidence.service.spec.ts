import { SessionProvider, SessionStatus } from '@prisma/client';
import { NormalizeDailyAttendanceEvidenceService } from './normalize-daily-attendance-evidence.service';

const session = {
  id: 'session-1',
  status: SessionStatus.READY_TO_JOIN,
  provider: SessionProvider.DAILY,
  scheduledStartAt: new Date('2026-08-03T10:00:00.000Z'),
  scheduledEndAt: new Date('2026-08-03T11:00:00.000Z'),
  joinOpenAt: new Date('2026-08-03T09:58:00.000Z'),
  videoRoomClosedAt: null,
  patient: { user: { id: 'patient-1', displayName: 'Patient' } },
  practitioner: { user: { id: 'practitioner-1', displayName: 'Practitioner' } },
};

function parsed(overrides: Record<string, unknown> = {}) {
  return {
    provider: SessionProvider.DAILY,
    providerEventType: 'participant.joined',
    providerEventRef: 'evt-1',
    providerRoomName: 'room-1',
    providerRoomUrl: 'https://room-1.daily.co',
    providerParticipantRef: 'participant-1',
    participantUserId: 'patient-1',
    participantDisplayName: 'Patient',
    attendanceEventType: 'JOINED' as const,
    occurredAt: new Date('2026-08-03T10:01:00.000Z'),
    receivedAt: new Date('2026-08-03T10:01:05.000Z'),
    source: 'SIGNED' as const,
    payload: {},
    ...overrides,
  };
}

describe('NormalizeDailyAttendanceEvidenceService', () => {
  const service = new NormalizeDailyAttendanceEvidenceService();

  it('trusts an exact booked patient ID inside the runtime window', () => {
    const result = service.normalize({
      parsed: parsed(),
      session,
      ingestionKey: 'key-1',
    });

    expect(result).toMatchObject({
      participantRole: 'PATIENT',
      trustLevel: 'TRUSTED',
      lifecycleEligible: true,
    });
  });

  it('trusts an exact booked practitioner ID', () => {
    const result = service.normalize({
      parsed: parsed({ participantUserId: 'practitioner-1' }),
      session,
      ingestionKey: 'key-2',
    });

    expect(result).toMatchObject({
      participantRole: 'PRACTITIONER',
      trustLevel: 'TRUSTED',
      lifecycleEligible: true,
    });
  });

  it('does not authorize unknown or display-name-only participants', () => {
    const result = service.normalize({
      parsed: parsed({ participantUserId: null }),
      session,
      ingestionKey: 'key-3',
    });

    expect(result).toMatchObject({
      participantRole: 'UNKNOWN',
      trustLevel: 'UNTRUSTED',
      lifecycleEligible: false,
      rejectionOrWarningReason: 'PARTICIPANT_ID_MISSING',
    });
  });

  it('does not authorize unsigned, stale, future, or out-of-window events', () => {
    expect(
      service.normalize({
        parsed: parsed({ source: 'UNSIGNED' }),
        session,
        ingestionKey: 'key-4',
      }).lifecycleEligible,
    ).toBe(false);
    expect(
      service.normalize({
        parsed: parsed({
          occurredAt: new Date('2026-08-01T10:01:00.000Z'),
          receivedAt: new Date('2026-08-03T10:01:05.000Z'),
        }),
        session,
        ingestionKey: 'key-5',
      }).rejectionOrWarningReason,
    ).toBe('PROVIDER_EVENT_REPLAY_WINDOW_EXPIRED');
    expect(
      service.normalize({
        parsed: parsed({
          occurredAt: new Date('2026-08-03T10:10:00.000Z'),
          receivedAt: new Date('2026-08-03T10:00:00.000Z'),
        }),
        session,
        ingestionKey: 'key-6',
      }).rejectionOrWarningReason,
    ).toBe('PROVIDER_EVENT_TOO_FAR_IN_FUTURE');
    expect(
      service.normalize({
        parsed: parsed({ occurredAt: new Date('2026-08-03T09:00:00.000Z') }),
        session,
        ingestionKey: 'key-7',
      }).rejectionOrWarningReason,
    ).toBe('JOINED_BEFORE_RUNTIME_WINDOW');
  });

  it('keeps meeting.started as non-lifecycle evidence', () => {
    const result = service.normalize({
      parsed: parsed({
        providerEventType: 'meeting.started',
        attendanceEventType: null,
      }),
      session,
      ingestionKey: 'key-8',
    });

    expect(result).toMatchObject({
      eventType: 'MEETING_STARTED',
      lifecycleEligible: false,
    });
  });
});
