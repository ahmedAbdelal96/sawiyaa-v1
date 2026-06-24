"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { listPractitionerCoupons, createPractitionerCoupon, getPractitionerCoupon, updatePractitionerCoupon, disablePractitionerCoupon, listPractitionerCouponRedemptions } from "../api/practitioner-coupons.api";
import { practitionerCouponsQueryKeys } from "../constants/query-keys";
import type {
  CreatePractitionerCouponPayload,
  ListPractitionerCouponsParams,
  ListPractitionerCouponRedemptionsParams,
  UpdatePractitionerCouponPayload,
} from "../types";

export function usePractitionerCoupons(params?: ListPractitionerCouponsParams, enabled = true) {
  const role = useSessionRole();
  return useQuery({
    queryKey: practitionerCouponsQueryKeys.list(params),
    queryFn: () => listPractitionerCoupons(params),
    enabled: role === "PRACTITIONER" && enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function usePractitionerCoupon(id?: string, enabled = true) {
  const role = useSessionRole();
  return useQuery({
    queryKey: practitionerCouponsQueryKeys.details(id ?? ""),
    queryFn: () => getPractitionerCoupon(id as string),
    enabled: role === "PRACTITIONER" && Boolean(id) && enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function usePractitionerCouponRedemptions(
  id?: string,
  params?: ListPractitionerCouponRedemptionsParams,
  enabled = true,
) {
  const role = useSessionRole();
  return useQuery({
    queryKey: practitionerCouponsQueryKeys.redemptions(id ?? "", params),
    queryFn: () => listPractitionerCouponRedemptions(id as string, params),
    enabled: role === "PRACTITIONER" && Boolean(id) && enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useCreatePractitionerCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePractitionerCouponPayload) => createPractitionerCoupon(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionerCouponsQueryKeys.all });
    },
  });
}

export function useUpdatePractitionerCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePractitionerCouponPayload;
    }) => updatePractitionerCoupon(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: practitionerCouponsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: practitionerCouponsQueryKeys.details(variables.id) });
      queryClient.invalidateQueries({ queryKey: practitionerCouponsQueryKeys.redemptions(variables.id) });
    },
  });
}

export function useDisablePractitionerCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disablePractitionerCoupon(id),
    onSuccess: (_, couponId) => {
      queryClient.invalidateQueries({ queryKey: practitionerCouponsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: practitionerCouponsQueryKeys.details(couponId) });
      queryClient.invalidateQueries({ queryKey: practitionerCouponsQueryKeys.redemptions(couponId) });
    },
  });
}
