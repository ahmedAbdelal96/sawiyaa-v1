import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AccountingDashboardData,
  AccountingDashboardQuery,
  JournalEntryDetail,
  LedgerAccountFilterOption,
  LedgerExplorerListData,
  LedgerExplorerQuery,
  ReconciliationListData,
  ReconciliationOverview,
  ReconciliationQuery,
  ReconciliationReviewUpdate,
  ReconciliationSourceType,
  UpdateReconciliationReviewInput,
} from "../types/admin-accounting.types";

export async function getAdminAccountingDashboard(params: AccountingDashboardQuery) {
  const response = await httpClient.get<ApiPayload<AccountingDashboardData>>(
    "/admin/finance/accounting/dashboard",
    { params },
  );

  return extractData(response.data);
}

export async function downloadAdminAccountingDashboardCsv(
  params: AccountingDashboardQuery,
) {
  const response = await httpClient.get(
    "/admin/finance/accounting/dashboard/export.csv",
    {
      params,
      responseType: "blob",
    },
  );

  const fileNameHeader = response.headers?.["content-disposition"];
  return {
    blob: response.data as Blob,
    fileNameHeader:
      typeof fileNameHeader === "string" ? fileNameHeader : undefined,
  };
}

export async function listAdminLedgerAccountOptions(currencyCode?: string) {
  const response = await httpClient.get<
    ApiPayload<{ items: LedgerAccountFilterOption[] }>
  >("/admin/finance/accounting/ledger/accounts", {
    params: {
      currencyCode,
    },
  });

  return extractData(response.data);
}

export async function listAdminLedgerEntries(params: LedgerExplorerQuery) {
  const response = await httpClient.get<ApiPayload<LedgerExplorerListData>>(
    "/admin/finance/accounting/ledger/entries",
    { params },
  );

  return extractData(response.data);
}

export async function downloadAdminLedgerEntriesCsv(params: LedgerExplorerQuery) {
  const response = await httpClient.get(
    "/admin/finance/accounting/ledger/entries/export.csv",
    {
      params,
      responseType: "blob",
    },
  );

  const fileNameHeader = response.headers?.["content-disposition"];
  return {
    blob: response.data as Blob,
    fileNameHeader:
      typeof fileNameHeader === "string" ? fileNameHeader : undefined,
  };
}

export async function getAdminLedgerJournalEntry(journalEntryId: string) {
  const response = await httpClient.get<ApiPayload<{ item: JournalEntryDetail }>>(
    `/admin/finance/accounting/ledger/entries/${journalEntryId}`,
  );

  return extractData(response.data);
}

export async function getAdminAccountingReconciliationOverview(
  params: ReconciliationQuery,
) {
  const response = await httpClient.get<ApiPayload<ReconciliationOverview>>(
    "/admin/finance/accounting/reconciliation/overview",
    { params },
  );

  return extractData(response.data);
}

export async function listAdminAccountingReconciliationItems(
  params: ReconciliationQuery,
) {
  const response = await httpClient.get<ApiPayload<ReconciliationListData>>(
    "/admin/finance/accounting/reconciliation/items",
    { params },
  );

  return extractData(response.data);
}

export async function updateAdminAccountingReconciliationReview(
  sourceType: ReconciliationSourceType,
  sourceId: string,
  payload: UpdateReconciliationReviewInput,
) {
  const response = await httpClient.patch<ApiPayload<ReconciliationReviewUpdate>>(
    `/admin/finance/accounting/reconciliation/items/${sourceType}/${sourceId}/review`,
    payload,
  );

  return extractData(response.data);
}
