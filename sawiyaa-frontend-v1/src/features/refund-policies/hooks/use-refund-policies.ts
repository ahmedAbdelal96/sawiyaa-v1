"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentRefundPolicies, fetchRefundPolicy } from "../api/refund-policies.api";
import type { RefundPolicyType } from "../types/refund-policies.types";

export const refundPolicyQueryKeys = {
  all: ["refund-policies"] as const,
  current: () => [...refundPolicyQueryKeys.all, "current"] as const,
  active: (policyType: RefundPolicyType) =>
    [...refundPolicyQueryKeys.all, policyType] as const,
};

export function useCurrentRefundPolicies() {
  return useQuery({
    queryKey: refundPolicyQueryKeys.current(),
    queryFn: fetchCurrentRefundPolicies,
    staleTime: 30_000,
    retry: false,
  });
}

export function useRefundPolicy(
  policyType: RefundPolicyType,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: refundPolicyQueryKeys.active(policyType),
    queryFn: () => fetchRefundPolicy(policyType),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: false,
  });
}
