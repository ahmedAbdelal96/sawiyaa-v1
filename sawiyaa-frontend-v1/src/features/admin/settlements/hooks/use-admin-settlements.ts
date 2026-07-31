import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/auth/roles";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { addAdminSettlementAdjustment, approveAdminSettlement, getAdminSettlement, listAdminSettlements, payoutAdminSettlement, rejectAdminSettlement } from "../api/admin-settlements.api";
import { adminSettlementsQueryKeys } from "../constants/query-keys";
import type { AddSettlementAdjustmentPayload, ListAdminSettlementsParams, RecordPractitionerPayoutRequest } from "../types/admin-settlements.types";

export function useAdminSettlements(params: ListAdminSettlementsParams) {
  const role = useSessionRole();
  return useQuery({ queryKey: adminSettlementsQueryKeys.list(params), queryFn: () => listAdminSettlements(params), enabled: isAdminRole(role), staleTime: 20_000 });
}
export function useAdminSettlement(id?: string) {
  const role = useSessionRole();
  return useQuery({ queryKey: adminSettlementsQueryKeys.detail(id ?? ""), queryFn: () => getAdminSettlement(id as string), enabled: isAdminRole(role) && Boolean(id), staleTime: 20_000 });
}
function useSettlementMutation<T>(mutationFn: (id: string, payload?: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: T }) => mutationFn(id, payload), onSuccess: (_, variables) => { queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.detail(variables.id) }); queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all }); } });
}
export function useAddAdminSettlementAdjustment() { return useSettlementMutation<AddSettlementAdjustmentPayload>((id, payload) => addAdminSettlementAdjustment(id, payload as AddSettlementAdjustmentPayload)); }
export function useApproveAdminSettlement() { return useSettlementMutation<{ exchangeRate?: string; approvedWalletCreditAmount?: string; walletCreditOverrideReason?: string }>((id, payload) => approveAdminSettlement(id, payload)); }
export function useRejectAdminSettlement() { return useSettlementMutation<string>((id, reason) => rejectAdminSettlement(id, reason as string)); }
export function usePayoutAdminSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordPractitionerPayoutRequest }) => payoutAdminSettlement(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all });
      for (const key of [["admin", "practitioner-wallets"], ["admin", "practitioner-transfers"], ["admin", "practitioner-payouts"], ["admin", "ledger"], ["admin", "accounting"], ["admin", "reconciliation"], ["admin", "finance"]] as const) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
