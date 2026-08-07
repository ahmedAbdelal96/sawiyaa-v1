import { useQuery } from "@tanstack/react-query";
import { getAdminFinancialOverview } from "../api/admin-finance-summary.api";
import { getAdminFinanceHubSummary } from "../api/admin-finance-summary.api";
import { adminFinanceQueryKeys } from "../constants/query-keys";
import type { AdminFinancialOverviewFilters, AdminFinancialOverviewScope } from "../types/admin-finance-summary.types";
export function useAdminFinanceHubSummary() {
  return useQuery({
    queryKey: adminFinanceQueryKeys.hubSummary(),
    queryFn: getAdminFinanceHubSummary,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminFinancialOverview(
  scope: AdminFinancialOverviewScope = "accounting",
  filters: AdminFinancialOverviewFilters = {},
) {
  return useQuery({
    queryKey: [...adminFinanceQueryKeys.hubSummary(), scope, filters],
    queryFn: () => getAdminFinancialOverview(scope, filters),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    placeholderData: (previousData) => previousData,
  });
}
