"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAccountingReconciliationIssue,
  getAccountingReconciliationIssue,
  getAccountingReconciliationRun,
  getAccountingReconciliationStatus,
  ignoreAccountingReconciliationIssue,
  listAccountingReconciliationIssues,
  listAccountingReconciliationRuns,
  resolveAccountingReconciliationIssue,
  runFullReconciliation,
  runPackageSettlementsReconciliation,
  runPaymentsReconciliation,
  runRefundsReconciliation,
  runWalletsReconciliation,
} from "./api";
import { accountingReconciliationQueryKeys } from "./query-keys";
import type {
  AccountingReconciliationIssueQuery,
  AccountingReconciliationReviewPayload,
  AccountingReconciliationRunAction,
  AccountingReconciliationRunQuery,
} from "./types";

export function useAccountingReconciliationStatus(enabled = true) {
  return useQuery({
    queryKey: accountingReconciliationQueryKeys.status(),
    queryFn: getAccountingReconciliationStatus,
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

export function useAccountingReconciliationRuns(
  params: AccountingReconciliationRunQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: accountingReconciliationQueryKeys.runs(params),
    queryFn: () => listAccountingReconciliationRuns(params),
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });
}

export function useAccountingReconciliationRun(runId?: string) {
  return useQuery({
    queryKey: accountingReconciliationQueryKeys.runDetail(runId ?? ""),
    queryFn: () => getAccountingReconciliationRun(runId as string),
    enabled: Boolean(runId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });
}

export function useAccountingReconciliationIssues(
  params: AccountingReconciliationIssueQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: accountingReconciliationQueryKeys.issues(params),
    queryFn: () => listAccountingReconciliationIssues(params),
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });
}

export function useAccountingReconciliationIssue(issueId?: string) {
  return useQuery({
    queryKey: accountingReconciliationQueryKeys.issueDetail(issueId ?? ""),
    queryFn: () => getAccountingReconciliationIssue(issueId as string),
    enabled: Boolean(issueId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });
}

export function useRunAccountingReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: AccountingReconciliationRunAction & { kind: string }) => {
      switch (action.kind) {
        case "PAYMENTS":
          return runPaymentsReconciliation(action);
        case "WALLETS":
          return runWalletsReconciliation(action);
        case "REFUNDS":
          return runRefundsReconciliation(action);
        case "PACKAGE_SETTLEMENTS":
          return runPackageSettlementsReconciliation(action);
        default:
          return runFullReconciliation(action);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingReconciliationQueryKeys.all });
    },
  });
}

export function useReviewAccountingReconciliationIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      issueId: string;
      action: "ACKNOWLEDGE" | "RESOLVE" | "IGNORE";
      payload: AccountingReconciliationReviewPayload;
    }) => {
      switch (input.action) {
        case "ACKNOWLEDGE":
          return acknowledgeAccountingReconciliationIssue(input.issueId, input.payload);
        case "RESOLVE":
          return resolveAccountingReconciliationIssue(input.issueId, input.payload);
        default:
          return ignoreAccountingReconciliationIssue(input.issueId, input.payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingReconciliationQueryKeys.all });
    },
  });
}
