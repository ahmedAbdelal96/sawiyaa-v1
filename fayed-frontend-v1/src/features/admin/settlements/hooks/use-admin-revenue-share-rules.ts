import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminRevenueShareRules,
  updateAdminRevenueShareRules,
} from "../api/admin-settlements.api";
import type { UpdateRevenueShareRulesRequest } from "../types/admin-settlements.types";

const revenueShareQueryKey = ["admin", "revenue-share-rules"] as const;

export function useAdminRevenueShareRules() {
  return useQuery({
    queryKey: revenueShareQueryKey,
    queryFn: () => getAdminRevenueShareRules(),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useUpdateAdminRevenueShareRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateRevenueShareRulesRequest) =>
      updateAdminRevenueShareRules(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revenueShareQueryKey });
    },
  });
}

