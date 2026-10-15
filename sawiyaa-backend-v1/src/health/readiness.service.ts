import { Injectable, Optional } from '@nestjs/common';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { NotificationQueueService } from '@common/queue/notification-queue.service';
import type { NotificationQueueHealthSnapshot } from '@common/queue/notification-queue.service';
import { OperationsQueueService } from '@common/queue/operations-queue.service';
import type { OperationsQueueHealthSnapshot } from '@common/queue/operations-queue.service';
import { PaymentProviderRecoveryService } from '@modules/payments/services/payment-provider-recovery.service';
import { AccountingReconciliationSchedulerService } from '@modules/financial-operations/services/accounting-reconciliation-scheduler.service';
import { SessionReminderQueueService } from '@common/queue/session-reminder-queue.service';
import type { SessionReminderQueueHealthSnapshot } from '@common/queue/session-reminder-queue.service';
import { ProviderCapacityService } from '@modules/notifications/services/provider-capacity.service';
import type { ProviderCapacitySnapshot } from '@modules/notifications/services/provider-capacity.service';
import type { ProviderCapacityMetric } from '@modules/notifications/services/provider-capacity.service';

export type ReadinessState = 'READY' | 'DEGRADED' | 'NOT_READY';

export type ReadinessSnapshot = {
  status: ReadinessState;
  checkedAt: string;
  components: {
    sessionCompletionWorker: { status: 'READY'; detail: string };
    attendanceReconciliation: { status: ReadinessState; detail: string };
    dailyWebhook: { status: ReadinessState; detail: string };
    paymentRouting: { status: ReadinessState; detail: string };
    providerPaymentRecovery: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      running: boolean;
      lastStartedAt: string | null;
      lastSuccessAt: string | null;
      lastFailureAt: string | null;
      lastErrorCategory: string | null;
      lastScannedCount: number | null;
      lastRecoveredCount: number | null;
    };
    accountingReconciliation: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      lastRunStatus: string | null;
    };
    notificationQueue: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      redis: NotificationQueueHealthSnapshot['redis'];
      worker: NotificationQueueHealthSnapshot['worker'];
      counts: NotificationQueueHealthSnapshot['counts'];
      oldestWaitingJobAgeMs: number | null;
    };
    notificationCapacity: {
      status: ReadinessState;
      detail: string;
      mode: ProviderCapacitySnapshot['mode'];
      globalRateAdmission: ProviderCapacitySnapshot['globalRateAdmission'];
      globalCoordinator: ProviderCapacitySnapshot['globalCoordinator'];
      metrics: ProviderCapacityMetric[];
      providers: ProviderCapacitySnapshot['providers'];
    };
    operationsQueue: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      redis: OperationsQueueHealthSnapshot['redis'];
      worker: OperationsQueueHealthSnapshot['worker'];
      counts: OperationsQueueHealthSnapshot['counts'];
      oldestWaitingJobAgeMs: number | null;
    };
    sessionReminderRedis: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      mode: string;
      redis: SessionReminderQueueHealthSnapshot['redis'];
      worker: SessionReminderQueueHealthSnapshot['worker'];
      counts: SessionReminderQueueHealthSnapshot['counts'];
      oldestDelayedOrWaitingJobAgeMs: number | null;
      lastStageSuccessAt: string | null;
      lastStageFailureAt: string | null;
      lastExecutionSuccessAt: string | null;
      lastRedisErrorAt: string | null;
      lastError: string | null;
    };
  };
  warnings: string[];
};

@Injectable()
export class ReadinessService {
  constructor(
    private readonly paymentRuntime: PaymentRuntimeConfigService,
    @Optional() private readonly notificationQueue?: NotificationQueueService,
    @Optional() private readonly operationsQueue?: OperationsQueueService,
    @Optional()
    private readonly providerRecovery?: PaymentProviderRecoveryService,
    @Optional()
    private readonly accountingScheduler?: AccountingReconciliationSchedulerService,
    @Optional()
    private readonly sessionReminderQueue?: SessionReminderQueueService,
    @Optional()
    private readonly providerCapacity?: ProviderCapacityService,
  ) {}

  async getSnapshot(): Promise<ReadinessSnapshot> {
    const production =
      process.env.APP_ENV === 'production' ||
      process.env.NODE_ENV === 'production';
    const providerRecoverySnapshot =
      this.providerRecovery?.getStatusSnapshot() ?? {
        enabled: false,
        running: false,
        lastStartedAt: null,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastErrorCategory: null,
        lastScannedCount: null,
        lastRecoveredCount: null,
      };
    let accountingSchedulerSnapshot: Awaited<
      ReturnType<AccountingReconciliationSchedulerService['getStatusSnapshot']>
    > | null = null;
    try {
      accountingSchedulerSnapshot = this.accountingScheduler
        ? await this.accountingScheduler.getStatusSnapshot()
        : null;
    } catch {
      accountingSchedulerSnapshot = null;
    }
    const attendanceEnabled =
      process.env.SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED === 'true';
    const dailyConfigured = Boolean(
      process.env.DAILY_API_KEY?.trim() &&
      process.env.DAILY_API_BASE_URL?.trim() &&
      process.env.DAILY_WEBHOOK_SECRET?.trim(),
    );

    let paymentStatus: ReadinessState = 'READY';
    let paymentDetail = 'Payment routing snapshot is available.';
    try {
      const routing = this.paymentRuntime.getPaymentRoutingConfig();
      const enabledRoutes = routing.routeReadiness.filter(
        ({ route }) => route.enabled,
      );
      if (enabledRoutes.some(({ ready }) => !ready)) {
        paymentStatus = 'NOT_READY';
        paymentDetail = 'One or more enabled payment routes are not ready.';
      }
    } catch {
      paymentStatus = 'NOT_READY';
      paymentDetail = 'Payment routing snapshot is unavailable.';
    }

    const warnings: string[] = [];
    const notificationQueue = this.notificationQueue
      ? await this.notificationQueue.getHealthSnapshot()
      : ({
          enabled: false,
          status: 'DISABLED' as const,
          redis: 'NOT_REQUIRED' as const,
          worker: 'NOT_REQUIRED' as const,
          queueName: 'notifications',
          counts: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
          },
          oldestWaitingJobAgeMs: null,
          lastEnqueuedAt: null,
          lastEnqueueFailureAt: null,
          lastWorkerHeartbeatAt: null,
          lastError: null,
        } satisfies NotificationQueueHealthSnapshot);
    const notificationQueueStatus: ReadinessState =
      notificationQueue.status === 'DEGRADED' ? 'DEGRADED' : 'READY';
    if (notificationQueue.status === 'DEGRADED') {
      warnings.push(
        `Notification queue is degraded; PostgreSQL DB runner fallback remains active${notificationQueue.lastError ? ` (${notificationQueue.lastError})` : ''}.`,
      );
    }
    const notificationCapacity = this.providerCapacity?.getSnapshot() ?? {
      mode: 'METRICS_ONLY' as const,
      globalRateAdmission: 'DISABLED' as const,
      globalCoordinator: {
        mode: 'METRICS_ONLY' as const,
        configured: false,
        redisUrlConfigured: false,
        redisReady: false,
        health: 'NOT_REQUIRED' as const,
        keyPrefix: 'sawiyaa:notification-capacity',
        stateTtlMs: 120_000,
        providers: {
          BREVO: { ratePerSecond: null, burst: null },
          EXPO: { ratePerSecond: null, burst: null },
          SMTP: { ratePerSecond: null, burst: null },
        },
        allowedTotal: 0,
        throttledTotal: 0,
        shadowWouldThrottleTotal: 0,
        coordinatorErrors: 0,
        failClosedDeferrals: 0,
        cooldownEvents: 0,
        lastError: null,
      },
      metrics: [],
      providers: {} as ProviderCapacitySnapshot['providers'],
    };
    const operationsQueue = this.operationsQueue
      ? await this.operationsQueue.getHealthSnapshot()
      : ({
          enabled: false,
          status: 'DISABLED' as const,
          redis: 'NOT_REQUIRED' as const,
          worker: 'NOT_REQUIRED' as const,
          queueName: 'operations',
          counts: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
          },
          oldestWaitingJobAgeMs: null,
          lastEnqueuedAt: null,
          lastEnqueueFailureAt: null,
          lastWorkerHeartbeatAt: null,
          lastError: null,
        } satisfies OperationsQueueHealthSnapshot);
    const operationsQueueStatus: ReadinessState =
      operationsQueue.status === 'DEGRADED' ? 'DEGRADED' : 'READY';
    if (operationsQueue.status === 'DEGRADED') {
      warnings.push(
        `Daily attendance operations queue is degraded; eligible sessions remain recoverable by the next sweep${operationsQueue.lastError ? ` (${operationsQueue.lastError})` : ''}.`,
      );
    }
    const sessionReminderRedis = this.sessionReminderQueue
      ? await this.sessionReminderQueue.getHealthSnapshot()
      : ({
          enabled: false,
          mode: 'DB_ONLY',
          status: 'DISABLED' as const,
          redis: 'NOT_REQUIRED' as const,
          worker: 'NOT_REQUIRED' as const,
          queueName: 'session-reminder-execution',
          counts: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
          },
          oldestDelayedOrWaitingJobAgeMs: null,
          lastStageSuccessAt: null,
          lastStageFailureAt: null,
          lastExecutionSuccessAt: null,
          lastRedisErrorAt: null,
          lastWorkerHeartbeatAt: null,
          lastError: null,
          metrics: {
            candidates: 0,
            staged: 0,
            duplicateStage: 0,
            executions: 0,
            noops: 0,
            stale: 0,
            recovery: 0,
            stageFailures: 0,
            workerFailures: 0,
          },
        } satisfies SessionReminderQueueHealthSnapshot);
    const sessionReminderRedisStatus: ReadinessState =
      sessionReminderRedis.enabled && sessionReminderRedis.status === 'DEGRADED'
        ? 'DEGRADED'
        : 'READY';
    if (sessionReminderRedis.status === 'DEGRADED') {
      warnings.push(
        'Session reminder Redis staging is degraded; PostgreSQL reminder recovery remains active.',
      );
    }
    const attendanceStatus: ReadinessState = attendanceEnabled
      ? 'READY'
      : 'DEGRADED';
    if (!attendanceEnabled) {
      warnings.push(
        'SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED is not true; attendance evidence reconciliation is disabled.',
      );
    }
    const dailyStatus: ReadinessState = dailyConfigured
      ? 'READY'
      : production
        ? 'NOT_READY'
        : 'DEGRADED';
    if (!dailyConfigured) {
      warnings.push('Daily webhook runtime configuration is incomplete.');
    }

    const reconciliationEnabled =
      process.env.ACCOUNTING_RECONCILIATION_ENABLED === 'true';
    const reconciliationAlertsEnabled =
      process.env.ACCOUNTING_RECONCILIATION_ALERTS_ENABLED === 'true';
    const reconciliationStatus: ReadinessState = reconciliationEnabled
      ? reconciliationAlertsEnabled
        ? 'READY'
        : production
          ? 'NOT_READY'
          : 'DEGRADED'
      : 'DEGRADED';
    const reconciliationDetail = reconciliationEnabled
      ? reconciliationAlertsEnabled
        ? 'Automatic reconciliation and critical-issue alerting are enabled.'
        : 'Automatic reconciliation is enabled but critical-issue alerting is disabled.'
      : 'Automatic accounting reconciliation is disabled by configuration.';
    if (!reconciliationEnabled) {
      warnings.push(
        'ACCOUNTING_RECONCILIATION_ENABLED is not true; automatic payment reconciliation is disabled.',
      );
    } else if (!reconciliationAlertsEnabled) {
      warnings.push(
        'ACCOUNTING_RECONCILIATION_ALERTS_ENABLED is not true while automatic reconciliation is enabled.',
      );
    }

    const providerRecoveryFailureIsLatest =
      providerRecoverySnapshot.lastFailureAt !== null &&
      (providerRecoverySnapshot.lastSuccessAt === null ||
        providerRecoverySnapshot.lastFailureAt >
          providerRecoverySnapshot.lastSuccessAt);
    const providerRecoveryStatus: ReadinessState =
      !providerRecoverySnapshot.enabled
        ? production
          ? 'NOT_READY'
          : 'DEGRADED'
        : providerRecoveryFailureIsLatest
          ? production
            ? 'NOT_READY'
            : 'DEGRADED'
          : 'READY';
    const providerRecoveryDetail = !providerRecoverySnapshot.enabled
      ? 'Mandatory provider payment recovery scheduler is not active.'
      : providerRecoveryFailureIsLatest
        ? 'Mandatory provider payment recovery has failed on its latest recorded run.'
        : 'Mandatory provider payment recovery scheduler is active independently of accounting reconciliation.';
    if (!providerRecoverySnapshot.enabled) {
      warnings.push(
        'Mandatory provider payment recovery scheduler is not active; payment convergence is unsafe.',
      );
    } else if (providerRecoveryFailureIsLatest) {
      warnings.push(
        `Mandatory provider payment recovery failed${providerRecoverySnapshot.lastErrorCategory ? ` (${providerRecoverySnapshot.lastErrorCategory})` : ''}.`,
      );
    }

    const notificationCapacityNotReady =
      notificationCapacity.mode === 'ENFORCED' &&
      notificationCapacity.globalCoordinator.health === 'UNAVAILABLE';
    if (notificationCapacityNotReady) {
      warnings.push(
        'Notification external provider capacity is not ready; ENFORCED delivery is failing closed while PostgreSQL remains authoritative.',
      );
    }

    const statuses = [
      attendanceStatus,
      dailyStatus,
      paymentStatus,
      providerRecoveryStatus,
      reconciliationStatus,
      notificationQueueStatus,
      operationsQueueStatus,
      sessionReminderRedisStatus,
      ...(notificationCapacityNotReady ? (['NOT_READY'] as const) : []),
    ];
    const status: ReadinessState = statuses.includes('NOT_READY')
      ? 'NOT_READY'
      : statuses.includes('DEGRADED')
        ? 'DEGRADED'
        : 'READY';

    return {
      status,
      checkedAt: new Date().toISOString(),
      components: {
        sessionCompletionWorker: {
          status: 'READY',
          detail:
            'Production completion-confirmation worker is always started.',
        },
        attendanceReconciliation: {
          status: attendanceStatus,
          detail: attendanceEnabled
            ? 'Evidence-only worker is enabled.'
            : 'Evidence-only worker is disabled.',
        },
        dailyWebhook: {
          status: dailyStatus,
          detail: dailyConfigured
            ? 'Daily webhook credentials are configured.'
            : 'Daily webhook credentials are incomplete.',
        },
        paymentRouting: { status: paymentStatus, detail: paymentDetail },
        providerPaymentRecovery: {
          status: providerRecoveryStatus,
          detail: providerRecoveryDetail,
          enabled: providerRecoverySnapshot.enabled,
          running: providerRecoverySnapshot.running,
          lastStartedAt: providerRecoverySnapshot.lastStartedAt,
          lastSuccessAt: providerRecoverySnapshot.lastSuccessAt,
          lastFailureAt: providerRecoverySnapshot.lastFailureAt,
          lastErrorCategory: providerRecoverySnapshot.lastErrorCategory,
          lastScannedCount: providerRecoverySnapshot.lastScannedCount,
          lastRecoveredCount: providerRecoverySnapshot.lastRecoveredCount,
        },
        accountingReconciliation: {
          status: reconciliationStatus,
          detail: reconciliationDetail,
          enabled: reconciliationEnabled,
          lastRunStatus:
            accountingSchedulerSnapshot?.lastScheduledRunStatus ?? null,
        },
        notificationQueue: {
          status: notificationQueueStatus,
          detail:
            notificationQueue.status === 'DISABLED'
              ? 'BullMQ notification queue is disabled; the PostgreSQL DB runner is authoritative and active.'
              : notificationQueue.status === 'READY'
                ? 'Redis notification queue is available; the PostgreSQL DB runner remains a recovery fallback.'
                : 'Redis notification queue is unavailable or degraded; the PostgreSQL DB runner remains active.',
          enabled: notificationQueue.enabled,
          redis: notificationQueue.redis,
          worker: notificationQueue.worker,
          counts: notificationQueue.counts,
          oldestWaitingJobAgeMs: notificationQueue.oldestWaitingJobAgeMs,
        },
        notificationCapacity: {
          status: notificationCapacityNotReady ? 'NOT_READY' : 'READY',
          detail:
            notificationCapacity.mode === 'METRICS_ONLY'
              ? 'Provider capacity instrumentation is active; global admission is disabled by default.'
              : notificationCapacity.mode === 'SHADOW'
                ? 'Global provider admission is calculated in shadow mode; provider calls are not blocked.'
                : 'Global provider admission is enforced with fail-closed coordinator behavior.',
          ...notificationCapacity,
        },
        operationsQueue: {
          status: operationsQueueStatus,
          detail:
            operationsQueue.status === 'DISABLED'
              ? 'Daily attendance queue is disabled; the existing synchronous sweeper remains the rollback path.'
              : operationsQueue.status === 'READY'
                ? 'Daily attendance operations queue is available; provider work runs in the worker process.'
                : 'Daily attendance operations queue is degraded; eligible sessions remain recoverable by scheduled discovery.',
          enabled: operationsQueue.enabled,
          redis: operationsQueue.redis,
          worker: operationsQueue.worker,
          counts: operationsQueue.counts,
          oldestWaitingJobAgeMs: operationsQueue.oldestWaitingJobAgeMs,
        },
        sessionReminderRedis: {
          status: sessionReminderRedisStatus,
          detail:
            sessionReminderRedis.status === 'DISABLED'
              ? 'Redis reminder staging is disabled; PostgreSQL is authoritative.'
              : sessionReminderRedis.status === 'READY'
                ? 'Near-term reminder staging is available; PostgreSQL remains authoritative.'
                : 'Redis reminder staging is degraded; PostgreSQL recovery remains active.',
          enabled: sessionReminderRedis.enabled,
          mode: sessionReminderRedis.mode,
          redis: sessionReminderRedis.redis,
          worker: sessionReminderRedis.worker,
          counts: sessionReminderRedis.counts,
          oldestDelayedOrWaitingJobAgeMs:
            sessionReminderRedis.oldestDelayedOrWaitingJobAgeMs,
          lastStageSuccessAt: sessionReminderRedis.lastStageSuccessAt,
          lastStageFailureAt: sessionReminderRedis.lastStageFailureAt,
          lastExecutionSuccessAt: sessionReminderRedis.lastExecutionSuccessAt,
          lastRedisErrorAt: sessionReminderRedis.lastRedisErrorAt,
          lastError: sessionReminderRedis.lastError,
        },
      },
      warnings,
    };
  }
}
