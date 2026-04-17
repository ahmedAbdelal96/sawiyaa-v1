import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { PrepareSessionRuntimeUseCase } from './prepare-session-runtime.use-case';

describe('PrepareSessionRuntimeUseCase', () => {
  const baseSession = {
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
    session?: any;
    adapterError?: boolean;
    patientId?: string;
  }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue(overrides?.session ?? baseSession),
      updateStatus: jest.fn().mockResolvedValue({
        ...(overrides?.session ?? baseSession),
        provider: SessionProvider.DAILY,
        providerRoomId: 'room_1',
        providerSessionRef: 'https://room.daily.co',
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
    const sessionVideoProviderRegistryService = {
      get: jest.fn().mockReturnValue({
        createRoom: overrides?.adapterError
          ? jest.fn().mockRejectedValue(new Error('provider failed'))
          : jest.fn().mockResolvedValue({
              roomName: 'room_1',
              roomUrl: 'https://room.daily.co',
            }),
      }),
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
      resolveSessionJoinReadinessService as never,
    );

    return { useCase, sessionRepository };
  }

  it('prepares runtime successfully', async () => {
    const setup = buildUseCase();
    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      actorType: 'PATIENT',
    });

    expect(result.item.isPrepared).toBe(true);
    expect(setup.sessionRepository.updateStatus).toHaveBeenCalledTimes(1);
  });

  it('returns existing runtime for idempotent prepare', async () => {
    const setup = buildUseCase({
      session: {
        ...baseSession,
        provider: SessionProvider.DAILY,
        providerRoomId: 'room_1',
        providerSessionRef: 'https://room.daily.co',
      },
    });
    const result = await setup.useCase.execute({
      userId: 'user_1',
      sessionId: 'session_1',
      actorType: 'PATIENT',
    });

    expect(result.item.isPrepared).toBe(true);
    expect(setup.sessionRepository.updateStatus).not.toHaveBeenCalled();
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
