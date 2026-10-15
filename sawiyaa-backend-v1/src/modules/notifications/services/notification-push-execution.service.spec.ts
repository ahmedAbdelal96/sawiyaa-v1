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
      provider: 'EXPO',
      providerOutcome: 'FAILED',
      reconciliationState: 'NOT_REQUIRED',
      errorCode: 'PUSH_DEVICE_NOT_REGISTERED',
      errorMessage: 'PUSH_DEVICE_NOT_REGISTERED',
      errorCategory: 'RECIPIENT_INVALID',
      providerErrorCode: 'PUSH_DEVICE_NOT_REGISTERED',
      providerSendAttempted: false,
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
      providerOutcome: 'ACCEPTED',
      reconciliationState: 'ACCEPTED',
      providerReferences: expect.any(Array),
      providerSendAttempted: true,
      responsePayload: expect.objectContaining({
        deviceCount: 1,
        successCount: 1,
        failureCount: 0,
        notificationId: 'notif-1',
        targetRole: 'PATIENT',
      }),
    });
    expect(result.providerReferences).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('ExponentPushToken');
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
      provider: 'EXPO',
      providerOutcome: 'FAILED',
      reconciliationState: 'NOT_REQUIRED',
      errorCode: 'DeviceNotRegistered',
      errorMessage: 'DeviceNotRegistered',
      errorCategory: 'RECIPIENT_INVALID',
      providerErrorCode: 'DeviceNotRegistered',
      providerSendAttempted: true,
      responsePayload: expect.objectContaining({
        deviceCount: 1,
        notificationId: 'notif-1',
        failureCount: 1,
      }),
    });
  });

  it('revokes the invalid token from the correct device across multiple Expo batches', async () => {
    const devices = Array.from({ length: 101 }, (_, index) => ({
      deviceToken: `ExponentPushToken[token-${index}]`,
      provider: 'EXPO',
    }));
    (repository.listActiveDevicesByUserAndRole as jest.Mock).mockResolvedValue(
      devices,
    );

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: Array.from({ length: 100 }, (_, index) => ({
            status: 'ok',
            id: `ticket-${index}`,
          })),
        }),
      })
      .mockResolvedValueOnce({
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

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(repository.revokeUserDevices).toHaveBeenCalledTimes(1);
    expect(repository.revokeUserDevices).toHaveBeenCalledWith({
      userId: 'user-1',
      token: 'ExponentPushToken[token-100]',
    });
    expect(result).toEqual({
      success: false,
      provider: 'EXPO',
      providerMessageRef: 'ticket-0',
      providerOutcome: 'PARTIAL',
      reconciliationState: 'PARTIAL',
      providerReferences: expect.any(Array),
      errorCode: 'DELIVERY_FAILED',
      errorMessage: 'EXPO_PUSH_PARTIAL_RESULT',
      errorCategory: 'RECIPIENT_INVALID',
      providerErrorCode: 'DeviceNotRegistered',
      providerSendAttempted: true,
      responsePayload: expect.objectContaining({
        deviceCount: 101,
        successCount: 100,
        failureCount: 1,
        notificationId: 'notif-1',
        targetRole: 'PATIENT',
      }),
    });
    expect(result.responsePayload).toEqual(
      expect.objectContaining({
        acceptedDeviceIds: expect.any(Array),
        failedDeviceIds: expect.any(Array),
      }),
    );
  });

  it('reconciles saved Expo tickets and does not resend accepted or invalid devices', async () => {
    (repository.listActiveDevicesByUserAndRole as jest.Mock).mockResolvedValue([
      {
        id: 'device-a',
        deviceToken: 'ExponentPushToken[accepted-token]',
        provider: 'EXPO',
      },
      {
        id: 'device-b',
        deviceToken: 'ExponentPushToken[invalid-token]',
        provider: 'EXPO',
      },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          'ticket-a': { status: 'ok' },
          'ticket-b': {
            status: 'error',
            details: { error: 'DeviceNotRegistered' },
          },
        },
      }),
    });

    const result = await service.execute(baseNotification, {
      operationKey: 'notification:notif-1',
      previousAttempt: {
        id: 'attempt-1',
        responsePayload: {
          providerOutcome: 'UNKNOWN',
          providerReferences: [
            {
              kind: 'EXPO_TICKET',
              value: 'ticket-a',
              deviceId: 'device-a',
              ticketId: 'ticket-a',
              status: 'ok',
            },
            {
              kind: 'EXPO_TICKET',
              value: 'ticket-b',
              deviceId: 'device-b',
              ticketId: 'ticket-b',
              status: 'ok',
            },
          ],
        },
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/getReceipts',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(repository.revokeUserDevices).toHaveBeenCalledWith({
      userId: 'user-1',
      deviceId: 'device-b',
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        providerOutcome: 'PARTIAL',
        reconciliationState: 'PARTIAL',
      }),
    );
  });

  it('does not resend the accepted device when a prior result was partial', async () => {
    (repository.listActiveDevicesByUserAndRole as jest.Mock).mockResolvedValue([
      {
        id: 'device-a',
        deviceToken: 'ExponentPushToken[accepted-token]',
        provider: 'EXPO',
      },
      {
        id: 'device-b',
        deviceToken: 'ExponentPushToken[retry-token]',
        provider: 'EXPO',
      },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-b-retry' }] }),
    });

    const result = await service.execute(baseNotification, {
      operationKey: 'notification:notif-1',
      previousAttempt: {
        id: 'attempt-partial',
        responsePayload: {
          providerOutcome: 'PARTIAL',
          acceptedDeviceIds: ['device-a'],
          providerReferences: [
            {
              kind: 'EXPO_TICKET',
              value: 'ticket-a',
              deviceId: 'device-a',
              ticketId: 'ticket-a',
              status: 'ok',
            },
          ],
        },
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const sentDevices = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body,
    ) as Array<{ to: string }>;
    expect(sentDevices).toEqual(
      [{ to: 'ExponentPushToken[retry-token]' }].map((item) =>
        expect.objectContaining(item),
      ),
    );
    expect(result.providerOutcome).toBe('ACCEPTED');
  });

  it('classifies an Expo HTTP 429 as rate limited instead of unknown', async () => {
    (repository.listActiveDevicesByUserAndRole as jest.Mock).mockResolvedValue([
      {
        id: 'device-rate',
        deviceToken: 'ExponentPushToken[rate]',
        provider: 'EXPO',
      },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (name: string) => (name === 'retry-after' ? '20' : null),
      },
    });

    const result = await service.execute(baseNotification);

    expect(result).toEqual(
      expect.objectContaining({
        providerOutcome: 'FAILED',
        errorCategory: 'RATE_LIMITED',
        retryAfterMs: 20_000,
        providerErrorCode: 'HTTP_429',
      }),
    );
  });

  it('returns UNKNOWN when an Expo request hangs beyond the bounded provider budget', async () => {
    jest.useFakeTimers();
    try {
      (
        repository.listActiveDevicesByUserAndRole as jest.Mock
      ).mockResolvedValue([
        {
          id: 'device-timeout',
          deviceToken: 'ExponentPushToken[timeout-token]',
          provider: 'EXPO',
        },
      ]);
      (global.fetch as jest.Mock).mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new Error('AbortError')),
            );
          }),
      );

      const resultPromise = service.execute(baseNotification);
      await jest.advanceTimersByTimeAsync(10_000);
      const result = await resultPromise;

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          provider: 'EXPO',
          providerOutcome: 'UNKNOWN',
          errorCode: 'EXPO_PUSH_OUTCOME_UNKNOWN',
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
