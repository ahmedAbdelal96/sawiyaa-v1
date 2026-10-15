import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import { NotificationChannelExecutionService } from './notification-channel-execution.service';
import { NotificationDeliveryAttemptEngineService } from './notification-delivery-attempt-engine.service';
import { NotificationRetryPolicyService } from './notification-retry-policy.service';
import { NotificationDomainValidityGuardService } from './notification-domain-validity-guard.service';
import { NotificationRealtimePublisher } from './notification-realtime.publisher';

describe('NotificationDeliveryAttemptEngineService', () => {
  const repository = {
    findQueuedNotificationForExecution: jest.fn(),
    findLatestDeliveryAttempt: jest.fn(),
    createDeliveryAttemptWithNextNumber: jest.fn(),
    createDeliveryAttempt: jest.fn(),
    updateDeliveryAttempt: jest.fn(),
    updateDeliveryAttemptWithClaim: jest.fn(),
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
  const notificationRealtimePublisher = {
    publish: jest.fn(),
  } as unknown as NotificationRealtimePublisher;

  const service = new NotificationDeliveryAttemptEngineService(
    repository,
    lifecycleService,
    channelExecutionService,
    retryPolicyService,
    domainValidityGuardService,
    notificationRealtimePublisher,
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
    (repository.findLatestDeliveryAttempt as jest.Mock).mockResolvedValue(null);
    (
      repository.createDeliveryAttemptWithNextNumber as jest.Mock
    ).mockResolvedValue({
      id: 'a1',
      attemptNumber: 1,
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

    expect(repository.createDeliveryAttemptWithNextNumber).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: { connect: { id: 'n1' } },
      }),
    );
    expect(repository.markQueuedNotificationSent).toHaveBeenCalledWith({
      notificationId: 'n1',
      sentAt: new Date('2026-05-01T08:00:00.000Z'),
    });
    expect(notificationRealtimePublisher.publish).toHaveBeenCalledWith(
      'user_1',
      {
        notificationId: 'n1',
        typeSlug: 'sessions.session-reminder-60',
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
        createdAt: '2026-05-01T08:00:00.000Z',
      },
    );
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
      expect.objectContaining({
        operationKey: 'notification:n2',
        idempotencyKey: 'n2',
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

  it('does not allocate a new attempt when reconciliation accepts without a provider send', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue(queuedBase);
    (repository.findLatestDeliveryAttempt as jest.Mock).mockResolvedValue({
      id: 'attempt-unknown',
      notificationId: 'n1',
      provider: 'EXPO',
      attemptNumber: 2,
      status: 'PENDING',
      providerMessageRef: null,
      requestPayload: { provider: 'EXPO' },
      responsePayload: { providerOutcome: 'UNKNOWN' },
    });
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: true,
      provider: 'EXPO',
      providerOutcome: 'ACCEPTED',
      reconciliationState: 'ACCEPTED',
      providerSendAttempted: false,
    });

    const result = await service.executeClaimedNotification({
      notificationId: 'n1',
      now: new Date('2026-05-01T08:00:00.000Z'),
    });

    expect(
      repository.createDeliveryAttemptWithNextNumber,
    ).not.toHaveBeenCalled();
    expect(repository.updateDeliveryAttempt).toHaveBeenCalledWith(
      'attempt-unknown',
      expect.objectContaining({ status: NotificationStatus.SENT }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'SENT',
        reason: 'PROVIDER_RECONCILIATION_ACCEPTED',
        attemptId: 'attempt-unknown',
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
    expect(notificationRealtimePublisher.publish).not.toHaveBeenCalled();
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
    expect(notificationRealtimePublisher.publish).toHaveBeenCalledTimes(1);
    expect(second).toEqual(
      expect.objectContaining({
        notificationId: 'n4',
        outcome: 'SKIPPED',
        reason: 'NOTIFICATION_NOT_QUEUED',
      }),
    );
  });

  it('finalizes a previously accepted provider result without sending again', async () => {
    (repository.findQueuedNotificationForExecution as jest.Mock)
      .mockResolvedValueOnce({ ...queuedBase, id: 'accepted-recovery' })
      .mockResolvedValueOnce({ ...queuedBase, id: 'accepted-recovery' });
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: true,
      provider: 'BREVO',
      providerOutcome: 'ACCEPTED',
      providerMessageRef: 'brevo-message-1',
    });
    (repository.markQueuedNotificationSent as jest.Mock)
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    (repository.findLatestDeliveryAttempt as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'a1',
        status: 'SENT',
        responsePayload: {
          providerOutcome: 'ACCEPTED',
          providerMessageRef: 'brevo-message-1',
        },
      });

    const first = await service.executeClaimedNotification({
      notificationId: 'accepted-recovery',
    });
    const second = await service.executeClaimedNotification({
      notificationId: 'accepted-recovery',
    });

    expect(first.reason).toBe('NOTIFICATION_ALREADY_PROCESSED');
    expect(second.outcome).toBe('SENT');
    expect(channelExecutionService.execute).toHaveBeenCalledTimes(1);
  });

  it('preserves an accepted provider result as UNKNOWN when attempt persistence fails', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue({
      ...queuedBase,
      id: 'persist-recovery',
      channel: NotificationChannel.EMAIL,
      payloadJson: { target: 'user@example.com' },
    });
    (channelExecutionService.execute as jest.Mock).mockResolvedValue({
      success: true,
      provider: 'BREVO',
      providerOutcome: 'ACCEPTED',
      providerMessageRef: 'brevo-message-2',
    });
    (repository.updateDeliveryAttempt as jest.Mock)
      .mockRejectedValueOnce(new Error('database write failed'))
      .mockResolvedValue({});

    const result = await service.executeClaimedNotification({
      notificationId: 'persist-recovery',
      now: new Date('2026-05-01T08:00:00.000Z'),
    });

    expect(result.reason).toBe('UNKNOWN_RECONCILIATION_SCHEDULED');
    expect(repository.updateDeliveryAttempt).toHaveBeenCalledTimes(3);
    expect(repository.markQueuedNotificationSent).not.toHaveBeenCalled();
    expect(channelExecutionService.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'persist-recovery' }),
      expect.objectContaining({
        operationKey: 'notification:persist-recovery',
        idempotencyKey: 'persist-recovery',
      }),
    );
  });

  it('quarantines an unresolved Brevo outcome after the idempotency window expires', async () => {
    (
      repository.findQueuedNotificationForExecution as jest.Mock
    ).mockResolvedValue({
      ...queuedBase,
      id: 'expired-brevo',
      channel: NotificationChannel.EMAIL,
      payloadJson: { target: 'user@example.com' },
    });
    (repository.findLatestDeliveryAttempt as jest.Mock).mockResolvedValue({
      id: 'previous-attempt',
      status: 'PENDING',
      requestPayload: {
        provider: 'BREVO',
        requestStartedAt: '2026-05-01T07:00:00.000Z',
      },
      responsePayload: { providerOutcome: 'UNKNOWN' },
    });

    const result = await service.executeClaimedNotification({
      notificationId: 'expired-brevo',
      now: new Date('2026-05-01T08:00:00.000Z'),
    });

    expect(result.reason).toBe('BREVO_IDEMPOTENCY_WINDOW_EXPIRED');
    expect(repository.markQueuedNotificationSuppressed).toHaveBeenCalledWith({
      notificationId: 'expired-brevo',
      reason: 'PROVIDER_OUTCOME_UNKNOWN',
    });
    expect(channelExecutionService.execute).not.toHaveBeenCalled();
    expect(
      repository.createDeliveryAttemptWithNextNumber,
    ).not.toHaveBeenCalled();
  });
});
