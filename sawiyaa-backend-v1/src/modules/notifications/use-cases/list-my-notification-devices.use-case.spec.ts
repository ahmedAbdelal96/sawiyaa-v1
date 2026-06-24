import { ListMyNotificationDevicesUseCase } from './list-my-notification-devices.use-case';

describe('ListMyNotificationDevicesUseCase', () => {
  it('returns mapped device items for the authenticated user', async () => {
    const repository = {
      listUserDevices: jest.fn().mockResolvedValue([
        {
          id: 'device-1',
          role: 'PATIENT',
          provider: 'EXPO',
          platform: 'IOS',
          deviceId: 'device-id-1',
          appVersion: '1.0.0',
          locale: 'ar',
          timezone: 'Africa/Cairo',
          isActive: true,
          lastSeenAt: new Date('2026-05-04T09:00:00.000Z'),
          revokedAt: null,
          createdAt: new Date('2026-05-01T09:00:00.000Z'),
          updatedAt: new Date('2026-05-04T09:00:00.000Z'),
        },
      ]),
    };

    const useCase = new ListMyNotificationDevicesUseCase(repository as never);

    const result = await useCase.execute({
      id: 'user-1',
      roles: ['PATIENT' as never],
    });

    expect(repository.listUserDevices).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      items: [
        {
          id: 'device-1',
          role: 'PATIENT',
          provider: 'EXPO',
          platform: 'IOS',
          deviceId: 'device-id-1',
          appVersion: '1.0.0',
          locale: 'ar',
          timezone: 'Africa/Cairo',
          enabled: true,
          lastSeenAt: '2026-05-04T09:00:00.000Z',
          revokedAt: null,
          createdAt: '2026-05-01T09:00:00.000Z',
          updatedAt: '2026-05-04T09:00:00.000Z',
        },
      ],
    });
  });
});
