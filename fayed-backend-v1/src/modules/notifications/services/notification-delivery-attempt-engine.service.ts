import { Injectable, Logger } from '@nestjs/common';
import { DeliveryAttemptStatus } from '@prisma/client';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import {
  ChannelExecutionResult,
  NotificationChannelExecutionService,
} from './notification-channel-execution.service';
import { NotificationRetryPolicyService } from './notification-retry-policy.service';
import { NotificationDomainValidityGuardService } from './notification-domain-validity-guard.service';

type ExecutionOutcome = 'SENT' | 'FAILED' | 'SKIPPED';

@Injectable()
export class NotificationDeliveryAttemptEngineService {
  private readonly logger = new Logger(NotificationDeliveryAttemptEngineService.name);

  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly lifecycleService: NotificationLifecycleService,
    private readonly channelExecutionService: NotificationChannelExecutionService,
    private readonly retryPolicyService: NotificationRetryPolicyService,
    private readonly domainValidityGuardService: NotificationDomainValidityGuardService,
  ) {}

  async executeClaimedNotification(input: { notificationId: string; now?: Date }) {
    const now = input.now ?? new Date();
    const notification = await this.repository.findQueuedNotificationForExecution(
      input.notificationId,
    );

    if (!notification) {
      return this.buildResult(input.notificationId, 'SKIPPED', false, {
        reason: 'NOTIFICATION_NOT_QUEUED',
      });
    }

    this.lifecycleService.assertCanExecuteClaimedNotification(notification.status);

    const domainValidity = await this.domainValidityGuardService.evaluate(notification);
    if (!domainValidity.valid) {
      const suppressed = await this.repository.markQueuedNotificationSuppressed({
        notificationId: notification.id,
        reason: domainValidity.reason,
      });

      if (suppressed.count <= 0) {
        return this.buildResult(notification.id, 'SKIPPED', false, {
          reason: 'NOTIFICATION_ALREADY_PROCESSED',
        });
      }

      return this.buildResult(notification.id, 'SKIPPED', true, {
        reason: `SUPPRESSED_${domainValidity.reason}`,
      });
    }

    const attemptNumber =
      (await this.repository.getNextDeliveryAttemptNumber(notification.id)) + 1;

    const attempt = await this.repository.createDeliveryAttempt({
      notification: {
        connect: { id: notification.id },
      },
      provider: this.resolveProviderHint(notification.channel),
      attemptNumber,
      status: DeliveryAttemptStatus.PENDING,
      requestPayload: {
        channel: notification.channel,
      },
      attemptedAt: now,
    });

    const execution = await this.channelExecutionService.execute(notification);
    if (execution.success) {
      await this.repository.updateDeliveryAttempt(attempt.id, {
        status: DeliveryAttemptStatus.SENT,
        provider: execution.provider,
        providerMessageRef: execution.providerMessageRef ?? null,
        responsePayload: execution.responsePayload ?? undefined,
      });

      const sent = await this.repository.markQueuedNotificationSent({
        notificationId: notification.id,
        sentAt: now,
      });

      if (sent.count === 0) {
        return this.buildResult(notification.id, 'SKIPPED', false, {
          attemptId: attempt.id,
          reason: 'NOTIFICATION_ALREADY_PROCESSED',
        });
      }

      this.logger.log(`Notification ${notification.id} delivered via ${execution.provider}`);
      return this.buildResult(notification.id, 'SENT', true, {
        attemptId: attempt.id,
      });
    }

    const failure = await this.persistFailedAttempt({
      notificationId: notification.id,
      attemptId: attempt.id,
      execution,
      now,
      attemptNumber,
    });
    return this.buildResult(notification.id, failure.outcome, true, {
      attemptId: attempt.id,
      reason: failure.reason,
    });
  }

  async executeClaimedNotifications(input: {
    notificationIds: string[];
    now?: Date;
  }): Promise<{
    total: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    results: Array<{
      notificationId: string;
      outcome: ExecutionOutcome;
      executed: boolean;
      attemptId?: string;
      reason?: string;
    }>;
  }> {
    const now = input.now ?? new Date();
    const results: Array<{
      notificationId: string;
      outcome: ExecutionOutcome;
      executed: boolean;
      attemptId?: string;
      reason?: string;
    }> = [];

    for (const notificationId of input.notificationIds) {
      results.push(
        await this.executeClaimedNotification({
          notificationId,
          now,
        }),
      );
    }

    return {
      total: results.length,
      sentCount: results.filter((result) => result.outcome === 'SENT').length,
      failedCount: results.filter((result) => result.outcome === 'FAILED').length,
      skippedCount: results.filter((result) => result.outcome === 'SKIPPED').length,
      results,
    };
  }

  private async persistFailedAttempt(input: {
    notificationId: string;
    attemptId: string;
    execution: ChannelExecutionResult;
    now: Date;
    attemptNumber: number;
  }): Promise<{ outcome: ExecutionOutcome; reason: string }> {
    const retryDecision = this.retryPolicyService.evaluate({
      errorCode: input.execution.errorCode,
      attemptNumber: input.attemptNumber,
      now: input.now,
    });
    const reason =
      input.execution.errorCode ?? input.execution.errorMessage ?? 'DELIVERY_FAILED';

    await this.repository.updateDeliveryAttempt(input.attemptId, {
      status: DeliveryAttemptStatus.FAILED,
      provider: input.execution.provider,
      errorCode: reason,
      errorMessage: (input.execution.errorMessage ?? reason).slice(0, 1000),
      responsePayload: {
        ...(input.execution.responsePayload as Record<string, unknown> | undefined),
        retryDecision:
          retryDecision.kind === 'RETRY'
            ? {
                kind: retryDecision.kind,
                nextRetryAt: retryDecision.nextRetryAt.toISOString(),
                maxAttempts: retryDecision.maxAttempts,
                reasonCode: retryDecision.reasonCode,
              }
            : {
                kind: retryDecision.kind,
                maxAttempts: retryDecision.maxAttempts,
                reasonCode: retryDecision.reasonCode,
              },
      },
    });

    if (retryDecision.kind === 'RETRY') {
      const requeued = await this.repository.rescheduleQueuedNotificationForRetry({
        notificationId: input.notificationId,
        retryAt: retryDecision.nextRetryAt,
      });
      if (requeued.count > 0) {
        return { outcome: 'SKIPPED', reason: 'RETRY_SCHEDULED' };
      }
      return { outcome: 'SKIPPED', reason: 'NOTIFICATION_ALREADY_PROCESSED' };
    }

    await this.repository.markQueuedNotificationFailed({
      notificationId: input.notificationId,
      failedAt: input.now,
      reason,
    });
    return { outcome: 'FAILED', reason };
  }

  private resolveProviderHint(channel: string): string {
    if (channel === 'EMAIL') {
      return 'SMTP';
    }
    if (channel === 'IN_APP') {
      return 'IN_APP';
    }
    return 'UNKNOWN';
  }

  private buildResult(
    notificationId: string,
    outcome: ExecutionOutcome,
    executed: boolean,
    input?: { attemptId?: string; reason?: string },
  ) {
    return {
      notificationId,
      outcome,
      executed,
      attemptId: input?.attemptId,
      reason: input?.reason,
    };
  }
}
