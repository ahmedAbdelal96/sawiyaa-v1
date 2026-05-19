import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  AccountingReconciliationAlertSummary,
  AccountingReconciliationIssueSeed,
  AccountingReconciliationRunScope,
  AccountingReconciliationRunExecutionSummary,
} from '../types/accounting-reconciliation-operations.types';

type AlertGroup = {
  currencyCode: string | null;
  issueSeeds: AccountingReconciliationIssueSeed[];
};

@Injectable()
export class AccountingReconciliationAlertService {
  private readonly logger = new Logger(AccountingReconciliationAlertService.name);
  private readonly alertCooldownMs = 30 * 60 * 1000;
  private readonly lastAlertFingerprintAt = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async handleCriticalRunIssues(input: {
    runId: string;
    scope: AccountingReconciliationRunScope;
    issueSeeds: AccountingReconciliationIssueSeed[];
    summary: AccountingReconciliationRunExecutionSummary;
  }): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const criticalIssues = input.issueSeeds.filter(
      (issue) => issue.severity === 'CRITICAL',
    );
    if (criticalIssues.length === 0) {
      return;
    }

    const groups = this.groupByCurrency(criticalIssues);

    for (const group of groups) {
      const topIssueCodes = this.countIssueCodes(group.issueSeeds);
      const criticalCount = group.issueSeeds.length;
      const fingerprint = [
        input.scope,
        group.currencyCode ?? 'MULTI',
        criticalCount,
        topIssueCodes.map((item) => `${item.code}:${item.count}`).join(','),
      ].join('|');

      if (this.isSuppressed(fingerprint)) {
        continue;
      }

      const summary: AccountingReconciliationAlertSummary = {
        runId: input.runId,
        scope: input.scope,
        currencyCode: group.currencyCode,
        issueCount: input.issueSeeds.length,
        criticalCount,
        topIssueCodes,
        triggeredAt: new Date().toISOString(),
      };

      this.logger.warn(
        `Accounting reconciliation critical alert run=${summary.runId} scope=${summary.scope} currency=${summary.currencyCode ?? 'MULTI'} critical=${summary.criticalCount} issues=${summary.issueCount} topCodes=${summary.topIssueCodes
          .slice(0, 3)
          .map((item) => `${item.code}:${item.count}`)
          .join(',')}`,
      );

      this.securityAuditService.logAsync({
        action: 'finance.accounting.reconciliation.alert.critical',
        outcome: SecurityAuditOutcome.SUCCESS,
        resourceType: 'AccountingReconciliationRun',
        resourceId: input.runId,
        metadata: summary,
      });

      this.lastAlertFingerprintAt.set(fingerprint, Date.now());
    }
  }

  private groupByCurrency(issues: AccountingReconciliationIssueSeed[]) {
    const map = new Map<string | null, AccountingReconciliationIssueSeed[]>();

    for (const issue of issues) {
      const currencyCode = issue.currencyCode?.trim().toUpperCase() ?? null;
      const current = map.get(currencyCode) ?? [];
      current.push({ ...issue, currencyCode: currencyCode ?? issue.currencyCode });
      map.set(currencyCode, current);
    }

    return Array.from(map.entries()).map(([currencyCode, issueSeeds]) => ({
      currencyCode,
      issueSeeds,
    }));
  }

  private countIssueCodes(issueSeeds: AccountingReconciliationIssueSeed[]) {
    const counts = new Map<string, number>();
    for (const issue of issueSeeds) {
      counts.set(issue.issueCode, (counts.get(issue.issueCode) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }

  private isEnabled() {
    return (
      this.configService.get<boolean>('accountingReconciliation.alertsEnabled') ??
      false
    );
  }

  private isSuppressed(fingerprint: string) {
    const lastAlertAt = this.lastAlertFingerprintAt.get(fingerprint);
    if (!lastAlertAt) {
      return false;
    }

    return Date.now() - lastAlertAt < this.alertCooldownMs;
  }
}
