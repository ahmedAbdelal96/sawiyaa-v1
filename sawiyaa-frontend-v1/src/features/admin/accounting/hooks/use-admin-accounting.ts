import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  downloadAdminAccountingDashboardCsv,
  downloadAdminLedgerEntriesCsv,
  getAdminAccountingDashboard,
  getAdminAccountingReconciliationOverview,
  getAdminLedgerJournalEntry,
  listAdminAccountingReconciliationItems,
  listAdminLedgerAccountOptions,
  listAdminLedgerEntries,
  updateAdminAccountingReconciliationReview,
} from "../api/admin-accounting.api";
import { adminAccountingQueryKeys } from "../constants/query-keys";
import type {
  AccountingDashboardQuery,
  LedgerExplorerQuery,
  ReconciliationQuery,
  ReconciliationSourceType,
  UpdateReconciliationReviewInput,
} from "../types/admin-accounting.types";

export function useAdminAccountingDashboard(
  params: AccountingDashboardQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminAccountingQueryKeys.dashboard(params),
    queryFn: () => getAdminAccountingDashboard(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminLedgerAccountOptions(currencyCode?: string) {
  return useQuery({
    queryKey: adminAccountingQueryKeys.ledgerAccounts(currencyCode),
    queryFn: () => listAdminLedgerAccountOptions(currencyCode),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminLedgerEntries(
  params: LedgerExplorerQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminAccountingQueryKeys.ledgerList(params),
    queryFn: () => listAdminLedgerEntries(params),
    enabled: options?.enabled ?? true,
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminLedgerJournalEntry(journalEntryId?: string) {
  return useQuery({
    queryKey: adminAccountingQueryKeys.journalDetail(journalEntryId ?? ""),
    queryFn: () => getAdminLedgerJournalEntry(journalEntryId as string),
    enabled: Boolean(journalEntryId),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminAccountingReconciliationOverview(
  params: ReconciliationQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminAccountingQueryKeys.reconciliationOverview(params),
    queryFn: () => getAdminAccountingReconciliationOverview(params),
    enabled: options?.enabled ?? true,
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminAccountingReconciliationItems(
  params: ReconciliationQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminAccountingQueryKeys.reconciliationItems(params),
    queryFn: () => listAdminAccountingReconciliationItems(params),
    enabled: options?.enabled ?? true,
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useUpdateAdminAccountingReconciliationReview(
  params: ReconciliationQuery,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      sourceType: ReconciliationSourceType;
      sourceId: string;
      payload: UpdateReconciliationReviewInput;
    }) =>
      updateAdminAccountingReconciliationReview(
        input.sourceType,
        input.sourceId,
        input.payload,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminAccountingQueryKeys.reconciliationItems(params),
      });
      queryClient.invalidateQueries({
        queryKey: adminAccountingQueryKeys.reconciliationOverview(params),
      });
    },
  });
}

export function useDownloadAdminAccountingDashboardCsv() {
  return useMutation({
    mutationFn: (params: AccountingDashboardQuery) =>
      downloadAdminAccountingDashboardCsv(params),
  });
}

export function useDownloadAdminLedgerEntriesCsv() {
  return useMutation({
    mutationFn: (params: LedgerExplorerQuery) =>
      downloadAdminLedgerEntriesCsv(params),
  });
}
