import { NotificationPushExecutionService } from './notification-push-execution.service';
import { NotificationDeviceRepository } from '../repositories/notification-device.repository';

describe('NotificationPushExecutionService', () => {
  const repository = {
    listActiveDevicesByUserAndRole: jest.fn(),
    revokeUserDevices: jest.fn(),
  } as unknown as NotificationDeviceRepository;

  const service = new NotificationPushExecutionService(repository);

  const baseNotification = {
    id: 'notif-1',
    userId: 'user-1',
    channel: 'PUSH' as const,
    titleSnapshot: 'اختبار الإشعارات',
    subjectSnapshot: 'اختبار الإشعارات',
    bodySnapshot: 'إذا وصلتك هذه الرسالة، فإشعارات الهاتف تعمل بنجاح.',
    payloadJson: {
      targetRole: 'PATIENT',
      routePath: '/ar/patient/notifications',
    },
    relatedEntityType: 'USER',
    relatedEntityId: 'user-1',
    notificationType: {
      slug: 'dev.push-test',
      category: 'SYSTEM',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as { fetch?: jest.Mock }).fetch = jest.fn();
  });

  it('returns device-not-registered when the user has no active devices', async () => {
    (repository.listActiveDevicesByUserAndRole as jest.Mock).mockResolvedValue(
      [],
    );

    const result = await service.execute(baseNotification);

    expect(result).toEqual({
      success: false,
      provider: 'PUSH',
      errorCode: 'PUSH_DEVICE_NOT_REGISTERED',
      errorMessage: 'PUSH_DEVICE_NOT_REGISTERED',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends an Expo push request and returns success when Expo accepts the ticket', async () => {
    (repository.listActiveDevicesByUserAndRole as jest.Mock).mockResolvedValue([
      {
        deviceToken: 'ExponentPushToken[valid-token]',
        provider: 'EXPO',
      },
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-123' }] }),
    });

    const result = await service.execute(baseNotification);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const requestBody = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body,
    );
    expect(requestBody).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[valid-token]',
        title: 'اختبار الإشعارات',
        body: 'إذا وصلتك هذه الرسالة، فإشعارات الهاتف تعمل بنجاح.',
        data: expect.objectContaining({
          notificationId: 'notif-1',
          type: 'dev.push-test',
          relatedEntityType: 'USER',
          relatedEntityId: 'user-1',
          routePath: '/ar/patient/notifications',
          targetRole: 'PATIENT',
        }),
      }),
    ]);
    expect(result).toEqual({
      success: true,
      provider: 'EXPO',
      providerMessageRef: 'ticket-123',
      responsePayload: expect.objectContaining({
        deviceCount: 1,
        successCount: 1,
        failureCount: 0,
        notificationId: 'notif-1',
        targetRole: 'PATIENT',
      }),
    });
  });

  it('revokes invalid Expo tokens when Expo marks the device as not registered', async () => {
    (repository.listActiveDevicesByUserAndRole as jest.Mock).mockResolvedValue([
      {
        deviceToken: 'ExponentPushToken[invalid-token]',
        provider: 'EXPO',
      },
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            status: 'error',
            message: 'Push token is invalid',
            details: { error: 'DeviceNotRegistered' },
          },
        ],
      }),
    });

    const result = await service.execute(baseNotification);

    expect(repository.revokeUserDevices).toHaveBeenCalledWith({
      userId: 'user-1',
      token: 'ExponentPushToken[invalid-token]',
    });
    expect(result).toEqual({
      success: false,
      provider: 'PUSH',
      errorCode: 'DeviceNotRegistered',
      errorMessage: 'DeviceNotRegistered',
      responsePayload: expect.objectContaining({
        deviceCount: 1,
        notificationId: 'notif-1',
        failureCount: 1,
      }),
    });
  });
});
