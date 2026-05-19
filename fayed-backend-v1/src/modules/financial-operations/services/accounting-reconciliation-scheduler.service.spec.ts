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

function buildService(enabled = true) {
  const operationsService = {
    runFull: jest.fn().mockResolvedValue({
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
  );

  return {
    service,
    operationsService: operationsService as unknown as { runFull: jest.Mock },
    alertService: alertService as unknown as { handleCriticalRunIssues: jest.Mock },
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
