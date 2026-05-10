import { useQuery } from "@tanstack/react-query";
import { fetchCurrentRefundPolicies, fetchRefundPolicy } from "./api";
import type { RefundPolicyType } from "./types";

export const refundPolicyQueryKeys = {
  all: ["refund-policies"] as const,
  current: () => [...refundPolicyQueryKeys.all, "current"] as const,
  detail: (policyType: RefundPolicyType) =>
    [...refundPolicyQueryKeys.all, policyType] as const,
};

export function useCurrentRefundPolicies() {
  return useQuery({
    queryKey: refundPolicyQueryKeys.current(),
    queryFn: fetchCurrentRefundPolicies,
    staleTime: 5 * 60_000,
  });
}

export function useRefundPolicy(
  policyType: RefundPolicyType,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: refundPolicyQueryKeys.detail(policyType),
    queryFn: () => fetchRefundPolicy(policyType),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}
