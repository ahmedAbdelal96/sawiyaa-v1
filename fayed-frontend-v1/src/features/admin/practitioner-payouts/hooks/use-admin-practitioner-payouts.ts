"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/auth/roles";
import { useSessionRole } from "@/lib/auth/use-session-role";
import {
  getAdminPractitionerPayoutBalance,
  listAdminPractitionerManualPayoutHistory,
  listAdminPractitionerManualPayouts,
  listAdminPractitionerPayoutSummaries,
  recordAdminPractitionerManualPayout,
} from "../api/admin-practitioner-payouts.api";
import { adminPractitionerPayoutsQueryKeys } from "../constants/query-keys";
import type {
  ListAdminPractitionerManualPayoutHistoryParams,
  ListAdminPractitionerManualPayoutsParams,
  ListAdminPractitionerPayoutSummariesParams,
  RecordAdminPractitionerManualPayoutRequest,
} from "../types/admin-practitioner-payouts.types";

export function useAdminPractitionerPayoutBalance(
  practitionerId?: string,
  currency?: string,
) {
  const role = useSessionRole();

  return useQuery({
    queryKey:
      practitionerId && currency
        ? adminPractitionerPayoutsQueryKeys.balance(practitionerId, currency)
        : adminPractitionerPayoutsQueryKeys.balance("", ""),
    queryFn: () => getAdminPractitionerPayoutBalance(practitionerId as string, currency as string),
    enabled: isAdminRole(role) && Boolean(practitionerId && currency),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerManualPayouts(
  practitionerId?: string,
  params?: ListAdminPractitionerManualPayoutsParams,
) {
  const role = useSessionRole();

  return useQuery({
    queryKey:
      practitionerId
        ? adminPractitionerPayoutsQueryKeys.payouts(practitionerId, params ?? {})
        : adminPractitionerPayoutsQueryKeys.payouts("", params ?? {}),
    queryFn: () => listAdminPractitionerManualPayouts(practitionerId as string, params),
    enabled: isAdminRole(role) && Boolean(practitionerId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerPayoutSummaries(
  params?: ListAdminPractitionerPayoutSummariesParams,
) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminPractitionerPayoutsQueryKeys.summaries(params),
    queryFn: () => listAdminPractitionerPayoutSummaries(params),
    enabled: isAdminRole(role),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerManualPayoutHistory(
  params?: ListAdminPractitionerManualPayoutHistoryParams,
) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminPractitionerPayoutsQueryKeys.history(params),
    queryFn: () => listAdminPractitionerManualPayoutHistory(params),
    enabled: isAdminRole(role),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useRecordAdminPractitionerManualPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordAdminPractitionerManualPayoutRequest) =>
      recordAdminPractitionerManualPayout(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerPayoutsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "practitioners", variables.practitionerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "practitioners"],
      });
    },
  });
}
