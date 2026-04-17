import {
  SessionAttendanceParticipantRole,
  SessionProvider,
} from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionRepository } from '../repositories/session.repository';
import { ParseDailyAttendanceWebhookService } from '../services/parse-daily-attendance-webhook.service';
import { HandleDailyAttendanceWebhookUseCase } from './handle-daily-attendance-webhook.use-case';

describe('HandleDailyAttendanceWebhookUseCase', () => {
  function buildUseCase() {
    const parserMocks = {
      parse: jest.fn(),
    };
    const parseDailyAttendanceWebhookService =
      parserMocks as unknown as ParseDailyAttendanceWebhookService;

    const sessionRepositoryMocks = {
      findAttendanceEventByIngestionKey: jest.fn(),
      findAttendanceEventByProviderEventRef: jest.fn(),
      findByDailyRoomReference: jest.fn(),
      createAttendanceEvent: jest.fn(),
    };
    const sessionRepository =
      sessionRepositoryMocks as unknown as SessionRepository;

    const loggerMocks = {
      info: jest.fn(),
      warn: jest.fn(),
    };
    const logger = loggerMocks as unknown as AppLoggerService;

    const useCase = new HandleDailyAttendanceWebhookUseCase(
      parseDailyAttendanceWebhookService,
      sessionRepository,
      logger,
    );

    return {
      useCase,
      parserMocks,
      sessionRepositoryMocks,
      loggerMocks,
    };
  }

  it('stores supported attendance event with resolved participant role', async () => {
    const setup = buildUseCase();
    const parseResult = {
      provider: SessionProvider.DAILY,
      providerEventType: 'participant.joined',
      providerEventRef: 'evt_1',
      providerRoomName: 'fayed-session-session_1',
      providerRoomUrl: 'https://fayed-session-session_1.daily.co',
      providerParticipantRef: 'participant_1',
      participantUserId: 'user_patient_1',
      participantDisplayName: 'Patient One',
      attendanceEventType: 'JOINED',
      occurredAt: new Date('2026-04-07T10:00:00.000Z'),
      source: 'SIGNED',
      payload: { event: 'participant.joined' },
    };

    setup.parserMocks.parse.mockReturnValue(parseResult);
    setup.sessionRepositoryMocks.findAttendanceEventByIngestionKey.mockResolvedValue(
      null,
    );
    setup.sessionRepositoryMocks.findAttendanceEventByProviderEventRef.mockResolvedValue(
      null,
    );
    setup.sessionRepositoryMocks.findByDailyRoomReference.mockResolvedValue({
      id: 'session_1',
      patient: { user: { id: 'user_patient_1', displayName: 'Patient One' } },
      practitioner: { user: { id: 'user_pract_1', displayName: 'Dr One' } },
    });
    setup.sessionRepositoryMocks.createAttendanceEvent.mockResolvedValue({
      id: 'attendance_1',
    });

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
    });

    expect(result.handled).toBe(true);
    expect(result.reason).toBe('ATTENDANCE_EVENT_STORED');
    expect(result.sessionId).toBe('session_1');

    expect(
      setup.sessionRepositoryMocks.createAttendanceEvent,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_1',
        participantRole: SessionAttendanceParticipantRole.PATIENT,
        participantUserId: 'user_patient_1',
        providerEventRef: 'evt_1',
      }),
    );
  });

  it('returns duplicate when provider event was already ingested', async () => {
    const setup = buildUseCase();
    setup.parserMocks.parse.mockReturnValue({
      provider: SessionProvider.DAILY,
      providerEventType: 'participant.joined',
      providerEventRef: 'evt_dup',
      providerRoomName: 'fayed-session-session_1',
      providerRoomUrl: 'https://fayed-session-session_1.daily.co',
      providerParticipantRef: null,
      participantUserId: null,
      participantDisplayName: null,
      attendanceEventType: 'JOINED',
      occurredAt: new Date('2026-04-07T10:00:00.000Z'),
      source: 'SIGNED',
      payload: {},
    });
    setup.sessionRepositoryMocks.findAttendanceEventByIngestionKey.mockResolvedValue(
      null,
    );
    setup.sessionRepositoryMocks.findAttendanceEventByProviderEventRef.mockResolvedValue(
      {
        id: 'attendance_dup',
        sessionId: 'session_1',
      },
    );

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
    });

    expect(result.handled).toBe(true);
    expect(result.reason).toBe('ATTENDANCE_EVENT_DUPLICATE');
    expect(result.sessionId).toBe('session_1');
    expect(
      setup.sessionRepositoryMocks.createAttendanceEvent,
    ).not.toHaveBeenCalled();
  });

  it('returns duplicate when ingestion key already exists (provider retry without event ref)', async () => {
    const setup = buildUseCase();
    setup.parserMocks.parse.mockReturnValue({
      provider: SessionProvider.DAILY,
      providerEventType: 'participant.joined',
      providerEventRef: null,
      providerRoomName: 'fayed-session-session_1',
      providerRoomUrl: 'https://fayed-session-session_1.daily.co',
      providerParticipantRef: 'participant_1',
      participantUserId: 'user_patient_1',
      participantDisplayName: 'Patient One',
      attendanceEventType: 'JOINED',
      occurredAt: new Date('2026-04-07T10:00:00.000Z'),
      source: 'SIGNED',
      payload: {},
    });
    setup.sessionRepositoryMocks.findAttendanceEventByIngestionKey.mockResolvedValue(
      {
        id: 'attendance_dup_by_key',
        sessionId: 'session_1',
      },
    );

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
    });

    expect(result.handled).toBe(true);
    expect(result.reason).toBe('ATTENDANCE_EVENT_DUPLICATE');
    expect(result.sessionId).toBe('session_1');
    expect(
      setup.sessionRepositoryMocks.findAttendanceEventByProviderEventRef,
    ).not.toHaveBeenCalled();
    expect(
      setup.sessionRepositoryMocks.createAttendanceEvent,
    ).not.toHaveBeenCalled();
  });

  it('ignores unsupported provider event types explicitly', async () => {
    const setup = buildUseCase();
    setup.parserMocks.parse.mockReturnValue({
      provider: SessionProvider.DAILY,
      providerEventType: 'meeting.started',
      providerEventRef: 'evt_unknown',
      providerRoomName: 'fayed-session-session_2',
      providerRoomUrl: 'https://fayed-session-session_2.daily.co',
      providerParticipantRef: null,
      participantUserId: null,
      participantDisplayName: null,
      attendanceEventType: null,
      occurredAt: new Date('2026-04-07T10:00:00.000Z'),
      source: 'UNSIGNED',
      payload: {},
    });
    setup.sessionRepositoryMocks.findAttendanceEventByIngestionKey.mockResolvedValue(
      null,
    );
    setup.sessionRepositoryMocks.findAttendanceEventByProviderEventRef.mockResolvedValue(
      null,
    );

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
    });

    expect(result.handled).toBe(false);
    expect(result.reason).toBe('ATTENDANCE_EVENT_UNSUPPORTED');
    expect(
      setup.sessionRepositoryMocks.createAttendanceEvent,
    ).not.toHaveBeenCalled();
  });

  it('returns unmappable when event cannot be linked to a session', async () => {
    const setup = buildUseCase();
    setup.parserMocks.parse.mockReturnValue({
      provider: SessionProvider.DAILY,
      providerEventType: 'participant.left',
      providerEventRef: 'evt_404',
      providerRoomName: 'unknown_room',
      providerRoomUrl: 'https://unknown_room.daily.co',
      providerParticipantRef: 'participant_unknown',
      participantUserId: null,
      participantDisplayName: null,
      attendanceEventType: 'LEFT',
      occurredAt: new Date('2026-04-07T10:00:00.000Z'),
      source: 'SIGNED',
      payload: {},
    });
    setup.sessionRepositoryMocks.findAttendanceEventByIngestionKey.mockResolvedValue(
      null,
    );
    setup.sessionRepositoryMocks.findAttendanceEventByProviderEventRef.mockResolvedValue(
      null,
    );
    setup.sessionRepositoryMocks.findByDailyRoomReference.mockResolvedValue(
      null,
    );

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
    });

    expect(result.handled).toBe(false);
    expect(result.reason).toBe('ATTENDANCE_EVENT_SESSION_UNMAPPABLE');
    expect(
      setup.sessionRepositoryMocks.createAttendanceEvent,
    ).not.toHaveBeenCalled();
  });
});
