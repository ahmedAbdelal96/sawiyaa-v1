import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/auth/roles";
import { useSessionRole } from "@/lib/auth/use-session-role";
import {
  getAdminPackageSettlement,
  listAdminPackageSettlements,
  releaseAdminPackageSettlement,
  getAdminPackageRefundPreview,
  finalizeAdminPackageRefund,
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

export function useAdminPackageRefundPreview(paymentId?: string) {
  const role = useSessionRole();
  return useQuery({
    queryKey: ["admin", "package-refund-preview", paymentId ?? ""],
    queryFn: () => getAdminPackageRefundPreview(paymentId as string),
    enabled: isAdminRole(role) && Boolean(paymentId),
    staleTime: 15_000,
  });
}

export function useFinalizeAdminPackageRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, finalAmount, reason, evidenceReference, idempotencyKey }: {
      paymentId: string;
      finalAmount?: number;
      reason: string;
      evidenceReference?: string;
      idempotencyKey?: string;
    }) => finalizeAdminPackageRefund(paymentId, { finalAmount, reason, evidenceReference, idempotencyKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPackageSettlementsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "package-refund-preview"] });
    },
  });
}
