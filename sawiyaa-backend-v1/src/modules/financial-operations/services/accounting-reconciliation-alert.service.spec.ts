import { ConfigService } from '@nestjs/config';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { AccountingReconciliationAlertService } from './accounting-reconciliation-alert.service';

function buildService(enabled = true) {
  const logAsync = jest.fn();
  const securityAuditService = {
    logAsync,
  } as unknown as SecurityAuditService;

  const configService = {
    get: jest.fn(() => enabled),
  } as unknown as ConfigService;

  const service = new AccountingReconciliationAlertService(
    configService,
    securityAuditService,
  );

  return { service, securityAuditService: { logAsync }, configService };
}

describe('AccountingReconciliationAlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits a sanitized critical alert summary when enabled', async () => {
    const setup = buildService(true);

    await setup.service.handleCriticalRunIssues({
      runId: 'run_1',
      scope: 'FULL',
      issueSeeds: [
        {
          runId: 'run_1',
          scope: 'FULL',
          entityType: 'Payment',
          entityId: 'payment_1',
          currencyCode: 'egp',
          issueCode: 'DUPLICATE_POSTING',
          severity: 'CRITICAL',
          message: 'Duplicate posting detected',
          metadataJson: { secret: 'should-not-leak', note: 'safe' },
        },
      ],
      summary: {
        totalChecked: 1,
        totalPassed: 0,
        totalFailed: 1,
        totalWarnings: 0,
        totalCritical: 1,
      },
    });

    expect(setup.securityAuditService.logAsync).toHaveBeenCalledTimes(1);
    const entry = setup.securityAuditService.logAsync.mock.calls[0][0] as {
      metadata?: Record<string, unknown>;
    };
    expect(entry.metadata?.issueCount).toBe(1);
    expect(entry.metadata?.criticalCount).toBe(1);
    expect(entry.metadata?.topIssueCodes).toEqual([
      { code: 'DUPLICATE_POSTING', count: 1 },
    ]);
    expect(JSON.stringify(entry.metadata)).not.toContain('should-not-leak');
  });

  it('does not emit alerts when disabled or when no critical issues exist', async () => {
    const disabled = buildService(false);
    await disabled.service.handleCriticalRunIssues({
      runId: 'run_1',
      scope: 'FULL',
      issueSeeds: [
        {
          runId: 'run_1',
          scope: 'FULL',
          entityType: 'Payment',
          entityId: 'payment_1',
          currencyCode: 'EGP',
          issueCode: 'AMOUNT_MISMATCH',
          severity: 'WARNING',
          message: 'Mismatch',
        },
      ],
      summary: {
        totalChecked: 1,
        totalPassed: 0,
        totalFailed: 1,
        totalWarnings: 1,
        totalCritical: 0,
      },
    });

    expect(disabled.securityAuditService.logAsync).not.toHaveBeenCalled();

    const enabled = buildService(true);
    await enabled.service.handleCriticalRunIssues({
      runId: 'run_2',
      scope: 'FULL',
      issueSeeds: [],
      summary: {
        totalChecked: 1,
        totalPassed: 1,
        totalFailed: 0,
        totalWarnings: 0,
        totalCritical: 0,
      },
    });

    expect(enabled.securityAuditService.logAsync).not.toHaveBeenCalled();
  });
});
