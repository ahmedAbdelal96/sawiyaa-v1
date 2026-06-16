import { ForbiddenException } from '@nestjs/common';
import { RegisterNotificationDeviceUseCase } from './register-notification-device.use-case';

describe('RegisterNotificationDeviceUseCase', () => {
  it('stores timezone metadata as provided without treating it as scheduling authority', async () => {
    const registerOrUpdate = jest.fn().mockResolvedValue({
      id: 'device-1',
      role: 'PATIENT',
      provider: 'EXPO',
      platform: 'IOS',
      deviceId: 'device-1',
      appVersion: '1.0.0',
      locale: 'ar',
      timezone: 'Europe/Berlin',
      isActive: true,
      lastSeenAt: new Date('2026-06-01T10:00:00.000Z'),
      revokedAt: null,
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    });
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
        timezone: 'Europe/Berlin',
      },
    });

    expect(registerOrUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'Europe/Berlin',
      }),
    );
    expect(result.item.timezone).toBe('Europe/Berlin');
  });

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
