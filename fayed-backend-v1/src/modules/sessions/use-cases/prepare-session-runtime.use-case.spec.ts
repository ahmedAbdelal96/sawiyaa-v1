import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { PrepareSessionRuntimeUseCase } from './prepare-session-runtime.use-case';

describe('PrepareSessionRuntimeUseCase', () => {
  type SessionFixture = {
    id: string;
    status: SessionStatus;
    sessionMode: SessionMode;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    provider: SessionProvider;
    providerRoomId: string | null;
    providerSessionRef: string | null;
    patient: { id: string };
    practitioner: { id: string };
  };

  const baseSession: SessionFixture = {
    id: 'session_1',
    status: SessionStatus.UPCOMING,
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-04-02T10:30:00.000Z'),
    scheduledEndAt: new Date('2026-04-02T11:00:00.000Z'),
    provider: SessionProvider.NONE,
    providerRoomId: null,
    providerSessionRef: null,
    patient: { id: 'patient_1' },
    practitioner: { id: 'pr_1' },
  };

  function buildUseCase(overrides?: {
    session?: SessionFixture;
    adapterError?: boolean;
    patientId?: string;
    updateCount?: number;
  }) {
    let currentSession: SessionFixture = overrides?.session ?? baseSession;
    const transaction = <T>(fn: (tx: never) => Promise<T>): Promise<T> =>
      fn({} as never);
    const prisma = {
      $transaction: jest.fn(transaction),
    };
    const sessionRepository = {
      findById: jest.fn(() => Promise.resolve(currentSession)),
      updateRuntimeIfMissing: jest.fn(() => {
        const count = overrides?.updateCount ?? 1;
        if (count > 0) {
          currentSession = {
            ...currentSession,
            provider: SessionProvider.DAILY,
            providerRoomId: 'room_1',
            providerSessionRef: 'https://room.daily.co',
          };
        }

        return Promise.resolve({
          count,
        });
      }),
      createEvent: jest.fn().mockResolvedValue({}),
    };
    const sessionPatientRepository = {
      findByUserId: jest.fn(() =>
        Promise.resolve({ id: overrides?.patientId ?? 'patient_1' }),
      ),
    };
    const sessionPractitionerRepository = {
      findByUserId: jest.fn(() => Promise.resolve({ id: 'pr_1' })),
    };
    const sessionVideoProviderRegistryService = {
      get: jest.fn().mockReturnValue({
        createRoom: overrides?.adapterError
          ? jest.fn().mockRejectedValue(new Error('provider failed'))
          : jest.fn().mockResolvedValue({
              roomId: 'room_1',
              roomUrl: 'https://room.daily.co',
            }),
      }),
    };
    const sessionVideoProviderResolverService = {
      resolvePreparedProviderForSession: jest
        .fn()
        .mockReturnValue(SessionProvider.DAILY),
    };
    const resolveSessionJoinReadinessService = {
      resolve: jest.fn().mockReturnValue({
        canPrepareRuntime: true,
        canJoin: false,
        blockedReason: 'SESSION_RUNTIME_NOT_PREPARED',
      }),
    };

    const useCase = new PrepareSessionRuntimeUseCase(
      prisma as never,
      sessionRepository as never,
      sessionPatientRepository as never,
      sessionPractitionerRepository as never,
      sessionVideoProviderRegistryService as never,
      sessionVideoProviderResolverService as never,
      resolveSessionJoinReadinessService as never,
      new SessionAccessPolicy(),
    );

    return { useCase, sessionRepository, sessionVideoProviderResolverService };
  }

  it('prepares runtime successfully', async () => {
    const setup = buildUseCase();
    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      actorType: 'PATIENT',
    });

    expect(result.item.isPrepared).toBe(true);
    expect(result.item.providerRuntime).toMatchObject({
      name: SessionProvider.DAILY,
      roomId: 'room_1',
      roomUrl: 'https://room.daily.co',
      token: null,
    });
  });

  it('returns existing runtime for idempotent prepare', async () => {
    const setup = buildUseCase({
      session: {
        ...baseSession,
        provider: SessionProvider.ZOOM,
        providerRoomId: 'room_1',
        providerSessionRef: 'https://room.zoom.us/j/room_1',
      },
    });
    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      actorType: 'PATIENT',
    });

    expect(result.item.isPrepared).toBe(true);
    expect(
      setup.sessionRepository.updateRuntimeIfMissing,
    ).not.toHaveBeenCalled();
    expect(result.item.provider).toBe(SessionProvider.ZOOM);
    expect(result.item.providerRuntime).toMatchObject({
      name: SessionProvider.ZOOM,
      roomId: 'room_1',
      roomUrl: 'https://room.zoom.us/j/room_1',
    });
  });

  it('uses resolver-selected provider when session is unprepared', async () => {
    const setup = buildUseCase({
      session: {
        ...baseSession,
        provider: SessionProvider.NONE,
        providerRoomId: null,
        providerSessionRef: null,
      },
    });

    await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      actorType: 'PATIENT',
    });

    expect(
      setup.sessionVideoProviderResolverService
        .resolvePreparedProviderForSession,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not persist duplicate runtime data when another writer already prepared it', async () => {
    const setup = buildUseCase({
      updateCount: 0,
      session: {
        ...baseSession,
        provider: SessionProvider.NONE,
        providerRoomId: null,
        providerSessionRef: null,
      },
    });

    await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      actorType: 'PATIENT',
    });

    expect(
      setup.sessionRepository.updateRuntimeIfMissing,
    ).toHaveBeenCalledTimes(1);
    expect(setup.sessionRepository.createEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PROVIDER_ROOM_CREATED',
      }),
      expect.anything(),
    );
  });

  it('rejects when patient tries to prepare another patient session', async () => {
    const setup = buildUseCase({ patientId: 'other_patient' });

    await expect(
      setup.useCase.execute({
        userId: 'user_1',
        sessionId: 'session_1',
        actorType: 'PATIENT',
      }),
    ).rejects.toMatchObject({
      response: { error: 'SESSION_ACCESS_DENIED' },
    });
  });
});
