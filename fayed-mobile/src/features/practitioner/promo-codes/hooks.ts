import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  createPractitionerCoupon,
  disablePractitionerCoupon,
  getPractitionerCoupon,
  listPractitionerCouponRedemptions,
  listPractitionerCoupons,
  updatePractitionerCoupon,
} from "./api";
import type {
  CreatePractitionerCouponRequest,
  PractitionerCouponListParams,
  PractitionerCouponRedemptionsListParams,
  UpdatePractitionerCouponRequest,
} from "./types";

export const practitionerCouponQueryKeys = {
  all: ["practitioner-coupons"] as const,
  list: (params?: PractitionerCouponListParams) =>
    [...practitionerCouponQueryKeys.all, "list", params ?? {}] as const,
  detail: (couponId: string) =>
    [...practitionerCouponQueryKeys.all, "detail", couponId] as const,
  redemptions: (
    couponId: string,
    params?: PractitionerCouponRedemptionsListParams,
  ) =>
    [
      ...practitionerCouponQueryKeys.all,
      "redemptions",
      couponId,
      params ?? {},
    ] as const,
};

function invalidateCouponQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: practitionerCouponQueryKeys.all });
}

export function usePractitionerCoupons(params?: PractitionerCouponListParams) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerCouponQueryKeys.list(params),
    queryFn: () => listPractitionerCoupons(params),
    enabled,
    staleTime: 30_000,
  });
}

export function usePractitionerCoupon(couponId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerCouponQueryKeys.detail(couponId ?? ""),
    queryFn: () => getPractitionerCoupon(couponId!),
    enabled: enabled && Boolean(couponId),
    staleTime: 20_000,
  });
}

export function usePractitionerCouponRedemptions(
  couponId: string | null,
  params?: PractitionerCouponRedemptionsListParams,
) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerCouponQueryKeys.redemptions(couponId ?? "", params),
    queryFn: () => listPractitionerCouponRedemptions(couponId!, params),
    enabled: enabled && Boolean(couponId),
    staleTime: 20_000,
  });
}

export function useCreatePractitionerCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePractitionerCouponRequest) =>
      createPractitionerCoupon(payload),
    onSuccess: () => {
      invalidateCouponQueries(queryClient);
    },
  });
}

export function useUpdatePractitionerCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      couponId,
      payload,
    }: {
      couponId: string;
      payload: UpdatePractitionerCouponRequest;
    }) => updatePractitionerCoupon(couponId, payload),
    onSuccess: () => {
      invalidateCouponQueries(queryClient);
    },
  });
}

export function useDisablePractitionerCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (couponId: string) => disablePractitionerCoupon(couponId),
    onSuccess: () => {
      invalidateCouponQueries(queryClient);
    },
  });
}

