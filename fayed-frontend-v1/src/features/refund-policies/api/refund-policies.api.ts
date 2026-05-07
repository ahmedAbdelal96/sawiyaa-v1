import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  RefundPoliciesResponseData,
  RefundPolicy,
  RefundPolicyResponseData,
  RefundPolicyType,
} from "../types/refund-policies.types";

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

  const response = await httpClient.get<ApiPayload<RefundPolicyApiResponse>>(route);
  const data = extractData(response.data) as RefundPolicyApiResponse;
  return { item: "item" in data ? data.item : data };
}

export async function fetchCurrentRefundPolicies(): Promise<RefundPoliciesResponseData> {
  const response = await httpClient.get<ApiPayload<{ items: RefundPolicyApiItem[] }>>(
    REFUND_POLICY_ROUTES.current,
  );
  const data = extractData(response.data);
  return { items: data.items };
}
