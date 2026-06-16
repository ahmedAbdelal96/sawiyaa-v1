import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { GetAdminSessionAttendanceUseCase } from './get-admin-session-attendance.use-case';

describe('GetAdminSessionAttendanceUseCase', () => {
  function buildUseCase() {
    const sessionRepository = {
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(null),
      findByIdWithParticipants: jest.fn().mockResolvedValue({
        id: 'session_1',
        status: SessionStatus.UPCOMING,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt: new Date('2026-04-08T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-08T10:30:00.000Z'),
        durationMinutes: 30,
        joinWindowOpenedAt: null,
        joinWindowClosedAt: null,
        provider: SessionProvider.DAILY,
        providerRoomId: 'room_1',
        providerSessionRef: 'https://room.daily.co',
        patientId: 'user_patient_1',
        practitionerId: 'user_pract_1',
        patient: {
          id: 'patient_profile_1',
          user: {
            id: 'user_patient_1',
            displayName: 'Layla Hassan',
            emails: [{ email: 'layla@example.com', isPrimary: true }],
            phones: [{ phone: '+970111111111', isPrimary: true }],
          },
        },
        practitioner: {
          id: 'pract_profile_1',
          user: {
            id: 'user_pract_1',
            displayName: 'Dr. Karim Saleh',
            emails: [{ email: 'karim@example.com', isPrimary: true }],
            phones: [],
          },
        },
      }),
      listAttendanceEventsBySessionId: jest.fn().mockResolvedValue([]),
      listSessionEventsBySessionId: jest.fn().mockResolvedValue([]),
    };

    const useCase = new GetAdminSessionAttendanceUseCase(
      sessionRepository as never,
    );

    return { useCase, sessionRepository };
  }

  it('returns deterministic empty summary and timeline when no events exist', async () => {
    const setup = buildUseCase();

    const result = await setup.useCase.execute({ sessionId: 'session_1' });

    expect(result.sessionId).toBe('session_1');
    expect(result.timeline).toEqual([]);
    expect(result.platformTimeline).toEqual([]);
    expect(result.evidenceTimeline).toEqual([]);
    expect(result.summary).toEqual({
      patientHasJoined: false,
      practitionerHasJoined: false,
      patientJoinedAt: null,
      practitionerJoinedAt: null,
      patientLeftAt: null,
      practitionerLeftAt: null,
      firstJoinedAt: null,
      lastLeftAt: null,
    });
    expect(result.participants).toEqual({
      patient: {
        userId: 'user_patient_1',
        displayName: 'Layla Hassan',
        email: 'layla@example.com',
        phone: '+970111111111',
      },
      practitioner: {
        userId: 'user_pract_1',
        displayName: 'Dr. Karim Saleh',
        email: 'karim@example.com',
        phone: null,
      },
    });
  });

  it('derives joined/left summary from persisted timeline events', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.listAttendanceEventsBySessionId.mockResolvedValue([
      {
        id: 'evt_1',
        sessionId: 'session_1',
        provider: SessionProvider.DAILY,
        attendanceEventType: SessionAttendanceEventType.JOINED,
        participantRole: SessionAttendanceParticipantRole.PATIENT,
        participantUserId: 'user_patient_1',
        providerEventType: 'participant.joined',
        providerEventRef: 'provider_evt_1',
        providerRoomRef: 'fayed-session-session_1',
        providerParticipantRef: 'participant_patient',
        occurredAt: new Date('2026-04-08T10:00:00.000Z'),
        ingestedAt: new Date('2026-04-08T10:00:01.000Z'),
      },
      {
        id: 'evt_2',
        sessionId: 'session_1',
        provider: SessionProvider.DAILY,
        attendanceEventType: SessionAttendanceEventType.JOINED,
        participantRole: SessionAttendanceParticipantRole.PRACTITIONER,
        participantUserId: 'user_pract_1',
        providerEventType: 'participant.joined',
        providerEventRef: 'provider_evt_2',
        providerRoomRef: 'fayed-session-session_1',
        providerParticipantRef: 'participant_pract',
        occurredAt: new Date('2026-04-08T10:03:00.000Z'),
        ingestedAt: new Date('2026-04-08T10:03:01.000Z'),
      },
      {
        id: 'evt_3',
        sessionId: 'session_1',
        provider: SessionProvider.DAILY,
        attendanceEventType: SessionAttendanceEventType.LEFT,
        participantRole: SessionAttendanceParticipantRole.PATIENT,
        participantUserId: 'user_patient_1',
        providerEventType: 'participant.left',
        providerEventRef: 'provider_evt_3',
        providerRoomRef: 'fayed-session-session_1',
        providerParticipantRef: 'participant_patient',
        occurredAt: new Date('2026-04-08T10:25:00.000Z'),
        ingestedAt: new Date('2026-04-08T10:25:01.000Z'),
      },
      {
        id: 'evt_4',
        sessionId: 'session_1',
        provider: SessionProvider.DAILY,
        attendanceEventType: SessionAttendanceEventType.LEFT,
        participantRole: SessionAttendanceParticipantRole.PRACTITIONER,
        participantUserId: 'user_pract_1',
        providerEventType: 'participant.left',
        providerEventRef: 'provider_evt_4',
        providerRoomRef: 'fayed-session-session_1',
        providerParticipantRef: 'participant_pract',
        occurredAt: new Date('2026-04-08T10:31:00.000Z'),
        ingestedAt: new Date('2026-04-08T10:31:01.000Z'),
      },
    ]);

    const result = await setup.useCase.execute({ sessionId: 'session_1' });

    expect(result.summary).toEqual({
      patientHasJoined: true,
      practitionerHasJoined: true,
      patientJoinedAt: '2026-04-08T10:00:00.000Z',
      practitionerJoinedAt: '2026-04-08T10:03:00.000Z',
      patientLeftAt: '2026-04-08T10:25:00.000Z',
      practitionerLeftAt: '2026-04-08T10:31:00.000Z',
      firstJoinedAt: '2026-04-08T10:00:00.000Z',
      lastLeftAt: '2026-04-08T10:31:00.000Z',
    });
    expect(result.timeline).toHaveLength(4);
    expect(result.timeline[0]).toEqual(
      expect.objectContaining({
        id: 'evt_1',
        participant: { userId: 'user_patient_1' },
        occurredAt: '2026-04-08T10:00:00.000Z',
      }),
    );
  });

  it('throws not found when session does not exist', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.findByIdWithParticipants.mockResolvedValue(null);

    await expect(
      setup.useCase.execute({ sessionId: 'session_missing' }),
    ).rejects.toMatchObject({
      response: {
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      },
    });
  });

  it('exposes participant identity summary from the session relations', async () => {
    const setup = buildUseCase();
    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(result.participants.patient.displayName).toBe('Layla Hassan');
    expect(result.participants.patient.email).toBe('layla@example.com');
    expect(result.participants.practitioner.displayName).toBe('Dr. Karim Saleh');
  });

  it('builds platformTimeline and evidenceTimeline from JOIN_ATTEMPTED / JOIN_BLOCKED platform events', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.listSessionEventsBySessionId.mockResolvedValue([
      {
        id: 'plat_attempt',
        sessionId: 'session_1',
        eventType: 'JOIN_ATTEMPTED',
        actorUserId: 'user_patient_1',
        metadataJson: {
          provider: 'DAILY',
          occurredAt: '2026-04-08T10:00:00.000Z',
        },
        createdAt: new Date('2026-04-08T10:00:00.000Z'),
      },
      {
        id: 'plat_blocked',
        sessionId: 'session_1',
        eventType: 'JOIN_BLOCKED',
        actorUserId: 'user_patient_1',
        metadataJson: {
          blockedReason: 'SESSION_NOT_JOINABLE_STATUS',
          provider: 'DAILY',
        },
        createdAt: new Date('2026-04-08T10:00:01.000Z'),
      },
    ]);

    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(result.platformTimeline).toHaveLength(2);
    expect(result.platformTimeline[0].eventType).toBe('JOIN_ATTEMPTED');
    expect(result.platformTimeline[1].eventType).toBe('JOIN_BLOCKED');
    expect(
      result.platformTimeline[1].safeMetadataSummary.blockedReason,
    ).toBe('SESSION_NOT_JOINABLE_STATUS');
    expect(result.evidenceTimeline).toHaveLength(2);
  });

  it('emits JOIN_TOKEN_ISSUED in platformTimeline but does not expose the token', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.listSessionEventsBySessionId.mockResolvedValue([
      {
        id: 'plat_token',
        sessionId: 'session_1',
        eventType: 'JOIN_TOKEN_ISSUED',
        actorUserId: 'user_patient_1',
        metadataJson: {
          provider: 'DAILY',
          token: 'daily-room-token-LEAKED',
          expiresAt: '2026-04-08T11:00:00.000Z',
        },
        createdAt: new Date('2026-04-08T10:00:00.000Z'),
      },
    ]);

    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(result.platformTimeline[0].eventType).toBe('JOIN_TOKEN_ISSUED');
    expect(result.platformTimeline[0].safeMetadataSummary.token).toBe(
      '[REDACTED]',
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('daily-room-token-LEAKED');
  });

  it('emits MEETING_STARTED and MEETING_ENDED with SYSTEM actorRole', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.listSessionEventsBySessionId.mockResolvedValue([
      {
        id: 'plat_started',
        sessionId: 'session_1',
        eventType: 'MEETING_STARTED',
        actorUserId: null,
        metadataJson: {
          source: 'daily-webhook',
          providerEventType: 'meeting.started',
          occurredAt: '2026-04-08T10:30:00.000Z',
        },
        createdAt: new Date('2026-04-08T10:30:00.000Z'),
      },
      {
        id: 'plat_ended',
        sessionId: 'session_1',
        eventType: 'MEETING_ENDED',
        actorUserId: null,
        metadataJson: {
          source: 'daily-webhook',
          occurredAt: '2026-04-08T11:00:00.000Z',
        },
        createdAt: new Date('2026-04-08T11:00:00.000Z'),
      },
    ]);

    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(result.platformTimeline[0]).toMatchObject({
      eventType: 'MEETING_STARTED',
      actorRole: 'SYSTEM',
      source: 'DAILY_WEBHOOK',
    });
    expect(result.platformTimeline[1]).toMatchObject({
      eventType: 'MEETING_ENDED',
      actorRole: 'SYSTEM',
    });
  });

  it('combines attendance and platform events in evidenceTimeline sorted by occurredAt', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.listAttendanceEventsBySessionId.mockResolvedValue([
      {
        id: 'att_join_patient',
        sessionId: 'session_1',
        provider: SessionProvider.DAILY,
        attendanceEventType: SessionAttendanceEventType.JOINED,
        participantRole: SessionAttendanceParticipantRole.PATIENT,
        participantUserId: 'user_patient_1',
        providerEventType: 'participant.joined',
        providerEventRef: 'ref_1',
        providerRoomRef: 'room',
        providerParticipantRef: 'participant_patient',
        occurredAt: new Date('2026-04-08T10:00:00.000Z'),
        ingestedAt: new Date('2026-04-08T10:00:01.000Z'),
      },
    ]);
    setup.sessionRepository.listSessionEventsBySessionId.mockResolvedValue([
      {
        id: 'plat_started',
        sessionId: 'session_1',
        eventType: 'MEETING_STARTED',
        actorUserId: null,
        metadataJson: {
          source: 'daily-webhook',
          occurredAt: '2026-04-08T10:05:00.000Z',
        },
        createdAt: new Date('2026-04-08T10:05:00.000Z'),
      },
    ]);

    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(result.evidenceTimeline).toHaveLength(2);
    expect(result.evidenceTimeline[0].kind).toBe('ATTENDANCE');
    expect(result.evidenceTimeline[0].eventType).toBe('JOINED');
    expect(result.evidenceTimeline[1].kind).toBe('PLATFORM');
    expect(result.evidenceTimeline[1].eventType).toBe('MEETING_STARTED');
  });

  it('maps an unknown actorUserId on a platform event to UNKNOWN', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.listSessionEventsBySessionId.mockResolvedValue([
      {
        id: 'plat_unknown',
        sessionId: 'session_1',
        eventType: 'JOIN_ATTEMPTED',
        actorUserId: 'user_stranger_42',
        metadataJson: null,
        createdAt: new Date('2026-04-08T10:00:00.000Z'),
      },
    ]);
    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(result.platformTimeline[0].actorRole).toBe('UNKNOWN');
    expect(result.platformTimeline[0].actorDisplayName).toBeNull();
  });

  it('strips sensitive keys (token / apiKey / authorization / secret / bearer) from platform metadata', async () => {
    const setup = buildUseCase();
    setup.sessionRepository.listSessionEventsBySessionId.mockResolvedValue([
      {
        id: 'plat_sensitive',
        sessionId: 'session_1',
        eventType: 'JOIN_TOKEN_ISSUED',
        actorUserId: 'user_patient_1',
        metadataJson: {
          token: 'secret-token',
          apiKey: 'secret-key',
          authorization: 'Bearer abc',
          secret: 'shh',
          bearer: 'b',
          provider: 'DAILY',
        },
        createdAt: new Date('2026-04-08T10:00:00.000Z'),
      },
    ]);
    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    const meta = result.platformTimeline[0].safeMetadataSummary;
    expect(meta.token).toBe('[REDACTED]');
    expect(meta.apiKey).toBe('[REDACTED]');
    expect(meta.authorization).toBe('[REDACTED]');
    expect(meta.secret).toBe('[REDACTED]');
    expect(meta.bearer).toBe('[REDACTED]');
    expect(meta.provider).toBe('DAILY');
  });
});
