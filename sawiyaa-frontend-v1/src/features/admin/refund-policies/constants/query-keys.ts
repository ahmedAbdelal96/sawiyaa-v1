import type { AdminRefundPolicyType } from "../types/admin-refund-policies.types";

export const adminRefundPoliciesQueryKeys = {
  all: ["admin-refund-policies"] as const,
  list: () => [...adminRefundPoliciesQueryKeys.all, "list"] as const,
  item: (policyType: AdminRefundPolicyType | string) =>
    [...adminRefundPoliciesQueryKeys.all, "item", policyType] as const,
};
