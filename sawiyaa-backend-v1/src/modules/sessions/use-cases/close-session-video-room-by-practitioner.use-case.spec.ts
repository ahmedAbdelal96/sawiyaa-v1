import { SessionEventType, SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { CloseSessionVideoRoomByPractitionerUseCase } from './close-session-video-room-by-practitioner.use-case';

describe('CloseSessionVideoRoomByPractitionerUseCase', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const baseSession = {
    id: 'session_1',
    status: SessionStatus.IN_PROGRESS,
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-04-02T10:30:00.000Z'),
    scheduledEndAt: new Date('2026-04-02T11:00:00.000Z'),
    provider: SessionProvider.DAILY,
    providerRoomId: 'room_1',
    providerSessionRef: 'https://room.daily.co',
    videoRoomClosedAt: null,
    videoRoomCloseReason: null,
    videoRoomCloseNote: null,
    practitioner: { id: 'pr_1' },
  };

  function buildUseCase(overrides?: {
    session?: any;
    practitionerId?: string;
  }) {
    const currentSession = overrides?.session ?? baseSession;
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue(currentSession),
      updateStatus: jest.fn().mockImplementation(async (_sessionId, data) => ({
        ...currentSession,
        ...data,
      })),
      createEvent: jest.fn().mockResolvedValue({}),
    };
    const sessionPractitionerRepository = {
      findByUserId: jest
        .fn()
        .mockResolvedValue({ id: overrides?.practitionerId ?? 'pr_1' }),
    };
    const sessionVideoProviderRegistryService = {
      get: jest.fn().mockReturnValue({
        closeRoom: jest.fn().mockResolvedValue({
          closedAt: new Date('2026-04-02T10:50:00.000Z'),
        }),
      }),
    };
    const sessionVideoProviderResolverService = {
      resolvePreparedProviderForSession: jest
        .fn()
        .mockReturnValue(SessionProvider.DAILY),
    };

    const useCase = new CloseSessionVideoRoomByPractitionerUseCase(
      prisma as never,
      sessionPractitionerRepository as never,
      sessionRepository as never,
      new SessionAccessPolicy(),
      sessionVideoProviderRegistryService as never,
      sessionVideoProviderResolverService as never,
    );

    return {
      useCase,
      sessionRepository,
      sessionVideoProviderRegistryService,
    };
  }

  it('allows the practitioner to close the room after scheduled start', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T10:50:00.000Z'));
    const setup = buildUseCase();

    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      payload: {
        reason: 'Patient asked to end the call early.',
      },
    });

    expect(result.item.isClosed).toBe(true);
    expect(result.item.wasAlreadyClosed).toBe(false);
    expect(setup.sessionRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SessionEventType.PROVIDER_ROOM_ENDED,
      }),
      expect.anything(),
    );
  });

  it('requires a reason when the practitioner closes before scheduled end', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T10:50:00.000Z'));
    const setup = buildUseCase();

    await expect(
      setup.useCase.execute({
        userId: 'user_1',
        sessionId: 'session_1',
        payload: {},
      }),
    ).rejects.toMatchObject({
      response: { error: 'SESSION_VIDEO_ROOM_CLOSE_REASON_REQUIRED' },
    });
  });

  it('blocks room close before the scheduled start time', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T10:20:00.000Z'));
    const setup = buildUseCase({
      session: {
        ...baseSession,
        status: SessionStatus.UPCOMING,
      },
    });

    await expect(
      setup.useCase.execute({
        userId: 'user_1',
        sessionId: 'session_1',
        payload: {
          reason: 'Trying too early',
        },
      }),
    ).rejects.toMatchObject({
      response: { error: 'SESSION_VIDEO_ROOM_CLOSE_ONLY_AFTER_START' },
    });
  });

  it('does not mark the session as completed while closing the room', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T10:50:00.000Z'));
    const setup = buildUseCase();

    await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      payload: {
        reason: 'Connection dropped for both sides.',
      },
    });

    expect(setup.sessionRepository.updateStatus).toHaveBeenCalledWith(
      'session_1',
      expect.not.objectContaining({
        status: SessionStatus.COMPLETED,
      }),
      expect.anything(),
    );
  });

  it('returns the already-closed room state without calling the provider again', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T11:05:00.000Z'));
    const setup = buildUseCase({
      session: {
        ...baseSession,
        videoRoomClosedAt: new Date('2026-04-02T10:55:00.000Z'),
        videoRoomCloseReason: 'CLOSED_AFTER_SCHEDULED_END',
      },
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      payload: {},
    });

    expect(result.item.wasAlreadyClosed).toBe(true);
    expect(
      setup.sessionVideoProviderRegistryService.get().closeRoom,
    ).not.toHaveBeenCalled();
  });

  it('allows a post-end close without a manual reason and uses the default audit reason', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T11:05:00.000Z'));
    const setup = buildUseCase({
      session: {
        ...baseSession,
        status: SessionStatus.IN_PROGRESS,
      },
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      payload: {},
    });

    expect(result.item.closeReason).toBe('CLOSED_AFTER_SCHEDULED_END');
    expect(setup.sessionRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadataJson: expect.objectContaining({
          closeReason: 'CLOSED_AFTER_SCHEDULED_END',
        }),
      }),
      expect.anything(),
    );
  });
});
