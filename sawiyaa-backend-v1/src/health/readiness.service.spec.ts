import { ReadinessService } from './readiness.service';

describe('ReadinessService', () => {
  const paymentRuntime = {
    getPaymentRoutingConfig: jest.fn(),
  };
  const providerRecovery = {
    getStatusSnapshot: jest.fn().mockReturnValue({
      enabled: true,
      running: false,
      lastStartedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastErrorCategory: null,
      lastScannedCount: null,
      lastRecoveredCount: null,
    }),
  };
  const service = new ReadinessService(
    paymentRuntime as never,
    undefined,
    undefined,
    providerRecovery as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    paymentRuntime.getPaymentRoutingConfig.mockReturnValue({
      routeReadiness: [],
    });
    providerRecovery.getStatusSnapshot.mockReturnValue({
      enabled: true,
      running: false,
      lastStartedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastErrorCategory: null,
      lastScannedCount: null,
      lastRecoveredCount: null,
    });
    process.env.APP_ENV = 'production';
    process.env.NODE_ENV = 'production';
    process.env.SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED = 'true';
    process.env.DAILY_API_KEY = 'daily-key';
    process.env.DAILY_API_BASE_URL = 'https://api.daily.co/v1';
    process.env.DAILY_WEBHOOK_SECRET = 'daily-secret';
    process.env.ACCOUNTING_RECONCILIATION_ENABLED = 'false';
    process.env.ACCOUNTING_RECONCILIATION_ALERTS_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    delete process.env.SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED;
    delete process.env.DAILY_API_KEY;
    delete process.env.DAILY_API_BASE_URL;
    delete process.env.DAILY_WEBHOOK_SECRET;
    delete process.env.ACCOUNTING_RECONCILIATION_ENABLED;
    delete process.env.ACCOUNTING_RECONCILIATION_ALERTS_ENABLED;
  });

  it('keeps completion ready and reports attendance degraded when disabled', async () => {
    process.env.SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED = 'false';
    const snapshot = await service.getSnapshot();
    expect(snapshot.components.sessionCompletionWorker.status).toBe('READY');
    expect(snapshot.components.attendanceReconciliation.status).toBe(
      'DEGRADED',
    );
    expect(snapshot.status).toBe('DEGRADED');
  });

  it('reports production Daily configuration as not ready when incomplete', async () => {
    delete process.env.DAILY_WEBHOOK_SECRET;
    expect((await service.getSnapshot()).components.dailyWebhook.status).toBe(
      'NOT_READY',
    );
  });

  it('makes disabled reconciliation explicit in readiness', async () => {
    const snapshot = await service.getSnapshot();

    expect(snapshot.components.accountingReconciliation.status).toBe(
      'DEGRADED',
    );
    expect(snapshot.components.accountingReconciliation.detail).toContain(
      'disabled',
    );
    expect(snapshot.components.accountingReconciliation.enabled).toBe(false);
    expect(
      snapshot.components.accountingReconciliation.lastRunStatus,
    ).toBeNull();
    expect(snapshot.components.providerPaymentRecovery.status).toBe('READY');
    expect(snapshot.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ACCOUNTING_RECONCILIATION_ENABLED'),
      ]),
    );
  });

  it('degrades notification readiness without taking the API not ready when Redis is unavailable', async () => {
    const notificationQueue = {
      getHealthSnapshot: jest.fn().mockResolvedValue({
        enabled: true,
        status: 'DEGRADED',
        redis: 'UNAVAILABLE',
        worker: 'UNKNOWN',
        queueName: 'notifications',
        counts: { waiting: 2, active: 0, completed: 0, failed: 0, delayed: 0 },
        oldestWaitingJobAgeMs: 12_000,
        lastEnqueuedAt: null,
        lastEnqueueFailureAt: new Date().toISOString(),
        lastWorkerHeartbeatAt: null,
        lastError: 'redis unavailable',
      }),
    };
    const degradedService = new ReadinessService(
      paymentRuntime as never,
      notificationQueue as never,
      undefined,
      providerRecovery as never,
    );

    const snapshot = await degradedService.getSnapshot();

    expect(snapshot.components.notificationQueue.status).toBe('DEGRADED');
    expect(snapshot.status).toBe('DEGRADED');
    expect(snapshot.status).not.toBe('NOT_READY');
    expect(snapshot.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('DB runner fallback')]),
    );
  });

  it('keeps overall reminder readiness healthy when the dormant Redis path is unavailable', async () => {
    const sessionReminderQueue = {
      getHealthSnapshot: jest.fn().mockResolvedValue({
        enabled: false,
        mode: 'DB_ONLY',
        status: 'DISABLED',
        redis: 'NOT_REQUIRED',
        worker: 'NOT_REQUIRED',
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
      }),
    };
    const healthyDormantService = new ReadinessService(
      paymentRuntime as never,
      undefined,
      undefined,
      providerRecovery as never,
      undefined,
      sessionReminderQueue as never,
    );

    const snapshot = await healthyDormantService.getSnapshot();

    expect(snapshot.components.sessionReminderRedis).toMatchObject({
      status: 'READY',
      enabled: false,
      mode: 'DB_ONLY',
      redis: 'NOT_REQUIRED',
      worker: 'NOT_REQUIRED',
    });
    expect(snapshot.warnings).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('Session reminder Redis staging is degraded'),
      ]),
    );
  });

  it('keeps a degraded Daily attendance queue separate from API availability', async () => {
    const operationsQueue = {
      getHealthSnapshot: jest.fn().mockResolvedValue({
        enabled: true,
        status: 'DEGRADED',
        redis: 'UNAVAILABLE',
        worker: 'UNKNOWN',
        queueName: 'operations',
        counts: { waiting: 1, active: 0, completed: 0, failed: 1, delayed: 0 },
        oldestWaitingJobAgeMs: 5000,
        lastEnqueuedAt: null,
        lastEnqueueFailureAt: new Date().toISOString(),
        lastWorkerHeartbeatAt: null,
        lastError: 'redis unavailable',
      }),
    };
    const degradedService = new ReadinessService(
      paymentRuntime as never,
      undefined,
      operationsQueue as never,
      providerRecovery as never,
    );

    const snapshot = await degradedService.getSnapshot();

    expect(snapshot.components.operationsQueue.status).toBe('DEGRADED');
    expect(snapshot.status).toBe('DEGRADED');
    expect(snapshot.status).not.toBe('NOT_READY');
    expect(snapshot.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Daily attendance operations queue is degraded',
        ),
      ]),
    );
  });

  it('marks mandatory provider recovery not ready when its scheduler is inactive', async () => {
    providerRecovery.getStatusSnapshot.mockReturnValue({
      enabled: false,
      running: false,
      lastStartedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastErrorCategory: null,
      lastScannedCount: null,
      lastRecoveredCount: null,
    });

    const snapshot = await service.getSnapshot();

    expect(snapshot.components.providerPaymentRecovery.status).toBe(
      'NOT_READY',
    );
    expect(snapshot.status).toBe('NOT_READY');
    expect(snapshot.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Mandatory provider payment recovery scheduler',
        ),
      ]),
    );
  });

  it('marks enforced external capacity not ready while PostgreSQL remains authoritative', async () => {
    const providerCapacity = {
      getSnapshot: jest.fn().mockReturnValue({
        mode: 'ENFORCED',
        globalRateAdmission: 'ENFORCED',
        globalCoordinator: {
          mode: 'ENFORCED',
          configured: true,
          redisUrlConfigured: true,
          redisReady: false,
          health: 'UNAVAILABLE',
          keyPrefix: 'sawiyaa:test:capacity',
          stateTtlMs: 120_000,
          providers: {
            BREVO: { ratePerSecond: 20, burst: 20 },
            EXPO: { ratePerSecond: 20, burst: 20 },
            SMTP: { ratePerSecond: 20, burst: 20 },
          },
          allowedTotal: 0,
          throttledTotal: 0,
          shadowWouldThrottleTotal: 0,
          coordinatorErrors: 1,
          failClosedDeferrals: 1,
          cooldownEvents: 0,
          lastError: 'capacity redis unavailable',
        },
        metrics: [],
        providers: {},
      }),
    };
    const enforcedService = new ReadinessService(
      paymentRuntime as never,
      undefined,
      undefined,
      providerRecovery as never,
      undefined,
      undefined,
      providerCapacity as never,
    );

    const snapshot = await enforcedService.getSnapshot();

    expect(snapshot.components.notificationCapacity.status).toBe('NOT_READY');
    expect(snapshot.status).toBe('NOT_READY');
    expect(snapshot.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('external provider capacity is not ready'),
      ]),
    );
  });
});
