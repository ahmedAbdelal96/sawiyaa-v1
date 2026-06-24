import type {
  AccountingReconciliationIssueQuery,
  AccountingReconciliationRunQuery,
} from "./types";

export const accountingReconciliationQueryKeys = {
  all: ["admin-accounting-reconciliation"] as const,
  status: () => [...accountingReconciliationQueryKeys.all, "status"] as const,
  runs: (params: AccountingReconciliationRunQuery) =>
    [...accountingReconciliationQueryKeys.all, "runs", params] as const,
  runDetail: (runId: string) =>
    [...accountingReconciliationQueryKeys.all, "run-detail", runId] as const,
  issues: (params: AccountingReconciliationIssueQuery) =>
    [...accountingReconciliationQueryKeys.all, "issues", params] as const,
  issueDetail: (issueId: string) =>
    [...accountingReconciliationQueryKeys.all, "issue-detail", issueId] as const,
};
