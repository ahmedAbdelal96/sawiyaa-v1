import { ReadinessService } from './readiness.service';

describe('ReadinessService', () => {
  const paymentRuntime = {
    getPaymentRoutingConfig: jest.fn(),
  };
  const service = new ReadinessService(paymentRuntime as never);

  beforeEach(() => {
    jest.resetAllMocks();
    paymentRuntime.getPaymentRoutingConfig.mockReturnValue({ routeReadiness: [] });
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

  it('keeps completion ready and reports attendance degraded when disabled', () => {
    process.env.SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED = 'false';
    const snapshot = service.getSnapshot();
    expect(snapshot.components.sessionCompletionWorker.status).toBe('READY');
    expect(snapshot.components.attendanceReconciliation.status).toBe('DEGRADED');
    expect(snapshot.status).toBe('DEGRADED');
  });

  it('reports production Daily configuration as not ready when incomplete', () => {
    delete process.env.DAILY_WEBHOOK_SECRET;
    expect(service.getSnapshot().components.dailyWebhook.status).toBe('NOT_READY');
  });

  it('makes disabled reconciliation explicit in readiness', () => {
    const snapshot = service.getSnapshot();

    expect(snapshot.components.accountingReconciliation).toEqual({
      status: 'DEGRADED',
      detail: expect.stringContaining('disabled'),
    });
    expect(snapshot.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ACCOUNTING_RECONCILIATION_ENABLED'),
      ]),
    );
  });
});
