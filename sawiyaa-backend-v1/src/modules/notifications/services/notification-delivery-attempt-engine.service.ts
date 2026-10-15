import { Injectable, Logger, Optional } from '@nestjs/common';
import { DeliveryAttemptStatus } from '@prisma/client';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { NotificationExecutionClaim } from '../repositories/operational-notification.repository';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import {
  ChannelExecutionResult,
  NotificationChannelExecutionService,
} from './notification-channel-execution.service';
import { NotificationRetryPolicyService } from './notification-retry-policy.service';
import { NotificationDomainValidityGuardService } from './notification-domain-validity-guard.service';
import { NotificationRealtimePublisher } from './notification-realtime.publisher';
import {
  NotificationProviderExecutionContext,
  NotificationProviderOutcome,
} from './notification-provider-outcome';
import { NotificationDeliveryResilienceMetricsService } from './notification-delivery-resilience-metrics.service';

type ExecutionOutcome = 'SENT' | 'FAILED' | 'SKIPPED';

@Injectable()
export class NotificationDeliveryAttemptEngineService {
  private readonly logger = new Logger(
    NotificationDeliveryAttemptEngineService.name,
  );

  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly lifecycleService: NotificationLifecycleService,
    private readonly channelExecutionService: NotificationChannelExecutionService,
    private readonly retryPolicyService: NotificationRetryPolicyService,
    private readonly domainValidityGuardService: NotificationDomainValidityGuardService,
    private readonly notificationRealtimePublisher: NotificationRealtimePublisher,
    @Optional()
    private readonly metrics?: NotificationDeliveryResilienceMetricsService,
  ) {}

  async executeClaimedNotification(input: {
    notificationId: string;
    claimToken?: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const finalizationNow = input.claimToken ? new Date() : now;
    const notification =
      await this.repository.findQueuedNotificationForExecution(
        input.claimToken
          ? {
              notificationId: input.notificationId,
              claimToken: input.claimToken,
              now,
            }
          : input.notificationId,
      );

    if (!notification) {
      return this.buildResult(input.notificationId, 'SKIPPED', false, {
        reason: 'NOTIFICATION_NOT_QUEUED',
      });
    }

    this.lifecycleService.assertCanExecuteClaimedNotification(
      notification.status,
    );

    const latestAttempt =
      this.repository.findLatestDeliveryAttempt?.(notification.id) ?? null;
    const previousAttempt = await latestAttempt;
    const previousOutcome = this.readProviderOutcome(
      previousAttempt?.responsePayload,
    );

    if (
      previousAttempt &&
      (previousAttempt.status === DeliveryAttemptStatus.SENT ||
        previousOutcome === 'ACCEPTED')
    ) {
      this.metrics?.recordProviderReconciliation('ACCEPTED');
      const sent = await this.repository.markQueuedNotificationSent({
        notificationId: notification.id,
        sentAt: finalizationNow,
        ...(input.claimToken ? { claimToken: input.claimToken } : {}),
      });
      if (sent.count === 0) {
        this.metrics?.recordProviderAcceptedFinalizationRetry();
        return this.buildResult(notification.id, 'SKIPPED', false, {
          attemptId: previousAttempt.id,
          reason: 'CLAIM_LOST_DURING_FINALIZATION',
        });
      }
      return this.buildResult(notification.id, 'SENT', true, {
        attemptId: previousAttempt.id,
        reason: 'PROVIDER_ACCEPTED_RECOVERED',
      });
    }

    if (
      previousAttempt &&
      this.isExpiredBrevoReconciliationWindow(previousAttempt, now)
    ) {
      const quarantined =
        await this.repository.markQueuedNotificationSuppressed({
          notificationId: notification.id,
          reason: 'PROVIDER_OUTCOME_UNKNOWN',
          ...(input.claimToken
            ? { claimToken: input.claimToken, now: finalizationNow }
            : {}),
        });
      return this.buildResult(
        notification.id,
        'SKIPPED',
        quarantined.count > 0,
        {
          attemptId: previousAttempt.id,
          reason: 'BREVO_IDEMPOTENCY_WINDOW_EXPIRED',
        },
      );
    }

    const domainValidity =
      await this.domainValidityGuardService.evaluate(notification);
    if (!domainValidity.valid) {
      const suppressed = await this.repository.markQueuedNotificationSuppressed(
        {
          notificationId: notification.id,
          reason: domainValidity.reason,
          ...(input.claimToken
            ? { claimToken: input.claimToken, now: finalizationNow }
            : {}),
        },
      );

      if (suppressed.count <= 0) {
        return this.buildResult(notification.id, 'SKIPPED', false, {
          reason: 'NOTIFICATION_ALREADY_PROCESSED',
        });
      }

      return this.buildResult(notification.id, 'SKIPPED', true, {
        reason: `SUPPRESSED_${domainValidity.reason}`,
      });
    }

    const operationKey = `notification:${notification.id}`;
    const idempotencyKey =
      notification.channel === 'EMAIL' ? notification.id : undefined;
    const executionContext: NotificationProviderExecutionContext = {
      operationKey,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(previousAttempt ? { previousAttempt } : {}),
      ...(this.readAcceptedDeviceIds(previousAttempt?.responsePayload).length >
      0
        ? {
            excludedDeviceIds: this.readAcceptedDeviceIds(
              previousAttempt?.responsePayload,
            ),
          }
        : {}),
    };
    // A push receipt reconciliation can resolve an UNKNOWN attempt without
    // sending anything. Run that reconciliation before allocating another
    // DeliveryAttempt so attempt numbers continue to represent provider sends.
    let preflightExecution: ChannelExecutionResult | undefined;
    if (previousAttempt && previousOutcome === 'UNKNOWN') {
      preflightExecution = await this.channelExecutionService.execute(
        notification,
        executionContext,
      );
      if (preflightExecution.providerSendAttempted === false) {
        const execution: ChannelExecutionResult = {
          ...preflightExecution,
          providerOutcome:
            preflightExecution.providerOutcome ??
            (preflightExecution.success ? 'ACCEPTED' : 'FAILED'),
        };
        this.metrics?.recordProviderOutcome(execution.providerOutcome);
        if (execution.reconciliationState === 'ACCEPTED') {
          this.metrics?.recordProviderReconciliation('ACCEPTED');
          return this.persistReconciledOutcomeWithoutNewAttempt({
            notification,
            previousAttempt,
            execution,
            finalizationNow,
            claimToken: input.claimToken,
          });
        }
        if (execution.providerOutcome === 'UNKNOWN') {
          this.metrics?.recordProviderReconciliation('UNKNOWN');
          return this.persistUnknownOutcome({
            notificationId: notification.id,
            attemptId: previousAttempt.id,
            attemptNumber: previousAttempt.attemptNumber,
            execution,
            now,
            finalizationAt: finalizationNow,
            claimToken: input.claimToken,
            notificationTypeSlug: notification.notificationType.slug,
            scheduledFor: notification.scheduledFor,
          });
        }
        return this.persistReconciledOutcomeWithoutNewAttempt({
          notification,
          previousAttempt,
          execution,
          finalizationNow,
          claimToken: input.claimToken,
        });
      }
    }
    const attemptData = {
      notification: {
        connect: { id: notification.id },
      },
      provider:
        this.channelExecutionService.getProviderHint?.(notification.channel) ??
        this.resolveProviderHint(notification.channel),
      status: DeliveryAttemptStatus.PENDING,
      requestPayload: {
        channel: notification.channel,
        operationKey,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        requestStartedAt: now.toISOString(),
      },
      attemptedAt: now,
    };
    const attempt =
      await this.repository.createDeliveryAttemptWithNextNumber(attemptData);
    const attemptNumber = attempt.attemptNumber ?? 1;
    const rawExecution =
      preflightExecution ??
      (await this.channelExecutionService.execute(
        notification,
        executionContext,
      ));
    const execution: ChannelExecutionResult = {
      ...rawExecution,
      providerOutcome:
        rawExecution.providerOutcome ??
        (rawExecution.success ? 'ACCEPTED' : 'FAILED'),
    };
    this.metrics?.recordProviderOutcome(execution.providerOutcome);
    if (execution.reconciliationState === 'ACCEPTED') {
      this.metrics?.recordProviderReconciliation('ACCEPTED');
    } else if (execution.reconciliationState === 'PENDING') {
      this.metrics?.recordProviderReconciliation('UNKNOWN');
    }

    if (execution.providerOutcome === 'UNKNOWN') {
      return this.persistUnknownOutcome({
        notificationId: notification.id,
        attemptId: attempt.id,
        attemptNumber,
        execution,
        now,
        finalizationAt: finalizationNow,
        claimToken: input.claimToken,
        notificationTypeSlug: notification.notificationType.slug,
        scheduledFor: notification.scheduledFor,
      });
    }

    if (execution.providerOutcome === 'PARTIAL') {
      return this.persistPartialOutcome({
        notificationId: notification.id,
        attemptId: attempt.id,
        attemptNumber,
        execution,
        now,
        finalizationAt: finalizationNow,
        claimToken: input.claimToken,
        notificationTypeSlug: notification.notificationType.slug,
        scheduledFor: notification.scheduledFor,
      });
    }

    if (execution.success && execution.providerOutcome === 'ACCEPTED') {
      let updated: { count: number };
      try {
        updated = await this.updateAttempt({
          attemptId: attempt.id,
          notificationId: notification.id,
          claimToken: input.claimToken,
          now: new Date(),
          data: {
            status: DeliveryAttemptStatus.SENT,
            provider: execution.provider,
            providerMessageRef: execution.providerMessageRef ?? null,
            responsePayload: this.withOutcomeMetadata(execution),
          },
        });
      } catch (error) {
        // The provider may already have accepted the operation. Preserve that
        // evidence as UNKNOWN when the first attempt write fails so recovery
        // does not blindly invoke a non-idempotent provider again.
        const recoveryExecution: ChannelExecutionResult = {
          ...execution,
          success: false,
          providerOutcome: 'UNKNOWN',
          reconciliationState:
            execution.provider === 'SMTP' ? 'NOT_REQUIRED' : 'PENDING',
          errorCode: 'PROVIDER_OUTCOME_UNKNOWN',
          errorMessage: 'PROVIDER_RESULT_PERSISTENCE_FAILED',
        };
        try {
          const recovered = await this.updateAttempt({
            attemptId: attempt.id,
            notificationId: notification.id,
            claimToken: input.claimToken,
            now: new Date(),
            data: {
              status: DeliveryAttemptStatus.PENDING,
              provider: recoveryExecution.provider,
              providerMessageRef: recoveryExecution.providerMessageRef ?? null,
              errorCode: recoveryExecution.errorCode,
              errorMessage: recoveryExecution.errorMessage,
              responsePayload: this.withOutcomeMetadata(recoveryExecution),
            },
          });
          if (recovered.count > 0) {
            return this.persistUnknownOutcome({
              notificationId: notification.id,
              attemptId: attempt.id,
              attemptNumber,
              execution: recoveryExecution,
              now,
              finalizationAt: finalizationNow,
              claimToken: input.claimToken,
            });
          }
        } catch {
          // Preserve the original persistence error when the recovery write is
          // also unavailable; the reconciler can inspect the pending attempt.
        }
        throw error;
      }
      if (updated.count === 0) {
        return this.buildResult(notification.id, 'SKIPPED', false, {
          attemptId: attempt.id,
          reason: 'CLAIM_LOST_BEFORE_ATTEMPT_PERSISTENCE',
        });
      }

      const sent = await this.repository.markQueuedNotificationSent({
        notificationId: notification.id,
        sentAt: finalizationNow,
        ...(input.claimToken ? { claimToken: input.claimToken } : {}),
      });

      if (sent.count === 0) {
        this.metrics?.recordProviderAcceptedFinalizationRetry();
        return this.buildResult(notification.id, 'SKIPPED', false, {
          attemptId: attempt.id,
          reason: 'NOTIFICATION_ALREADY_PROCESSED',
        });
      }

      if (notification.channel === 'IN_APP') {
        this.notificationRealtimePublisher.publish(notification.userId, {
          notificationId: notification.id,
          typeSlug: notification.notificationType.slug,
          relatedEntityType: notification.relatedEntityType ?? 'SYSTEM',
          relatedEntityId: notification.relatedEntityId ?? notification.id,
          createdAt: finalizationNow.toISOString(),
        });
      }

      this.logger.log(
        `Notification ${notification.id} delivered via ${execution.provider}`,
      );
      return this.buildResult(notification.id, 'SENT', true, {
        attemptId: attempt.id,
      });
    }

    const failure = await this.persistFailedAttempt({
      notificationId: notification.id,
      attemptId: attempt.id,
      execution,
      now,
      finalizationAt: finalizationNow,
      attemptNumber,
      claimToken: input.claimToken,
      notificationTypeSlug: notification.notificationType.slug,
      scheduledFor: notification.scheduledFor,
    });
    return this.buildResult(notification.id, failure.outcome, true, {
      attemptId: attempt.id,
      reason: failure.reason,
    });
  }

  async executeClaimedNotifications(input: {
    notificationIds?: string[];
    claims?: NotificationExecutionClaim[];
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

    const claims =
      input.claims ??
      (input.notificationIds ?? []).map((notificationId) => ({
        notificationId,
        claimToken: '',
        claimedAt: now,
        claimUntil: now,
      }));

    const executionResults = await Promise.all(
      claims.map((claim) =>
        this.executeClaimedNotification({
          notificationId: claim.notificationId,
          ...(claim.claimToken ? { claimToken: claim.claimToken } : {}),
          now,
        }),
      ),
    );
    results.push(...executionResults);

    return {
      total: results.length,
      sentCount: results.filter((result) => result.outcome === 'SENT').length,
      failedCount: results.filter((result) => result.outcome === 'FAILED')
        .length,
      skippedCount: results.filter((result) => result.outcome === 'SKIPPED')
        .length,
      results,
    };
  }

  private async persistReconciledOutcomeWithoutNewAttempt(input: {
    notification: {
      id: string;
      userId: string;
      channel: string;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
      notificationType: { slug: string };
    };
    previousAttempt: {
      id: string;
      attemptNumber: number;
    };
    execution: ChannelExecutionResult;
    finalizationNow: Date;
    claimToken?: string;
  }) {
    const accepted = input.execution.providerOutcome === 'ACCEPTED';
    const updated = await this.updateAttempt({
      attemptId: input.previousAttempt.id,
      notificationId: input.notification.id,
      claimToken: input.claimToken,
      now: new Date(),
      data: {
        status: accepted
          ? DeliveryAttemptStatus.SENT
          : DeliveryAttemptStatus.FAILED,
        provider: input.execution.provider,
        providerMessageRef: input.execution.providerMessageRef ?? null,
        ...(accepted
          ? {}
          : {
              errorCode:
                input.execution.errorCode ?? 'PROVIDER_RECONCILIATION_TERMINAL',
              errorMessage: (
                input.execution.errorMessage ??
                'PROVIDER_RECONCILIATION_TERMINAL'
              ).slice(0, 1000),
            }),
        responsePayload: this.withOutcomeMetadata(input.execution),
      },
    });
    if (updated.count === 0) {
      return this.buildResult(input.notification.id, 'SKIPPED', false, {
        attemptId: input.previousAttempt.id,
        reason: 'CLAIM_LOST_BEFORE_RECONCILIATION_PERSISTENCE',
      });
    }

    if (accepted) {
      const sent = await this.repository.markQueuedNotificationSent({
        notificationId: input.notification.id,
        sentAt: input.finalizationNow,
        ...(input.claimToken ? { claimToken: input.claimToken } : {}),
      });
      if (sent.count === 0) {
        return this.buildResult(input.notification.id, 'SKIPPED', false, {
          attemptId: input.previousAttempt.id,
          reason: 'NOTIFICATION_ALREADY_PROCESSED',
        });
      }
      return this.buildResult(input.notification.id, 'SENT', true, {
        attemptId: input.previousAttempt.id,
        reason: 'PROVIDER_RECONCILIATION_ACCEPTED',
      });
    }

    await this.repository.markQueuedNotificationSuppressed({
      notificationId: input.notification.id,
      reason: 'PROVIDER_RECONCILIATION_TERMINAL',
      ...(input.claimToken
        ? { claimToken: input.claimToken, now: input.finalizationNow }
        : {}),
    });
    return this.buildResult(input.notification.id, 'SKIPPED', true, {
      attemptId: input.previousAttempt.id,
      reason: 'PROVIDER_RECONCILIATION_TERMINAL',
    });
  }

  private async persistFailedAttempt(input: {
    notificationId: string;
    attemptId: string;
    execution: ChannelExecutionResult;
    now: Date;
    finalizationAt: Date;
    attemptNumber: number;
    claimToken?: string;
    notificationTypeSlug?: string;
    scheduledFor?: Date | null;
  }): Promise<{ outcome: ExecutionOutcome; reason: string }> {
    const retryDecision = this.retryPolicyService.evaluate({
      errorCode: input.execution.errorCode,
      providerErrorCode: input.execution.providerErrorCode,
      errorCategory: input.execution.errorCategory,
      attemptNumber: input.attemptNumber,
      now: input.now,
      retryAfterMs: input.execution.retryAfterMs,
      jitterSeed: input.notificationId,
      notificationTypeSlug: input.notificationTypeSlug,
      scheduledFor: input.scheduledFor,
    });
    this.metrics?.recordRetryDecision(retryDecision);
    const reason =
      input.execution.errorCode ??
      input.execution.errorMessage ??
      'DELIVERY_FAILED';

    const updated = await this.updateAttempt({
      attemptId: input.attemptId,
      notificationId: input.notificationId,
      claimToken: input.claimToken,
      now: new Date(),
      data: {
        status: DeliveryAttemptStatus.FAILED,
        provider: input.execution.provider,
        errorCode: reason,
        errorMessage: (input.execution.errorMessage ?? reason).slice(0, 1000),
        responsePayload: {
          ...this.withOutcomeMetadata(input.execution),
          retryDecision:
            retryDecision.kind === 'RETRY'
              ? {
                  kind: retryDecision.kind,
                  nextRetryAt: retryDecision.nextRetryAt.toISOString(),
                  maxAttempts: retryDecision.maxAttempts,
                  reasonCode: retryDecision.reasonCode,
                  errorCategory: retryDecision.errorCategory,
                  delayMs: retryDecision.delayMs,
                  ...(retryDecision.retryAfterMs !== undefined
                    ? { retryAfterMs: retryDecision.retryAfterMs }
                    : {}),
                }
              : {
                  kind: retryDecision.kind,
                  maxAttempts: retryDecision.maxAttempts,
                  reasonCode: retryDecision.reasonCode,
                  errorCategory: retryDecision.errorCategory,
                },
        },
      },
    });
    if (updated.count === 0) {
      return {
        outcome: 'SKIPPED',
        reason: 'CLAIM_LOST_BEFORE_ATTEMPT_PERSISTENCE',
      };
    }

    if (retryDecision.kind === 'RETRY') {
      const requeued =
        await this.repository.rescheduleQueuedNotificationForRetry({
          notificationId: input.notificationId,
          retryAt: retryDecision.nextRetryAt,
          ...(input.claimToken
            ? { claimToken: input.claimToken, now: input.finalizationAt }
            : {}),
        });
      if (requeued.count > 0) {
        return { outcome: 'SKIPPED', reason: 'RETRY_SCHEDULED' };
      }
      return { outcome: 'SKIPPED', reason: 'NOTIFICATION_ALREADY_PROCESSED' };
    }

    await this.repository.markQueuedNotificationFailed({
      notificationId: input.notificationId,
      failedAt: input.finalizationAt,
      reason,
      ...(input.claimToken ? { claimToken: input.claimToken } : {}),
    });
    return { outcome: 'FAILED', reason };
  }

  private async persistUnknownOutcome(input: {
    notificationId: string;
    attemptId: string;
    attemptNumber: number;
    execution: ChannelExecutionResult;
    now: Date;
    finalizationAt: Date;
    claimToken?: string;
    notificationTypeSlug?: string;
    scheduledFor?: Date | null;
  }) {
    const updated = await this.updateAttempt({
      attemptId: input.attemptId,
      notificationId: input.notificationId,
      claimToken: input.claimToken,
      now: new Date(),
      data: {
        status: DeliveryAttemptStatus.PENDING,
        provider: input.execution.provider,
        providerMessageRef: input.execution.providerMessageRef ?? null,
        errorCode: 'PROVIDER_OUTCOME_UNKNOWN',
        errorMessage: (
          input.execution.errorMessage ?? 'PROVIDER_OUTCOME_UNKNOWN'
        ).slice(0, 1000),
        responsePayload: this.withOutcomeMetadata(input.execution),
      },
    });
    if (updated.count === 0) {
      return this.buildResult(input.notificationId, 'SKIPPED', false, {
        attemptId: input.attemptId,
        reason: 'CLAIM_LOST_BEFORE_ATTEMPT_PERSISTENCE',
      });
    }

    const safeToReconcile =
      input.execution.provider === 'BREVO' ||
      (input.execution.provider === 'EXPO' &&
        (input.execution.providerReferences?.length ?? 0) > 0);
    if (safeToReconcile && input.attemptNumber < 3) {
      const requeued =
        await this.repository.rescheduleQueuedNotificationForRetry({
          notificationId: input.notificationId,
          retryAt: new Date(input.now.getTime() + 30_000),
          ...(input.claimToken
            ? { claimToken: input.claimToken, now: input.finalizationAt }
            : {}),
        });
      if (requeued.count > 0) {
        return this.buildResult(input.notificationId, 'SKIPPED', true, {
          attemptId: input.attemptId,
          reason: 'UNKNOWN_RECONCILIATION_SCHEDULED',
        });
      }
    }

    await this.repository.markQueuedNotificationSuppressed({
      notificationId: input.notificationId,
      reason: 'PROVIDER_OUTCOME_UNKNOWN',
      ...(input.claimToken
        ? { claimToken: input.claimToken, now: input.finalizationAt }
        : {}),
    });
    this.metrics?.recordUnknownOutcomeSuppressed();
    return this.buildResult(input.notificationId, 'SKIPPED', true, {
      attemptId: input.attemptId,
      reason: 'PROVIDER_OUTCOME_UNKNOWN_QUARANTINED',
    });
  }

  private async persistPartialOutcome(input: {
    notificationId: string;
    attemptId: string;
    attemptNumber: number;
    execution: ChannelExecutionResult;
    now: Date;
    finalizationAt: Date;
    claimToken?: string;
    notificationTypeSlug?: string;
    scheduledFor?: Date | null;
  }) {
    const updated = await this.updateAttempt({
      attemptId: input.attemptId,
      notificationId: input.notificationId,
      claimToken: input.claimToken,
      now: new Date(),
      data: {
        status: DeliveryAttemptStatus.PENDING,
        provider: input.execution.provider,
        providerMessageRef: input.execution.providerMessageRef ?? null,
        errorCode: input.execution.errorCode ?? 'DELIVERY_FAILED',
        errorMessage: (
          input.execution.errorMessage ?? 'PROVIDER_PARTIAL_RESULT'
        ).slice(0, 1000),
        responsePayload: this.withOutcomeMetadata(input.execution),
      },
    });
    if (updated.count === 0) {
      return this.buildResult(input.notificationId, 'SKIPPED', false, {
        attemptId: input.attemptId,
        reason: 'CLAIM_LOST_BEFORE_ATTEMPT_PERSISTENCE',
      });
    }

    const retryDecision = this.retryPolicyService.evaluate({
      errorCode: 'DELIVERY_FAILED',
      providerErrorCode: input.execution.providerErrorCode,
      errorCategory: input.execution.errorCategory,
      attemptNumber: input.attemptNumber,
      now: input.now,
      retryAfterMs: input.execution.retryAfterMs,
      jitterSeed: input.notificationId,
      notificationTypeSlug: input.notificationTypeSlug,
      scheduledFor: input.scheduledFor,
    });
    this.metrics?.recordRetryDecision(retryDecision);
    if (retryDecision.kind === 'RETRY') {
      const requeued =
        await this.repository.rescheduleQueuedNotificationForRetry({
          notificationId: input.notificationId,
          retryAt: retryDecision.nextRetryAt,
          ...(input.claimToken
            ? { claimToken: input.claimToken, now: input.finalizationAt }
            : {}),
        });
      if (requeued.count > 0) {
        return this.buildResult(input.notificationId, 'SKIPPED', true, {
          attemptId: input.attemptId,
          reason: 'PARTIAL_RETRY_SCHEDULED',
        });
      }
    }

    await this.repository.markQueuedNotificationSuppressed({
      notificationId: input.notificationId,
      reason: 'PROVIDER_PARTIAL_RESULT',
      ...(input.claimToken
        ? { claimToken: input.claimToken, now: input.finalizationAt }
        : {}),
    });
    return this.buildResult(input.notificationId, 'SKIPPED', true, {
      attemptId: input.attemptId,
      reason: 'PROVIDER_PARTIAL_RESULT_QUARANTINED',
    });
  }

  private async updateAttempt(input: {
    attemptId: string;
    notificationId: string;
    claimToken?: string;
    now: Date;
    data: Parameters<
      OperationalNotificationRepository['updateDeliveryAttempt']
    >[1];
  }) {
    if (input.claimToken && this.repository.updateDeliveryAttemptWithClaim) {
      return this.repository.updateDeliveryAttemptWithClaim({
        attemptId: input.attemptId,
        notificationId: input.notificationId,
        claimToken: input.claimToken,
        now: input.now,
        data: input.data,
      });
    }
    await this.repository.updateDeliveryAttempt(input.attemptId, input.data);
    return { count: 1 };
  }

  private withOutcomeMetadata(execution: ChannelExecutionResult) {
    return {
      ...((execution.responsePayload as Record<string, unknown> | undefined) ??
        {}),
      providerOutcome: execution.providerOutcome,
      ...(execution.providerReferences
        ? { providerReferences: execution.providerReferences }
        : {}),
      ...(execution.httpStatus !== undefined
        ? { httpStatus: execution.httpStatus }
        : {}),
      ...(execution.providerRequestId
        ? { providerRequestId: execution.providerRequestId }
        : {}),
      ...(execution.providerRespondedAt
        ? { providerRespondedAt: execution.providerRespondedAt }
        : {}),
      ...(execution.reconciliationState
        ? { reconciliationState: execution.reconciliationState }
        : {}),
      ...(execution.errorCategory
        ? { errorCategory: execution.errorCategory }
        : {}),
      ...(execution.providerErrorCode
        ? { providerErrorCode: execution.providerErrorCode }
        : {}),
      ...(execution.retryAfterMs !== undefined
        ? { retryAfterMs: execution.retryAfterMs }
        : {}),
      ...(execution.providerSendAttempted !== undefined
        ? { providerSendAttempted: execution.providerSendAttempted }
        : {}),
    };
  }

  private readProviderOutcome(
    responsePayload: unknown,
  ): NotificationProviderOutcome | undefined {
    if (!responsePayload || typeof responsePayload !== 'object')
      return undefined;
    const outcome = (responsePayload as Record<string, unknown>)
      .providerOutcome;
    return outcome === 'ACCEPTED' ||
      outcome === 'FAILED' ||
      outcome === 'UNKNOWN' ||
      outcome === 'PARTIAL'
      ? outcome
      : undefined;
  }

  private readAcceptedDeviceIds(responsePayload: unknown): string[] {
    if (!responsePayload || typeof responsePayload !== 'object') return [];
    const ids = (responsePayload as Record<string, unknown>).acceptedDeviceIds;
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === 'string')
      : [];
  }

  private isExpiredBrevoReconciliationWindow(
    previousAttempt: Awaited<
      ReturnType<OperationalNotificationRepository['findLatestDeliveryAttempt']>
    >,
    now: Date,
  ): boolean {
    if (
      !previousAttempt ||
      this.readProviderOutcome(previousAttempt.responsePayload) !== 'UNKNOWN'
    ) {
      return false;
    }
    const payload = previousAttempt.requestPayload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }
    const metadata = payload as Record<string, unknown>;
    if (metadata.provider !== 'BREVO') return false;
    const startedAt = metadata.requestStartedAt;
    if (typeof startedAt !== 'string') return false;
    const startedAtMs = Date.parse(startedAt);
    return (
      Number.isFinite(startedAtMs) &&
      now.getTime() - startedAtMs >= 15 * 60 * 1000
    );
  }

  private resolveProviderHint(channel: string): string {
    if (channel === 'EMAIL') {
      return 'SMTP';
    }
    if (channel === 'IN_APP') {
      return 'IN_APP';
    }
    if (channel === 'PUSH') {
      return 'EXPO';
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
