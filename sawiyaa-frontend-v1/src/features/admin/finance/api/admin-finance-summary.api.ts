import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminFinancialOverview,
  AdminFinancialOverviewFilters,
  AdminFinancialOverviewScope,
  AdminFinanceHubSummary,
} from "../types/admin-finance-summary.types";

export async function getAdminFinanceHubSummary() {
  const response = await httpClient.get<ApiPayload<AdminFinanceHubSummary>>(
    "/admin/finance/accounting/dashboard/summary",
  );
  return extractData(response.data);
}

export async function getAdminFinancialOverview(
  scope: AdminFinancialOverviewScope = "accounting",
  filters: AdminFinancialOverviewFilters = {},
) {
  const params = Object.fromEntries(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const path = scope === "wallets"
    ? "/admin/finance/accounting/overview/wallets"
    : scope === "collections"
      ? "/admin/finance/accounting/overview/collections"
      : scope === "payouts"
      ? "/admin/finance/accounting/overview/payouts"
      : "/admin/finance/accounting/overview";
  const response = await httpClient.get<ApiPayload<AdminFinancialOverview>>(
    path,
    Object.keys(params).length ? { params } : undefined,
  );

  return extractData(response.data);
}
