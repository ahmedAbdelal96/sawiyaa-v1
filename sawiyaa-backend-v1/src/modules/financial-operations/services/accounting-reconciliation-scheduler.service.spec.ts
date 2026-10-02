import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountingReconciliationAlertService } from './accounting-reconciliation-alert.service';
import { AccountingReconciliationOperationsService } from './accounting-reconciliation-operations.service';
import { AccountingReconciliationSchedulerService } from './accounting-reconciliation-scheduler.service';

const cronFromMock = jest.fn();

jest.mock('cron', () => ({
  CronJob: {
    from: (...args: unknown[]) => cronFromMock(...args),
  },
}));

function buildService(
  enabled = true,
  overrides?: {
    lockService?: { tryAcquire: jest.Mock };
    providerRecovery?: { reconcileEligible: jest.Mock };
    runFull?: jest.Mock;
  },
) {
  const providerRecovery = overrides?.providerRecovery ?? {
    reconcileEligible: jest.fn().mockResolvedValue(undefined),
  };
  const operationsService = {
    runFull:
      overrides?.runFull ??
      jest.fn().mockResolvedValue({
        run: {
          id: 'run_1',
          scope: 'FULL',
          status: 'COMPLETED',
        },
        summary: {
          totalChecked: 1,
          totalPassed: 1,
          totalFailed: 0,
          totalWarnings: 0,
          totalCritical: 0,
        },
        issueCount: 0,
      }),
  } as unknown as AccountingReconciliationOperationsService;

  const alertService = {
    handleCriticalRunIssues: jest.fn().mockResolvedValue(undefined),
  } as unknown as AccountingReconciliationAlertService;

  const prisma = {
    accountingReconciliationRun: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    accountingReconciliationIssue: {
      count: jest.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;

  const lockService = overrides?.lockService ?? {
    tryAcquire: jest.fn().mockResolvedValue({
      release: jest.fn().mockResolvedValue(undefined),
    }),
  };

  const moduleRef = {
    get: jest.fn().mockReturnValue(providerRecovery),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'accountingReconciliation.enabled') return enabled;
      if (key === 'accountingReconciliation.alertsEnabled') return false;
      if (key === 'accountingReconciliation.cron') return '0 3 * * *';
      if (key === 'accountingReconciliation.lookbackDays') return 7;
      if (key === 'accountingReconciliation.batchSize') return 100;
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new AccountingReconciliationSchedulerService(
    configService,
    prisma,
    operationsService,
    lockService,
    moduleRef,
  );

  return {
    service,
    operationsService: operationsService as unknown as { runFull: jest.Mock },
    providerRecovery,
    lockService,
    moduleRef,
    alertService: alertService as unknown as {
      handleCriticalRunIssues: jest.Mock;
    },
    prisma,
    configService,
  };
}

describe('AccountingReconciliationSchedulerService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('does not start when disabled', () => {
    const setup = buildService(false);

    setup.service.onModuleInit();

    expect(cronFromMock).not.toHaveBeenCalled();
  });

  it('starts the cron job when enabled', () => {
    process.env.NODE_ENV = 'production';
    const stop = jest.fn();
    const nextDate = jest.fn(() => ({
      toJSDate: () => new Date('2026-05-15T03:00:00.000Z'),
    }));
    cronFromMock.mockReturnValue({
      stop,
      nextDate,
    });

    const setup = buildService(true);
    setup.service.onModuleInit();

    expect(cronFromMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cronTime: '0 3 * * *',
        start: true,
        timeZone: 'UTC',
        waitForCompletion: true,
      }),
    );
  });

  it('runs scheduled reconciliation with configured lookback and batch size', async () => {
    const setup = buildService(true);

    const result = await setup.service.runScheduledReconciliation();

    expect(setup.operationsService.runFull).toHaveBeenCalledWith({
      scope: 'FULL',
      trigger: 'SCHEDULED',
      lookbackDays: 7,
      batchSize: 100,
    });
    expect(result?.run.id).toBe('run_1');
    expect(setup.providerRecovery.reconcileEligible).toHaveBeenCalledWith(100);
  });

  it('allows one replica to execute while another replica skips safely', async () => {
    let owner = false;
    let releaseRun!: () => void;
    const runReleased = new Promise<void>((resolve) => {
      releaseRun = resolve;
    });
    const sharedLockService = {
      tryAcquire: jest.fn(async () => {
        if (owner) {
          return null;
        }

        owner = true;
        return {
          release: jest.fn(async () => {
            owner = false;
          }),
        };
      }),
    };
    const runFull = jest.fn(async () => {
      await runReleased;
      return {
        run: { id: 'run_1', status: 'COMPLETED' },
        summary: { totalCritical: 0 },
        issueCount: 0,
      };
    });
    const first = buildService(true, {
      lockService: sharedLockService,
      runFull,
    });
    const second = buildService(true, { lockService: sharedLockService });

    const firstRun = first.service.runScheduledReconciliation('cron');
    await Promise.resolve();
    const secondResult =
      await second.service.runScheduledReconciliation('cron');
    releaseRun();
    const firstResult = await firstRun;

    expect(secondResult).toBeNull();
    expect(firstResult?.run.id).toBe('run_1');
    expect(runFull).toHaveBeenCalledTimes(1);
    expect(first.providerRecovery.reconcileEligible).toHaveBeenCalledTimes(1);
    expect(second.providerRecovery.reconcileEligible).not.toHaveBeenCalled();
  });

  it('skips without executing or creating a failed run when the lock is unavailable', async () => {
    const setup = buildService(true, {
      lockService: {
        tryAcquire: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      setup.service.runScheduledReconciliation('cron'),
    ).resolves.toBeNull();

    expect(setup.providerRecovery.reconcileEligible).not.toHaveBeenCalled();
    expect(setup.operationsService.runFull).not.toHaveBeenCalled();
  });

  it('does not execute reconciliation when lock acquisition fails', async () => {
    const setup = buildService(true, {
      lockService: {
        tryAcquire: jest
          .fn()
          .mockRejectedValue(new Error('database unavailable')),
      },
    });

    await expect(
      setup.service.runScheduledReconciliation('cron'),
    ).resolves.toBeNull();

    expect(setup.providerRecovery.reconcileEligible).not.toHaveBeenCalled();
    expect(setup.operationsService.runFull).not.toHaveBeenCalled();
  });

  it('retains the process-local overlap guard before distributed coordination', async () => {
    let releaseRun!: () => void;
    const runReleased = new Promise<void>((resolve) => {
      releaseRun = resolve;
    });
    const runFull = jest.fn(async () => {
      await runReleased;
      return {
        run: { id: 'run_1', status: 'COMPLETED' },
        summary: { totalCritical: 0 },
        issueCount: 0,
      };
    });
    const setup = buildService(true, { runFull });

    const firstRun = setup.service.runScheduledReconciliation('cron');
    await Promise.resolve();
    const secondResult = await setup.service.runScheduledReconciliation('cron');
    releaseRun();
    await firstRun;

    expect(secondResult).toBeNull();
    expect(setup.lockService.tryAcquire).toHaveBeenCalledTimes(1);
  });

  it('releases ownership when provider recovery fails', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    const tryAcquire = jest
      .fn()
      .mockResolvedValueOnce({ release })
      .mockResolvedValueOnce({ release });
    const providerRecovery = {
      reconcileEligible: jest
        .fn()
        .mockRejectedValueOnce(new Error('provider recovery failed'))
        .mockResolvedValueOnce(undefined),
    };
    const setup = buildService(true, {
      lockService: { tryAcquire },
      providerRecovery,
    });

    await expect(
      setup.service.runScheduledReconciliation('cron'),
    ).resolves.toBeNull();
    await expect(
      setup.service.runScheduledReconciliation('cron'),
    ).resolves.toMatchObject({ run: { id: 'run_1' } });

    expect(release).toHaveBeenCalledTimes(2);
    expect(setup.operationsService.runFull).toHaveBeenCalledTimes(1);
  });

  it('releases ownership after failure so a later run can acquire', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    const tryAcquire = jest
      .fn()
      .mockResolvedValueOnce({ release })
      .mockResolvedValueOnce({ release });
    const runFull = jest
      .fn()
      .mockRejectedValueOnce(new Error('reconciliation failed'))
      .mockResolvedValueOnce({
        run: { id: 'run_2', status: 'COMPLETED' },
        summary: { totalCritical: 0 },
        issueCount: 0,
      });
    const setup = buildService(true, {
      lockService: { tryAcquire },
      runFull,
    });

    await expect(
      setup.service.runScheduledReconciliation('cron'),
    ).resolves.toBeNull();
    await expect(
      setup.service.runScheduledReconciliation('cron'),
    ).resolves.toMatchObject({ run: { id: 'run_2' } });

    expect(release).toHaveBeenCalledTimes(2);
    expect(runFull).toHaveBeenCalledTimes(2);
  });

  it('returns null when runFull fails', async () => {
    const setup = buildService(true);
    setup.operationsService.runFull.mockRejectedValueOnce(new Error('boom'));

    const result = await setup.service.runScheduledReconciliation();

    expect(result).toBeNull();
  });

  it('builds a safe status snapshot', async () => {
    process.env.NODE_ENV = 'production';
    const stop = jest.fn();
    const nextDate = jest.fn(() => ({
      toJSDate: () => new Date('2026-05-15T03:00:00.000Z'),
    }));
    cronFromMock.mockReturnValue({
      stop,
      nextDate,
    });

    const setup = buildService(true);
    setup.service.onModuleInit();
    setup.prisma.accountingReconciliationRun.findFirst = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'run_1',
        startedAt: new Date('2026-05-15T01:00:00.000Z'),
        status: 'COMPLETED',
        totalCritical: 1,
        totalWarnings: 2,
        totalFailed: 1,
      })
      .mockResolvedValueOnce({
        startedAt: new Date('2026-05-14T00:00:00.000Z'),
      }) as unknown as PrismaService['accountingReconciliationRun']['findFirst'];

    const snapshot = await setup.service.getStatusSnapshot();

    expect(snapshot.enabled).toBe(true);
    expect(snapshot.nextScheduledRunAt).toBe('2026-05-15T03:00:00.000Z');
    expect(snapshot.lastScheduledRunId).toBe('run_1');
    expect(snapshot.openCriticalCount).toBe(0);
    expect(snapshot.openWarningCount).toBe(0);
  });
});
