import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { GetAdminSessionAttendanceUseCase } from './get-admin-session-attendance.use-case';

describe('GetAdminSessionAttendanceUseCase', () => {
  function buildUseCase() {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session_1',
        status: SessionStatus.UPCOMING,
      }),
      listAttendanceEventsBySessionId: jest.fn().mockResolvedValue([]),
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
    setup.sessionRepository.findById.mockResolvedValue(null);

    await expect(
      setup.useCase.execute({ sessionId: 'session_missing' }),
    ).rejects.toMatchObject({
      response: {
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      },
    });
  });
});
