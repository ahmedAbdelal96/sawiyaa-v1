import { useQuery } from "@tanstack/react-query";
import { getAdminFinanceHubSummary } from "../api/admin-finance-summary.api";
import { adminFinanceQueryKeys } from "../constants/query-keys";

export function useAdminFinanceHubSummary() {
  return useQuery({
    queryKey: adminFinanceQueryKeys.hubSummary(),
    queryFn: getAdminFinanceHubSummary,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}
