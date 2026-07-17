import {
  SessionAdminDecisionType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { ResolveSessionJoinContractUseCase } from './resolve-session-join-contract.use-case';

describe('ResolveSessionJoinContractUseCase', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const baseSession = {
    id: 'session_1',
    status: SessionStatus.UPCOMING,
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-04-02T10:30:00.000Z'),
    scheduledEndAt: new Date('2026-04-02T11:00:00.000Z'),
    provider: SessionProvider.DAILY,
    providerRoomId: 'room_1',
    providerSessionRef: 'https://room.daily.co',
    videoRoomClosedAt: null,
    videoRoomCloseReason: null,
    videoRoomCloseNote: null,
    patient: {
      id: 'patient_1',
      user: { displayName: 'Patient One' },
    },
    practitioner: {
      id: 'pr_1',
      user: { displayName: 'Practitioner One' },
    },
  };

  // Backend join policy: LEAD=2 min, LAG=0 min
  // joinOpensAt = 10:30 - 2min = 10:28
  // joinClosesAt = 11:00 + 0min = 11:00
  const expectedAvailableAt = new Date('2026-04-02T10:28:00.000Z').toISOString();
  const expectedExpiresAt = new Date('2026-04-02T11:00:00.000Z').toISOString();

  function buildUseCase(overrides?: {
    canJoin?: boolean;
    blockedReason?: string | null;
    session?: any;
    patientId?: string;
    provider?: SessionProvider;
    hasPriorJoinEvidence?: boolean;
    finalManualDecision?: SessionAdminDecisionType | null;
  }) {
    const createdEvents: Array<{ eventType: string; actorUserId: string }> = [];
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const sessionRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(overrides?.session ?? baseSession)
        .mockResolvedValue(overrides?.session ?? baseSession),
      updateStatus: jest.fn().mockResolvedValue({
        ...(overrides?.session ?? baseSession),
        status: SessionStatus.READY_TO_JOIN,
      }),
      createEvent: jest.fn().mockImplementation((data) => {
        createdEvents.push(data);
        return Promise.resolve({});
      }),
      hasJoinAllowanceOrAttendanceBefore: jest
        .fn()
        .mockResolvedValue(overrides?.hasPriorJoinEvidence ?? false),
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(
        overrides?.finalManualDecision
          ? { decisionType: overrides.finalManualDecision }
          : null,
      ),
    };
    const sessionPatientRepository = {
      findByUserId: jest
        .fn()
        .mockResolvedValue({ id: overrides?.patientId ?? 'patient_1' }),
    };
    const sessionPractitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'pr_1' }),
    };
    const resolveSessionJoinReadinessService = {
      resolve: jest.fn().mockReturnValue({
        canPrepareRuntime: true,
        canJoin: overrides?.canJoin ?? true,
        blockedReason: overrides?.blockedReason ?? null,
      }),
    };
    const sessionVideoProviderRegistryService = {
      get: jest.fn().mockImplementation((provider: SessionProvider) => ({
        provider,
        createJoinToken: jest.fn().mockResolvedValue({
          token: 'daily_token',
          expiresAt: new Date('2026-04-02T10:45:00.000Z'),
          joinMode: 'redirect_url',
          payload: {},
        }),
      })),
    };
    const sessionVideoProviderResolverService = {
      resolvePreparedProviderForSession: jest
        .fn()
        .mockReturnValue(overrides?.provider ?? SessionProvider.DAILY),
    };
    const validateSessionStatusTransitionService = {
      transition: jest.fn().mockImplementation(async ({ session, to }: any) => ({ ...session, status: to })),
    };
    const prepareSessionRuntimeUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };

    const useCase = new ResolveSessionJoinContractUseCase(
      prisma as never,
      sessionRepository as never,
      sessionPatientRepository as never,
      sessionPractitionerRepository as never,
      resolveSessionJoinReadinessService as never,
      sessionVideoProviderRegistryService as never,
      sessionVideoProviderResolverService as never,
      validateSessionStatusTransitionService as never,
      prepareSessionRuntimeUseCase as never,
    );

    return {
      useCase,
      prepareSessionRuntimeUseCase,
      sessionVideoProviderRegistryService,
      sessionVideoProviderResolverService,
      sessionRepository,
      createdEvents,
    };
  }

  it('returns join token with authoritative window times when session is joinable', async () => {
    const setup = buildUseCase({ canJoin: true });
    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(true);
    expect(result.item.joinToken).toBe('daily_token');
    expect(result.item.availableAt).toBe(expectedAvailableAt);
    expect(result.item.expiresAt).toBe(expectedExpiresAt);
    expect(result.item.providerRuntime).toMatchObject({
      name: SessionProvider.DAILY,
      roomId: 'room_1',
      roomUrl: 'https://room.daily.co',
      token: 'daily_token',
      tokenExpiresAt: '2026-04-02T10:45:00.000Z',
      joinMode: 'redirect_url',
      payload: {},
    });
  });

  it('emits JOIN_ATTEMPTED, JOIN_TOKEN_ISSUED, and JOIN_ALLOWED on successful join', async () => {
    const setup = buildUseCase({ canJoin: true });
    await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    const eventTypes = setup.createdEvents.map((e) => e.eventType);
    expect(eventTypes).toContain('JOIN_ATTEMPTED');
    expect(eventTypes).toContain('JOIN_TOKEN_ISSUED');
    expect(eventTypes).toContain('JOIN_ALLOWED');
  });

  it('emits JOIN_ATTEMPTED and JOIN_BLOCKED when join is not allowed', async () => {
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_TIME_WINDOW_NOT_OPEN',
    });
    await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    const eventTypes = setup.createdEvents.map((e) => e.eventType);
    expect(eventTypes).toContain('JOIN_ATTEMPTED');
    expect(eventTypes).toContain('JOIN_BLOCKED');
    expect(eventTypes).not.toContain('JOIN_ALLOWED');
    expect(eventTypes).not.toContain('JOIN_TOKEN_ISSUED');
  });

  it('returns blocked contract with authoritative window times when join is not allowed', async () => {
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_TIME_WINDOW_NOT_OPEN',
    });
    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(false);
    expect(result.item.joinToken).toBeNull();
    expect(result.item.availableAt).toBe(expectedAvailableAt);
    expect(result.item.expiresAt).toBe(expectedExpiresAt);
    expect(result.item.providerRuntime).toMatchObject({
      name: SessionProvider.DAILY,
      roomId: 'room_1',
      roomUrl: 'https://room.daily.co',
      token: null,
      tokenExpiresAt: null,
      joinMode: null,
      payload: {},
    });
  });

  it('auto-prepares runtime when needed before join', async () => {
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_RUNTIME_NOT_PREPARED',
    });

    await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(setup.prepareSessionRuntimeUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('uses the effective session provider for join token creation', async () => {
    const setup = buildUseCase({
      canJoin: true,
      provider: SessionProvider.DAILY,
      session: {
        ...baseSession,
        provider: SessionProvider.DAILY,
        providerRoomId: 'fayed-session-session_1',
        providerSessionRef: 'https://fayed-session-session_1.daily.co',
      },
    });

    await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(setup.sessionVideoProviderRegistryService.get).toHaveBeenCalledWith(
      SessionProvider.DAILY,
    );
  });

  it('rejects when patient tries to resolve join for another patient session', async () => {
    const setup = buildUseCase({ patientId: 'other_patient' });

    await expect(
      setup.useCase.execute({
        userId: 'user_1',
        actorType: 'PATIENT',
        sessionId: 'session_1',
      }),
    ).rejects.toMatchObject({
      response: { error: 'SESSION_ACCESS_DENIED' },
    });
  });

  it('blocks first-time late join after scheduledEndAt when no prior join evidence exists', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T11:05:00.000Z'));
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_JOIN_WINDOW_CLOSED',
      session: {
        ...baseSession,
        status: SessionStatus.IN_PROGRESS,
      },
      hasPriorJoinEvidence: false,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(false);
    expect(result.item.blockedReason).toBe('SESSION_JOIN_WINDOW_CLOSED');
  });

  it('allows post-end reconnect within grace for a user with prior join evidence', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T11:05:00.000Z'));
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_JOIN_WINDOW_CLOSED',
      session: {
        ...baseSession,
        status: SessionStatus.IN_PROGRESS,
      },
      hasPriorJoinEvidence: true,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(true);
    expect(result.item.blockedReason).toBeNull();
    expect(result.item.expiresAt).toBe('2026-04-02T11:10:00.000Z');
  });

  it('blocks post-end reconnect after grace even with prior join evidence', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T11:11:00.000Z'));
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_JOIN_WINDOW_CLOSED',
      session: {
        ...baseSession,
        status: SessionStatus.IN_PROGRESS,
      },
      hasPriorJoinEvidence: true,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(false);
    expect(result.item.blockedReason).toBe('SESSION_JOIN_WINDOW_CLOSED');
  });

  it('blocks reconnect when the practitioner has already closed the room', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-02T11:05:00.000Z'));
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_ROOM_CLOSED',
      session: {
        ...baseSession,
        status: SessionStatus.IN_PROGRESS,
        videoRoomClosedAt: new Date('2026-04-02T10:55:00.000Z'),
      },
      hasPriorJoinEvidence: true,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(false);
    expect(result.item.blockedReason).toBe('SESSION_ROOM_CLOSED');
  });

  it('does not issue a join token after a final completed decision', async () => {
    const setup = buildUseCase({
      canJoin: false,
      blockedReason: 'SESSION_NOT_JOINABLE_STATUS',
      finalManualDecision: SessionAdminDecisionType.MARK_COMPLETED,
    });

    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(false);
    expect(result.item.joinToken).toBeNull();
    expect(result.item.blockedReason).toBe('SESSION_NOT_JOINABLE_STATUS');
    expect(setup.sessionVideoProviderRegistryService.get).not.toHaveBeenCalled();
  });
});
