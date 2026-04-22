import type {
  AccountingDashboardQuery,
  LedgerExplorerQuery,
  ReconciliationQuery,
} from "../types/admin-accounting.types";

export const adminAccountingQueryKeys = {
  all: ["admin-accounting"] as const,
  dashboard: (params: AccountingDashboardQuery) =>
    [...adminAccountingQueryKeys.all, "dashboard", params] as const,
  ledgerAccounts: (currencyCode?: string) =>
    [...adminAccountingQueryKeys.all, "ledger-accounts", currencyCode ?? "all"] as const,
  ledgerList: (params: LedgerExplorerQuery) =>
    [...adminAccountingQueryKeys.all, "ledger-list", params] as const,
  journalDetail: (journalEntryId: string) =>
    [...adminAccountingQueryKeys.all, "journal-detail", journalEntryId] as const,
  reconciliationOverview: (params: ReconciliationQuery) =>
    [...adminAccountingQueryKeys.all, "reconciliation-overview", params] as const,
  reconciliationItems: (params: ReconciliationQuery) =>
    [...adminAccountingQueryKeys.all, "reconciliation-items", params] as const,
};
