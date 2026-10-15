import { NotificationDeliveryAttemptEngineService } from './notification-delivery-attempt-engine.service';
import { NotificationDeliveryResilienceMetricsService } from './notification-delivery-resilience-metrics.service';
import { NotificationStaleQueuedReconcilerService } from './notification-stale-queued-reconciler.service';
import { NotificationSchedulerCoreService } from './notification-scheduler-core.service';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

describe('NotificationStaleQueuedReconcilerService', () => {
  it('recovers bounded stale batches through the shared claim and execution path', async () => {
    const scheduler = {
      claimStaleQueuedNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          scannedCount: 2,
          claimedCount: 2,
          claims: [
            {
              notificationId: 'n1',
              claimToken: 'claim-1',
              claimedAt: new Date(),
              claimUntil: new Date(Date.now() + 60_000),
            },
            {
              notificationId: 'n2',
              claimToken: 'claim-2',
              claimedAt: new Date(),
              claimUntil: new Date(Date.now() + 60_000),
            },
          ],
        })
        .mockResolvedValueOnce({
          scannedCount: 0,
          claimedCount: 0,
          claims: [],
        }),
    } as unknown as NotificationSchedulerCoreService;
    const executeClaimedNotifications = jest.fn().mockResolvedValue({
      total: 2,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 1,
      results: [],
    });
    const engine = {
      executeClaimedNotifications,
    } as unknown as NotificationDeliveryAttemptEngineService;
    const repository = {
      findOldestQueuedCreatedAt: jest.fn().mockResolvedValue({
        createdAt: new Date('2026-10-14T11:59:59.000Z'),
      }),
    } as unknown as OperationalNotificationRepository;
    const metrics = new NotificationDeliveryResilienceMetricsService();
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'notificationQueue.staleQueuedReconcilerEnabled') {
          return true;
        }
        return undefined;
      }),
    } as never;

    const service = new NotificationStaleQueuedReconcilerService(
      scheduler,
      engine,
      repository,
      config,
      metrics,
    );

    await expect(
      service.runOnce(new Date('2026-10-14T12:00:00.000Z')),
    ).resolves.toMatchObject({
      scannedCount: 2,
      recoveredCount: 2,
      sentCount: 1,
      skippedCount: 1,
    });
    expect(executeClaimedNotifications).toHaveBeenCalledTimes(1);
    expect(metrics.snapshot()).toMatchObject({
      notificationLeaseExpiredTotal: 2,
      notificationStaleQueuedTotal: 2,
      notificationRecoveredTotal: 2,
      notificationOldestQueuedSeconds: 1,
    });
  });
});
