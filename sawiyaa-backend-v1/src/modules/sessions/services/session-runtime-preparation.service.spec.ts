import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { SessionRuntimePreparationService } from './session-runtime-preparation.service';

describe('SessionRuntimePreparationService', () => {
  const event = {
    actorType: SecurityAuditActorType.SYSTEM,
    actorUserId: null,
    source: SecurityAuditSource.SYSTEM,
  };

  function buildService() {
    const events: string[] = [];
    let current: any = {
      id: 'session_1',
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt: new Date('2026-06-01T10:00:00.000Z'),
      scheduledEndAt: new Date('2026-06-01T11:00:00.000Z'),
      provider: SessionProvider.NONE,
      providerRoomId: null,
      providerSessionRef: null,
      videoRoomClosedAt: null,
    };
    let transactionTail = Promise.resolve();
    const prisma = {
      $transaction: jest.fn(async (handler: any) => {
        events.push('transaction:start');
        const previous = transactionTail;
        let release!: () => void;
        transactionTail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await handler({});
        } finally {
          events.push('transaction:end');
          release();
        }
      }),
    };
    const sessionRepository = {
      lockRuntimePreparation: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockImplementation(() => Promise.resolve(current)),
      updateRuntimeIfMissing: jest.fn().mockImplementation(() => {
        if (current.providerRoomId || current.providerSessionRef) {
          return Promise.resolve({ count: 0 });
        }
        current = {
          ...current,
          provider: SessionProvider.DAILY,
          providerRoomId: 'daily-room-1',
          providerSessionRef: 'https://daily.example/room',
        };
        return Promise.resolve({ count: 1 });
      }),
      createEvent: jest.fn().mockResolvedValue({}),
    };
    const createRoom = jest.fn().mockResolvedValue({
      roomId: 'daily-room-1',
      roomUrl: 'https://daily.example/room',
    });
    const registry = {
      get: jest.fn().mockReturnValue({ createRoom }),
    };
    const resolver = {
      resolvePreparedProviderForSession: jest
        .fn()
        .mockReturnValue(SessionProvider.DAILY),
    };

    const service = new SessionRuntimePreparationService(
      prisma as never,
      sessionRepository as never,
      registry as never,
      resolver as never,
    );

    return {
      service,
      prisma,
      sessionRepository,
      createRoom,
      events,
      current: () => current,
      setCurrent: (value: any) => {
        current = value;
      },
    };
  }

  const validate = async () => undefined;

  it('persists one runtime when two callers race for the same session', async () => {
    const setup = buildService();
    let providerCalls = 0;
    let releaseProviders!: () => void;
    const providersReleased = new Promise<void>((resolve) => {
      releaseProviders = resolve;
    });
    setup.createRoom.mockImplementation(async () => {
      providerCalls += 1;
      if (providerCalls === 2) {
        releaseProviders();
      }
      await providersReleased;
      return {
        roomId: 'daily-room-1',
        roomUrl: 'https://daily.example/room',
      };
    });
    const results = await Promise.all([
      setup.service.prepare({ sessionId: 'session_1', validate, event }),
      setup.service.prepare({ sessionId: 'session_1', validate, event }),
    ]);

    expect(results[0].providerRoomId).toBe('daily-room-1');
    expect(results[1].providerRoomId).toBe('daily-room-1');
    expect(setup.createRoom).toHaveBeenCalledTimes(2);
    expect(
      setup.sessionRepository.updateRuntimeIfMissing,
    ).toHaveBeenCalledTimes(1);
    expect(setup.sessionRepository.createEvent).toHaveBeenCalledTimes(1);
    expect(setup.current().providerRoomId).toBe('daily-room-1');
  });

  it('does not write runtime state when the provider fails', async () => {
    const setup = buildService();
    setup.createRoom.mockRejectedValueOnce(new Error('Daily unavailable'));

    await expect(
      setup.service.prepare({ sessionId: 'session_1', validate, event }),
    ).rejects.toThrow('Daily unavailable');

    expect(
      setup.sessionRepository.updateRuntimeIfMissing,
    ).not.toHaveBeenCalled();
    expect(setup.sessionRepository.createEvent).not.toHaveBeenCalled();
    expect(setup.current().provider).toBe(SessionProvider.NONE);
  });

  it('does not persist a room against a schedule changed during provider I/O', async () => {
    const setup = buildService();
    setup.createRoom.mockImplementationOnce(() => {
      setup.setCurrent({
        ...setup.current(),
        scheduledStartAt: new Date('2026-06-01T12:00:00.000Z'),
      });
      return Promise.resolve({
        roomId: 'daily-room-1',
        roomUrl: 'https://daily.example/room',
      });
    });

    const pending = setup.service.prepare({
      sessionId: 'session_1',
      validate,
      event,
    });

    await expect(pending).rejects.toMatchObject({
      response: { error: 'SESSION_RUNTIME_PREPARATION_NOT_ALLOWED' },
    });
    expect(
      setup.sessionRepository.updateRuntimeIfMissing,
    ).not.toHaveBeenCalled();
  });

  it('reuses the persisted runtime on a finalize replay without another provider call', async () => {
    const setup = buildService();

    await setup.service.prepare({ sessionId: 'session_1', validate, event });
    await setup.service.prepare({ sessionId: 'session_1', validate, event });

    expect(setup.createRoom).toHaveBeenCalledTimes(1);
    expect(
      setup.sessionRepository.updateRuntimeIfMissing,
    ).toHaveBeenCalledTimes(1);
    expect(setup.sessionRepository.createEvent).toHaveBeenCalledTimes(1);
  });

  it('keeps provider latency between two short database phases', async () => {
    const setup = buildService();
    setup.createRoom.mockImplementationOnce(async () => {
      setup.events.push('provider:start');
      await new Promise((resolve) => setTimeout(resolve, 25));
      setup.events.push('provider:end');
      return {
        roomId: 'daily-room-1',
        roomUrl: 'https://daily.example/room',
      };
    });

    await setup.service.prepare({ sessionId: 'session_1', validate, event });

    expect(setup.events).toEqual([
      'transaction:start',
      'transaction:end',
      'provider:start',
      'provider:end',
      'transaction:start',
      'transaction:end',
    ]);
  });
});
