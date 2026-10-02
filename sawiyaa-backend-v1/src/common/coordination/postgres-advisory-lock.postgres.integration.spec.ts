import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';
import {
  ACCOUNTING_RECONCILIATION_SCHEDULER_LOCK_KEY,
  AccountingReconciliationSchedulerService,
} from '@modules/financial-operations/services/accounting-reconciliation-scheduler.service';

const configuredUrl =
  process.env.ACCOUNTING_RECONCILIATION_GUARD_TEST_DATABASE_URL;
const parsedUrl = configuredUrl ? new URL(configuredUrl) : null;
const databaseName = parsedUrl
  ? decodeURIComponent(parsedUrl.pathname.slice(1))
  : '';
const authorized =
  process.env.NODE_ENV === 'test' &&
  Boolean(configuredUrl) &&
  parsedUrl?.port === '5432' &&
  ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname) &&
  /^sawiyaa_accounting_guard_\d{8}$/i.test(databaseName);

if (configuredUrl && !authorized) {
  throw new Error(
    `Unsafe accounting guard integration database: ${parsedUrl?.hostname}/${databaseName}`,
  );
}

const describeIfAuthorized = authorized ? describe : describe.skip;

const LOCK_IDENTITY = 'sawiyaa:accounting-reconciliation:integration-test';

const completedRun = {
  run: { id: 'integration-run', status: 'COMPLETED' },
  summary: {
    totalChecked: 0,
    totalPassed: 0,
    totalFailed: 0,
    totalWarnings: 0,
    totalCritical: 0,
  },
  issueCount: 0,
};

function activeClientCount(service: PostgresAdvisoryLockService): number {
  return (service as unknown as { activeClients: Set<unknown> }).activeClients
    .size;
}

function buildScheduler(
  lockService: PostgresAdvisoryLockService,
  providerRecovery: { reconcileEligible: jest.Mock },
  runFull: jest.Mock,
) {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'accountingReconciliation.enabled') return true;
      if (key === 'accountingReconciliation.lookbackDays') return 7;
      if (key === 'accountingReconciliation.batchSize') return 100;
      return undefined;
    }),
  };
  const moduleRef = {
    get: jest.fn().mockReturnValue(providerRecovery),
  };

  return new AccountingReconciliationSchedulerService(
    configService as never,
    {} as never,
    { runFull } as never,
    lockService,
    moduleRef as never,
  );
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2_000,
): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error('Timed out waiting for the scheduler owner');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describeIfAuthorized('PostgreSQL advisory lock integration', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    process.env.DATABASE_URL = configuredUrl;
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('proves non-blocking ownership, explicit release, and cleanup', async () => {
    const first = new PostgresAdvisoryLockService();
    const second = new PostgresAdvisoryLockService();

    try {
      const firstLease = await first.tryAcquire(LOCK_IDENTITY);
      expect(firstLease).not.toBeNull();
      expect(activeClientCount(first)).toBe(1);

      const startedAt = performance.now();
      const skippedLease = await second.tryAcquire(LOCK_IDENTITY);
      const elapsedMs = performance.now() - startedAt;

      expect(skippedLease).toBeNull();
      expect(elapsedMs).toBeLessThan(1_000);
      expect(activeClientCount(second)).toBe(0);

      await firstLease!.release();
      expect(activeClientCount(first)).toBe(0);

      const reacquiredLease = await second.tryAcquire(LOCK_IDENTITY);
      expect(reacquiredLease).not.toBeNull();
      await reacquiredLease!.release();
      expect(activeClientCount(second)).toBe(0);
    } finally {
      await first.onModuleDestroy();
      await second.onModuleDestroy();
    }
  });

  it('releases the lock when the owning connection disconnects', async () => {
    const first = new PostgresAdvisoryLockService();
    const second = new PostgresAdvisoryLockService();

    try {
      const firstLease = await first.tryAcquire(LOCK_IDENTITY);
      expect(firstLease).not.toBeNull();

      await first.onModuleDestroy();
      expect(activeClientCount(first)).toBe(0);

      const reacquiredLease = await second.tryAcquire(LOCK_IDENTITY);
      expect(reacquiredLease).not.toBeNull();
      await reacquiredLease!.release();
      expect(activeClientCount(second)).toBe(0);
    } finally {
      await first.onModuleDestroy();
      await second.onModuleDestroy();
    }
  });

  it('protects the full scheduler callback across two real PostgreSQL owners', async () => {
    const firstLock = new PostgresAdvisoryLockService();
    const secondLock = new PostgresAdvisoryLockService();
    const firstProviderRecovery = {
      reconcileEligible: jest.fn().mockResolvedValue(undefined),
    };
    const secondProviderRecovery = {
      reconcileEligible: jest.fn().mockResolvedValue(undefined),
    };
    let releaseReconciliation!: () => void;
    const reconciliationReleased = new Promise<void>((resolve) => {
      releaseReconciliation = resolve;
    });
    const firstRunFull = jest.fn(async () => {
      await reconciliationReleased;
      return completedRun;
    });
    const secondRunFull = jest.fn().mockResolvedValue(completedRun);
    const firstScheduler = buildScheduler(
      firstLock,
      firstProviderRecovery,
      firstRunFull,
    );
    const secondScheduler = buildScheduler(
      secondLock,
      secondProviderRecovery,
      secondRunFull,
    );

    try {
      const firstRun = firstScheduler.runScheduledReconciliation('cron');
      await waitFor(
        () => firstProviderRecovery.reconcileEligible.mock.calls.length === 1,
      );

      const secondResult =
        await secondScheduler.runScheduledReconciliation('cron');
      expect(secondResult).toBeNull();
      expect(secondProviderRecovery.reconcileEligible).not.toHaveBeenCalled();
      expect(secondRunFull).not.toHaveBeenCalled();
      expect(activeClientCount(secondLock)).toBe(0);

      releaseReconciliation();
      const firstResult = await firstRun;

      expect(firstResult?.run.id).toBe('integration-run');
      expect(firstProviderRecovery.reconcileEligible).toHaveBeenCalledTimes(1);
      expect(firstRunFull).toHaveBeenCalledTimes(1);
      expect(activeClientCount(firstLock)).toBe(0);
    } finally {
      releaseReconciliation();
      await firstLock.onModuleDestroy();
      await secondLock.onModuleDestroy();
    }
  });

  it('releases real ownership after a protected callback failure', async () => {
    const ownerLock = new PostgresAdvisoryLockService();
    const laterLock = new PostgresAdvisoryLockService();
    const providerRecovery = {
      reconcileEligible: jest.fn().mockResolvedValue(undefined),
    };
    const runFull = jest
      .fn()
      .mockRejectedValueOnce(new Error('controlled callback failure'));
    const scheduler = buildScheduler(ownerLock, providerRecovery, runFull);

    try {
      await expect(
        scheduler.runScheduledReconciliation('cron'),
      ).resolves.toBeNull();
      expect(activeClientCount(ownerLock)).toBe(0);

      const laterLease = await laterLock.tryAcquire(
        ACCOUNTING_RECONCILIATION_SCHEDULER_LOCK_KEY,
      );
      expect(laterLease).not.toBeNull();
      await laterLease!.release();
      expect(activeClientCount(laterLock)).toBe(0);
    } finally {
      await ownerLock.onModuleDestroy();
      await laterLock.onModuleDestroy();
    }
  });
});
