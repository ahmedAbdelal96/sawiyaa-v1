export type AccountingReconciliationRunScope =
  | "PAYMENTS"
  | "WALLETS"
  | "SETTLEMENTS"
  | "REFUNDS"
  | "PACKAGE_SETTLEMENTS"
  | "FULL";

export type AccountingReconciliationRunTrigger =
  | "MANUAL"
  | "ADMIN"
  | "SCHEDULED"
  | "SYSTEM";

export type AccountingReconciliationRunStatus =
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_ISSUES"
  | "FAILED";

export type AccountingReconciliationIssueStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "RESOLVED"
  | "IGNORED";

export type AccountingReconciliationSeverity =
  | "INFO"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";

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

export type AccountingReconciliationRunRecord = {
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

export type AccountingReconciliationRunSummary = {
  totalChecked: number;
  totalPassed: number;
  totalFailed: number;
  totalWarnings: number;
  totalCritical: number;
};

export type AccountingReconciliationRunExecutionResult = {
  run: AccountingReconciliationRunRecord;
  summary: AccountingReconciliationRunSummary;
  issueCount: number;
};

export type AccountingReconciliationRunListData = {
  items: AccountingReconciliationRunRecord[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type AccountingReconciliationIssueListData = {
  items: AccountingReconciliationIssueRecord[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type AccountingReconciliationRunQuery = {
  page?: number;
  limit?: number;
  scope?: AccountingReconciliationRunScope | null;
  status?: AccountingReconciliationRunStatus | null;
  trigger?: AccountingReconciliationRunTrigger | null;
  entityType?: string | null;
  entityId?: string | null;
  currencyCode?: string | null;
  triggeredByUserId?: string | null;
  from?: string | null;
  to?: string | null;
};

export type AccountingReconciliationIssueQuery = {
  page?: number;
  limit?: number;
  scope?: AccountingReconciliationRunScope | null;
  status?: AccountingReconciliationIssueStatus | null;
  severity?: AccountingReconciliationSeverity | null;
  entityType?: string | null;
  entityId?: string | null;
  currencyCode?: string | null;
  issueCode?: string | null;
  runId?: string | null;
  from?: string | null;
  to?: string | null;
};

export type AccountingReconciliationRunAction = {
  scope: Exclude<AccountingReconciliationRunScope, "FULL"> | "FULL";
  query?: Omit<AccountingReconciliationRunQuery, "page" | "limit" | "scope" | "status" | "trigger">;
};

export type AccountingReconciliationReviewPayload = {
  note?: string;
};
