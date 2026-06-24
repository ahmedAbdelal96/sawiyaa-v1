import { NotificationDeliveryAttemptEngineService } from './notification-delivery-attempt-engine.service';
import { NotificationSchedulerCoreService } from './notification-scheduler-core.service';
import { NotificationDeliveryRunnerService } from './notification-delivery-runner.service';

describe('NotificationDeliveryRunnerService', () => {
  const claimDueNotifications = jest.fn();
  const executeClaimedNotifications = jest.fn();

  const schedulerCoreService = {
    claimDueNotifications,
  } as unknown as NotificationSchedulerCoreService;
  const deliveryAttemptEngineService = {
    executeClaimedNotifications,
  } as unknown as NotificationDeliveryAttemptEngineService;

  const service = new NotificationDeliveryRunnerService(
    schedulerCoreService,
    deliveryAttemptEngineService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claims pending email notifications and executes them asynchronously', async () => {
    claimDueNotifications.mockResolvedValue({
      scannedCount: 1,
      claimedCount: 1,
      claimedNotificationIds: ['notif_1'],
    });
    executeClaimedNotifications.mockResolvedValue({
      total: 1,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 0,
      results: [
        {
          notificationId: 'notif_1',
          outcome: 'SENT',
          executed: true,
          attemptId: 'attempt_1',
        },
      ],
    });

    const result = await service.runOnce(new Date('2026-05-02T08:00:00.000Z'));

    expect(claimDueNotifications).toHaveBeenCalledWith({
      now: new Date('2026-05-02T08:00:00.000Z'),
      limit: 25,
    });
    expect(executeClaimedNotifications).toHaveBeenCalledWith({
      notificationIds: ['notif_1'],
      now: new Date('2026-05-02T08:00:00.000Z'),
    });
    expect(result).toEqual({
      claimedCount: 1,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });
  });

  it('does not re-send if a later run finds nothing claimable', async () => {
    claimDueNotifications
      .mockResolvedValueOnce({
        scannedCount: 1,
        claimedCount: 1,
        claimedNotificationIds: ['notif_1'],
      })
      .mockResolvedValueOnce({
        scannedCount: 1,
        claimedCount: 0,
        claimedNotificationIds: [],
      });
    executeClaimedNotifications.mockResolvedValue({
      total: 1,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 0,
      results: [],
    });

    await service.runOnce(new Date('2026-05-02T08:00:00.000Z'));
    const second = await service.runOnce(new Date('2026-05-02T08:01:00.000Z'));

    expect(second).toEqual({
      claimedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });
    expect(executeClaimedNotifications).toHaveBeenCalledTimes(1);
  });
});
