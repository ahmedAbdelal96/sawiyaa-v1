import { ForbiddenException } from '@nestjs/common';
import { RegisterNotificationDeviceUseCase } from './register-notification-device.use-case';

describe('RegisterNotificationDeviceUseCase', () => {
  const baseDeviceRow = {
    id: 'device-1',
    role: 'PATIENT',
    provider: 'EXPO',
    platform: 'IOS',
    deviceId: 'device-1',
    appVersion: '1.0.0',
    locale: 'ar',
    timezone: null,
    isActive: true,
    lastSeenAt: new Date('2026-06-01T10:00:00.000Z'),
    revokedAt: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
  };

  async function runRegistration(timezone?: string | null) {
    const registerOrUpdate = jest.fn().mockImplementation(async (input) => ({
      ...baseDeviceRow,
      timezone: input.timezone ?? null,
    }));

    const repository = {
      registerOrUpdate,
    };

    const useCase = new RegisterNotificationDeviceUseCase(repository as never);

    const result = await useCase.execute({
      authenticatedUser: {
        id: 'user-1',
        roles: ['PATIENT' as never],
      },
      dto: {
        token: 'ExponentPushToken[test]',
        provider: 'EXPO',
        platform: 'IOS',
        role: 'PATIENT',
        ...(timezone !== undefined ? { timezone } : {}),
      },
    });

    return { registerOrUpdate, result };
  }

  it.each([
    ['Africa/Cairo', 'Africa/Cairo'],
    ['Asia/Riyadh', 'Asia/Riyadh'],
    ['Asia/Dubai', 'Asia/Dubai'],
    ['Europe/Berlin', 'Europe/Berlin'],
  ] as const)(
    'stores valid IANA timezone metadata %s without treating it as scheduling authority',
    async (timezone, expected) => {
      const { registerOrUpdate, result } = await runRegistration(timezone);

      expect(registerOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: expected,
        }),
      );
      expect(result.item.timezone).toBe(expected);
    },
  );

  it('succeeds when timezone is omitted and keeps the current null metadata behavior', async () => {
    const { registerOrUpdate, result } = await runRegistration(undefined);

    expect(registerOrUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: null,
      }),
    );
    expect(result.item.timezone).toBeNull();
  });

  it.each(['', '   ', null])(
    'succeeds when timezone is blank or null and stores null metadata (%s)',
    async (timezone) => {
      const { registerOrUpdate, result } = await runRegistration(
        timezone as string | null,
      );

      expect(registerOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: null,
        }),
      );
      expect(result.item.timezone).toBeNull();
    },
  );

  it.each(['+02:00', 'UTC+2', 'Invalid/Timezone'])(
    'succeeds when timezone metadata is invalid (%s) and stores null instead',
    async (timezone) => {
      const { registerOrUpdate, result } = await runRegistration(timezone);

      expect(registerOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: null,
        }),
      );
      expect(result.item.timezone).toBeNull();
    },
  );

  it('rejects roles not present on the authenticated user', async () => {
    const repository = {
      registerOrUpdate: jest.fn(),
    };

    const useCase = new RegisterNotificationDeviceUseCase(repository as never);

    await expect(
      useCase.execute({
        authenticatedUser: {
          id: 'user-1',
          roles: ['PATIENT' as never],
        },
        dto: {
          token: 'ExponentPushToken[test]',
          provider: 'EXPO',
          platform: 'IOS',
          role: 'PRACTITIONER',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
