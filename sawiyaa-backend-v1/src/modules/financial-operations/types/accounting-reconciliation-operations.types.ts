import { JournalEntrySourceType, Prisma } from '@prisma/client';

export type AccountingReconciliationRunScope =
  | 'PAYMENTS'
  | 'WALLETS'
  | 'SETTLEMENTS'
  | 'REFUNDS'
  | 'PACKAGE_SETTLEMENTS'
  | 'FULL';

export type AccountingReconciliationRunTrigger =
  | 'MANUAL'
  | 'ADMIN'
  | 'SCHEDULED'
  | 'SYSTEM';

export type AccountingReconciliationRunStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ISSUES'
  | 'FAILED';

export type AccountingReconciliationIssueStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'IGNORED';

export type AccountingReconciliationSeverity =
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL';

export type AccountingReconciliationScopeFilter =
  | AccountingReconciliationRunScope
  | null
  | undefined;

export type AccountingReconciliationRunViewModel = {
  id: string;
  scope: AccountingReconciliationRunScope;
  trigger: AccountingReconciliationRunTrigger;
  status: AccountingReconciliationRunStatus;
  entityType: string | null;
  entityId: string | null;
  currencyCode: string | null;
  startedAt: string;
  completedAt: string | null;
  totalChecked: number;
  totalPassed: number;
  totalFailed: number;
  totalWarnings: number;
  totalCritical: number;
  summaryJson: Record<string, unknown> | null;
  metadataJson: Record<string, unknown> | null;
  triggeredByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountingReconciliationIssueViewModel = {
  id: string;
  runId: string;
  scope: AccountingReconciliationRunScope;
  entityType: string;
  entityId: string;
  currencyCode: string;
  issueCode: string;
  severity: AccountingReconciliationSeverity;
  status: AccountingReconciliationIssueStatus;
  message: string;
  expectedValue: string | null;
  actualValue: string | null;
  metadataJson: Record<string, unknown> | null;
  firstDetectedAt: string;
  lastDetectedAt: string;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  ignoredAt: string | null;
  ignoredByUserId: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountingReconciliationIssueReviewAction =
  | 'ACKNOWLEDGE'
  | 'RESOLVE'
  | 'IGNORE';

export type AccountingReconciliationRunRequest = {
  scope: AccountingReconciliationRunScope;
  trigger: AccountingReconciliationRunTrigger;
  triggeredByUserId?: string | null;
  currencyCode?: string | null;
  practitionerId?: string | null;
  patientId?: string | null;
  entityId?: string | null;
  from?: Date;
  to?: Date;
  lookbackDays?: number;
  batchSize?: number;
  query?: string | null;
};

export type AccountingReconciliationRunExecutionSummary = {
  totalChecked: number;
  totalPassed: number;
  totalFailed: number;
  totalWarnings: number;
  totalCritical: number;
};

export type AccountingReconciliationRunExecutionResult = {
  run: AccountingReconciliationRunRecord;
  summary: AccountingReconciliationRunExecutionSummary;
  issueCount: number;
};

export type AccountingReconciliationAlertSummary = {
  runId: string;
  scope: AccountingReconciliationRunScope;
  currencyCode: string | null;
  issueCount: number;
  criticalCount: number;
  topIssueCodes: Array<{
    code: string;
    count: number;
  }>;
  triggeredAt: string;
};

export type AccountingReconciliationSchedulerState = {
  enabled: boolean;
  alertsEnabled: boolean;
  cron: string;
  lookbackDays: number;
  batchSize: number;
  active: boolean;
  nextScheduledRunAt: string | null;
  lastScheduledRunAt: string | null;
  lastScheduledRunId: string | null;
  lastScheduledRunStatus: AccountingReconciliationRunStatus | null;
  lastScheduledIssueCount: number | null;
  lastScheduledCriticalCount: number | null;
  lastFullRunAt: string | null;
  openCriticalCount: number;
  openWarningCount: number;
};

export type AccountingReconciliationIssueSeed = {
  runId: string;
  scope: AccountingReconciliationRunScope;
  entityType: string;
  entityId: string;
  currencyCode: string;
  issueCode: string;
  severity: AccountingReconciliationSeverity;
  message: string;
  expectedValue?: string | number | null;
  actualValue?: string | number | null;
  metadataJson?: Record<string, unknown> | null;
};

export type AccountingReconciliationListFilters = {
  scope?: AccountingReconciliationScopeFilter;
  status?: AccountingReconciliationRunStatus | null;
  trigger?: AccountingReconciliationRunTrigger | null;
  entityType?: string | null;
  entityId?: string | null;
  currencyCode?: string | null;
  from?: Date | null;
  to?: Date | null;
  triggeredByUserId?: string | null;
};

export type AccountingReconciliationIssueListFilters = {
  scope?: AccountingReconciliationScopeFilter;
  status?: AccountingReconciliationIssueStatus | null;
  severity?: AccountingReconciliationSeverity | null;
  entityType?: string | null;
  entityId?: string | null;
  currencyCode?: string | null;
  issueCode?: string | null;
  runId?: string | null;
  from?: Date | null;
  to?: Date | null;
};

export type AccountingReconciliationPaginatedResult<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type AccountingReconciliationRunRecord = {
  id: string;
  scope: AccountingReconciliationRunScope;
  trigger: AccountingReconciliationRunTrigger;
  status: AccountingReconciliationRunStatus;
  entityType: string | null;
  entityId: string | null;
  currencyCode: string | null;
  startedAt: Date;
  completedAt: Date | null;
  totalChecked: number;
  totalPassed: number;
  totalFailed: number;
  totalWarnings: number;
  totalCritical: number;
  summaryJson: Prisma.JsonValue | null;
  metadataJson: Prisma.JsonValue | null;
  triggeredByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountingReconciliationIssueRecord = {
  id: string;
  runId: string;
  scope: AccountingReconciliationRunScope;
  entityType: string;
  entityId: string;
  currencyCode: string;
  issueCode: string;
  severity: AccountingReconciliationSeverity;
  status: AccountingReconciliationIssueStatus;
  message: string;
  expectedValue: string | null;
  actualValue: string | null;
  metadataJson: Prisma.JsonValue | null;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedByUserId: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  ignoredAt: Date | null;
  ignoredByUserId: string | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountingReconciliationScopeSourceTypeMap = Partial<
  Record<AccountingReconciliationRunScope, JournalEntrySourceType>
>;
