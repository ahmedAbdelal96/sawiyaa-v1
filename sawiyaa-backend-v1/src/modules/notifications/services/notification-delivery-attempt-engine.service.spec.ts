import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import { NotificationChannelExecutionService } from './notification-channel-execution.service';
import { NotificationDeliveryAttemptEngineService } from './notification-delivery-attempt-engine.service';
import { NotificationRetryPolicyService } from './notification-retry-policy.service';
import { NotificationDomainValidityGuardService } from './notification-domain-validity-guard.service';

describe('NotificationDeliveryAttemptEngineService', () => {
  const repository = {
    findQueuedNotificationForExecution: jest.fn(),
    getNextDeliveryAttemptNumber: jest.fn(),
    createDeliveryAttempt: jest.fn(),
    updateDeliveryAttempt: jest.fn(),
    markQueuedNotificationSent: jest.fn(),
    markQueuedNotificationSuppressed: jest.fn(),
    rescheduleQueuedNotificationForRetry: jest.fn(),
    markQueuedNotificationFailed: jest.fn(),
  } as unknown as OperationalNotificationRepository;

  const lifecycleService = {
    assertCanExecuteClaimedNotification: jest.fn(),
  } as unknown as NotificationLifecycleService;

  const channelExecutionService = {
    execute: jest.fn(),
  } as unknown as NotificationChannelExecutionService;
  const retryPolicyService = {
    evaluate: jest.fn(),
  } as unknown as NotificationRetryPolicyService;
  const domainValidityGuardService = {
    evaluate: jest.fn(),
  } as unknown as NotificationDomainValidityGuardService;

  const service = new NotificationDeliveryAttemptEngineService(
    repository,
    lifecycleService,
    channelExecutionService,
    retryPolicyService,
    domainValidityGuardService,
  );

  const queuedBase = {
    id: 'n1',
    userId: 'user_1',
    channel: NotificationChannel.IN_APP,
    status: NotificationStatus.QUEUED,
    titleSnapshot: 'Title',
    subjectSnapshot: null,
    bodySnapshot: 'Body',
    payloadJson: {},
    relatedEntityType: 'SESSION',
    relatedEntityId: 'session_1',
    notificationType: {
      slug: 'sessions.session-reminder-60',
      category: 'SESSION',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repository.getNextDeliveryAttemptNumber as jest.Mock).mockResolvedValue(0);
    (repository.createDeliveryAttempt as jest.Mock).mockResolvedValue({
      id: 'a1',
    });
    (repository.markQueuedNotificationSent as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (
      repository.rescheduleQueuedNotificationForRetry as jest.Mock
    ).mockResolvedValue({
      count: 1,
    });
    (
      repository.markQueuedNotificationSuppressed as jest.Mock
    ).mockResolvedValue({
      count: 1,
    });
    (repository.markQueuedNotificationFailed as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (repository.updateDeliveryAttempt as jest.Mock).mockResolvedValue({});
    (retryPolicyService.evaluate as jest.Mock).mockReturnValue({
      kind: 'TERMINAL',
      maxAttempts: 3,
      reasonCode: 'MAIL_SEND_FAILED',
    });
    (domainValidityGuardService.evaluate as jest.Mock).mockResolvedValue({
      valid: true,
    });
  });

  it('creates attempt and marks notification sent for in-app success', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue(queuedBase);
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: true,
      provider: 'IN_APP',
    });

    const result = await service.executeClaimedNotification({
      notificationId: 'n1',
      now: new Date('2026-05-01T08:00:00.000Z'),
    });

    expect(repository.createDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: { connect: { id: 'n1' } },
        attemptNumber: 1,
      }),
    );
    expect(repository.markQueuedNotificationSent).toHaveBeenCalledWith({
      notificationId: 'n1',
      sentAt: new Date('2026-05-01T08:00:00.000Z'),
    });
    expect(result).toEqual(
      expect.objectContaining({
        notificationId: 'n1',
        outcome: 'SENT',
        executed: true,
      }),
    );
  });

  it('executes email channel and persists successful attempt outcome', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue({
      ...queuedBase,
      id: 'n2',
      channel: NotificationChannel.EMAIL,
      payloadJson: { target: 'user@example.com' },
    });
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: true,
      provider: 'SMTP',
      responsePayload: { deliveryTarget: 'user@example.com' },
    });

    await service.executeClaimedNotification({
      notificationId: 'n2',
    });

    expect(channelExecutionService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'n2',
        channel: NotificationChannel.EMAIL,
      }),
    );
    expect(repository.updateDeliveryAttempt).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        status: 'SENT',
        provider: 'SMTP',
      }),
    );
  });

  it('maps failed channel execution to failed attempt + failed notification', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue({
      ...queuedBase,
      id: 'n3',
      channel: NotificationChannel.EMAIL,
    });
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: false,
      provider: 'SMTP',
      errorCode: 'MAIL_SEND_FAILED',
      errorMessage: 'MAIL_SEND_FAILED',
    });

    const result = await service.executeClaimedNotification({
      notificationId: 'n3',
      now: new Date('2026-05-01T08:00:00.000Z'),
    });

    expect(repository.markQueuedNotificationFailed).toHaveBeenCalledWith({
      notificationId: 'n3',
      failedAt: new Date('2026-05-01T08:00:00.000Z'),
      reason: 'MAIL_SEND_FAILED',
    });
    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'FAILED',
        executed: true,
      }),
    );
  });

  it('reschedules retryable failure with bounded retry state transition', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue({
      ...queuedBase,
      id: 'n5',
      channel: NotificationChannel.EMAIL,
      payloadJson: { target: 'user@example.com' },
    });
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: false,
      provider: 'SMTP',
      errorCode: 'MAIL_SEND_FAILED',
      errorMessage: 'MAIL_SEND_FAILED',
    });
    (retryPolicyService.evaluate as jest.Mock).mockReturnValue({
      kind: 'RETRY',
      maxAttempts: 3,
      reasonCode: 'MAIL_SEND_FAILED',
      nextRetryAt: new Date('2026-05-01T08:05:00.000Z'),
    });
    (
      repository.rescheduleQueuedNotificationForRetry as jest.Mock
    ).mockResolvedValue({
      count: 1,
    });

    const result = await service.executeClaimedNotification({
      notificationId: 'n5',
      now: new Date('2026-05-01T08:00:00.000Z'),
    });

    expect(
      repository.rescheduleQueuedNotificationForRetry,
    ).toHaveBeenCalledWith({
      notificationId: 'n5',
      retryAt: new Date('2026-05-01T08:05:00.000Z'),
    });
    expect(repository.markQueuedNotificationFailed).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'SKIPPED',
        executed: true,
        reason: 'RETRY_SCHEDULED',
      }),
    );
  });

  it('skips execution when notification is not queued or missing', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue(null);

    const result = await service.executeClaimedNotification({
      notificationId: 'missing',
    });

    expect(result).toEqual({
      notificationId: 'missing',
      outcome: 'SKIPPED',
      executed: false,
      attemptId: undefined,
      reason: 'NOTIFICATION_NOT_QUEUED',
    });
    expect(repository.createDeliveryAttempt).not.toHaveBeenCalled();
  });

  it('suppresses invalid notification without creating attempt or sending', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue({
      ...queuedBase,
      id: 'n6',
    });
    (domainValidityGuardService.evaluate as jest.Mock).mockResolvedValue({
      valid: false,
      reason: 'SESSION_STATUS_CANCELLED',
    });

    const result = await service.executeClaimedNotification({
      notificationId: 'n6',
    });

    expect(repository.markQueuedNotificationSuppressed).toHaveBeenCalledWith({
      notificationId: 'n6',
      reason: 'SESSION_STATUS_CANCELLED',
    });
    expect(repository.createDeliveryAttempt).not.toHaveBeenCalled();
    expect(channelExecutionService.execute).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'SKIPPED',
        executed: true,
        reason: 'SUPPRESSED_SESSION_STATUS_CANCELLED',
      }),
    );
  });

  it('prevents duplicate execution in same boundary when second run cannot re-queue', async () => {
    (repository.findQueuedNotificationForExecution as jest.Mock)
      .mockResolvedValueOnce({ ...queuedBase, id: 'n4' })
      .mockResolvedValueOnce(null);
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: true,
      provider: 'IN_APP',
    });

    const first = await service.executeClaimedNotification({
      notificationId: 'n4',
    });
    const second = await service.executeClaimedNotification({
      notificationId: 'n4',
    });

    expect(first.outcome).toBe('SENT');
    expect(second).toEqual(
      expect.objectContaining({
        notificationId: 'n4',
        outcome: 'SKIPPED',
        reason: 'NOTIFICATION_NOT_QUEUED',
      }),
    );
  });
});
