import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { ResolveSessionJoinContractUseCase } from './resolve-session-join-contract.use-case';

describe('ResolveSessionJoinContractUseCase', () => {
  const baseSession = {
    id: 'session_1',
    status: SessionStatus.UPCOMING,
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-04-02T10:30:00.000Z'),
    scheduledEndAt: new Date('2026-04-02T11:00:00.000Z'),
    provider: SessionProvider.DAILY,
    providerRoomId: 'room_1',
    providerSessionRef: 'https://room.daily.co',
    patient: {
      id: 'patient_1',
      user: { displayName: 'Patient One' },
    },
    practitioner: {
      id: 'pr_1',
      user: { displayName: 'Practitioner One' },
    },
  };

  function buildUseCase(overrides?: {
    canJoin?: boolean;
    blockedReason?: string | null;
    session?: any;
    patientId?: string;
    provider?: SessionProvider;
  }) {
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
      createEvent: jest.fn().mockResolvedValue({}),
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
      assertCanTransition: jest.fn(),
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
    };
  }

  it('returns join token when session is joinable', async () => {
    const setup = buildUseCase({ canJoin: true });
    const result = await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(result.item.canJoin).toBe(true);
    expect(result.item.joinToken).toBe('daily_token');
    expect(result.item.providerRuntime).toMatchObject({
      name: SessionProvider.DAILY,
      roomId: 'room_1',
      roomUrl: 'https://room.daily.co',
      token: 'daily_token',
      tokenExpiresAt: '2026-04-02T10:45:00.000Z',
      joinMode: 'redirect_url',
      payload: {},
    });
    expect(
      setup.sessionVideoProviderResolverService
        .resolvePreparedProviderForSession,
    ).toHaveBeenCalledTimes(1);
  });

  it('returns blocked contract when join is not allowed', async () => {
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
      provider: SessionProvider.ZOOM,
      session: {
        ...baseSession,
        provider: SessionProvider.ZOOM,
        providerRoomId: 'zoom_room_1',
        providerSessionRef: 'https://zoom.example/room/zoom_room_1',
      },
    });

    await setup.useCase.execute({
      userId: 'user_1',
      actorType: 'PATIENT',
      sessionId: 'session_1',
    });

    expect(
      setup.sessionVideoProviderRegistryService.get,
    ).toHaveBeenCalledWith(SessionProvider.ZOOM);
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
});
