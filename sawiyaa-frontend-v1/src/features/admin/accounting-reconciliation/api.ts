import type { ApiPayload } from "@/lib/api/contracts";
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type {
  AccountingReconciliationIssueListData,
  AccountingReconciliationIssueQuery,
  AccountingReconciliationIssueRecord,
  AccountingReconciliationReviewPayload,
  AccountingReconciliationRunAction,
  AccountingReconciliationRunExecutionResult,
  AccountingReconciliationRunListData,
  AccountingReconciliationRunQuery,
  AccountingReconciliationRunRecord,
  AccountingReconciliationSchedulerState,
} from "./types";

export async function getAccountingReconciliationStatus() {
  const response = await httpClient.get<ApiPayload<AccountingReconciliationSchedulerState>>(
    "/admin/finance/accounting/reconciliation-status",
  );
  return extractData(response.data);
}

export async function listAccountingReconciliationRuns(params: AccountingReconciliationRunQuery) {
  const response = await httpClient.get<ApiPayload<AccountingReconciliationRunListData>>(
    "/admin/finance/accounting/reconciliation-runs",
    { params },
  );
  return extractData(response.data);
}

export async function getAccountingReconciliationRun(runId: string) {
  const response = await httpClient.get<
    ApiPayload<{ run: AccountingReconciliationRunRecord; issues: AccountingReconciliationIssueRecord[] }>
  >(`/admin/finance/accounting/reconciliation-runs/${runId}`);
  return extractData(response.data);
}

export async function listAccountingReconciliationIssues(params: AccountingReconciliationIssueQuery) {
  const response = await httpClient.get<ApiPayload<AccountingReconciliationIssueListData>>(
    "/admin/finance/accounting/reconciliation-issues",
    { params },
  );
  return extractData(response.data);
}

export async function getAccountingReconciliationIssue(issueId: string) {
  const response = await httpClient.get<ApiPayload<{ item: AccountingReconciliationIssueRecord }>>(
    `/admin/finance/accounting/reconciliation-issues/${issueId}`,
  );
  return extractData(response.data);
}

async function runReconciliationEndpoint(
  path: string,
  params?: Record<string, string | number | null | undefined>,
) {
  const response = await httpClient.post<ApiPayload<AccountingReconciliationRunExecutionResult>>(
    path,
    undefined,
    { params },
  );
  return extractData(response.data);
}

export async function runPaymentsReconciliation(action: AccountingReconciliationRunAction) {
  return runReconciliationEndpoint("/admin/finance/accounting/reconciliation-runs/payments", {
    ...action.query,
  });
}

export async function runWalletsReconciliation(action: AccountingReconciliationRunAction) {
  return runReconciliationEndpoint("/admin/finance/accounting/reconciliation-runs/wallets", {
    ...action.query,
  });
}

export async function runRefundsReconciliation(action: AccountingReconciliationRunAction) {
  return runReconciliationEndpoint("/admin/finance/accounting/reconciliation-runs/refunds", {
    ...action.query,
  });
}

export async function runPackageSettlementsReconciliation(action: AccountingReconciliationRunAction) {
  return runReconciliationEndpoint(
    "/admin/finance/accounting/reconciliation-runs/package-settlements",
    {
      ...action.query,
    },
  );
}

export async function runFullReconciliation(action: AccountingReconciliationRunAction) {
  return runReconciliationEndpoint("/admin/finance/accounting/reconciliation-runs/full", {
    ...action.query,
  });
}

export async function acknowledgeAccountingReconciliationIssue(
  issueId: string,
  payload: AccountingReconciliationReviewPayload,
) {
  const response = await httpClient.patch<ApiPayload<AccountingReconciliationIssueRecord>>(
    `/admin/finance/accounting/reconciliation-issues/${issueId}/acknowledge`,
    payload,
  );
  return extractData(response.data);
}

export async function resolveAccountingReconciliationIssue(
  issueId: string,
  payload: AccountingReconciliationReviewPayload,
) {
  const response = await httpClient.patch<ApiPayload<AccountingReconciliationIssueRecord>>(
    `/admin/finance/accounting/reconciliation-issues/${issueId}/resolve`,
    payload,
  );
  return extractData(response.data);
}

export async function ignoreAccountingReconciliationIssue(
  issueId: string,
  payload: AccountingReconciliationReviewPayload,
) {
  const response = await httpClient.patch<ApiPayload<AccountingReconciliationIssueRecord>>(
    `/admin/finance/accounting/reconciliation-issues/${issueId}/ignore`,
    payload,
  );
  return extractData(response.data);
}
