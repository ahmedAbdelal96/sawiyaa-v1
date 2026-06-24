import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/auth/roles";
import { useSessionRole } from "@/lib/auth/use-session-role";
import {
  getAdminPackageSettlement,
  listAdminPackageSettlements,
  releaseAdminPackageSettlement,
} from "../api/admin-package-settlements.api";
import { adminPackageSettlementsQueryKeys } from "../constants/query-keys";
import type { ListAdminPackageSettlementsParams } from "../types/admin-package-settlements.types";

export function useAdminPackageSettlements(params: ListAdminPackageSettlementsParams) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminPackageSettlementsQueryKeys.list(params),
    queryFn: () => listAdminPackageSettlements(params),
    enabled: isAdminRole(role),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPackageSettlement(id?: string) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminPackageSettlementsQueryKeys.details(id ?? ""),
    queryFn: () => getAdminPackageSettlement(id as string),
    enabled: isAdminRole(role) && Boolean(id),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useReleaseAdminPackageSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => releaseAdminPackageSettlement(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminPackageSettlementsQueryKeys.details(id) });
      queryClient.invalidateQueries({ queryKey: adminPackageSettlementsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "practitioners"] });
    },
  });
}
