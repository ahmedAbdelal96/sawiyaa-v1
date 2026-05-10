import { apiClient, extractApiData } from "../../../lib/api";
import type {
  RefundPoliciesResponseData,
  RefundPolicy,
  RefundPolicyResponseData,
  RefundPolicyType,
} from "./types";

export const REFUND_POLICY_ROUTES = {
  current: "/public/refund-policies/current",
  session: "/public/refund-policies/session",
  package: "/public/refund-policies/package",
} as const;

type RefundPolicyApiItem = RefundPolicy;
type RefundPolicyApiResponse = RefundPolicyApiItem | { item: RefundPolicyApiItem };

export async function fetchRefundPolicy(
  policyType: RefundPolicyType,
): Promise<RefundPolicyResponseData> {
  const route =
    policyType === "SESSION"
      ? REFUND_POLICY_ROUTES.session
      : REFUND_POLICY_ROUTES.package;

  const response = await apiClient.get<{
    success: boolean;
    data: RefundPolicyApiResponse;
  }>(route);
  const data = extractApiData<RefundPolicyApiResponse>(response);
  return { item: "item" in data ? data.item : data };
}

export async function fetchCurrentRefundPolicies(): Promise<RefundPoliciesResponseData> {
  const response = await apiClient.get<{
    success: boolean;
    data: { items: RefundPolicyApiItem[] };
  }>(REFUND_POLICY_ROUTES.current);
  const data = extractApiData<{ items: RefundPolicyApiItem[] }>(response);
  return { items: data.items };
}
