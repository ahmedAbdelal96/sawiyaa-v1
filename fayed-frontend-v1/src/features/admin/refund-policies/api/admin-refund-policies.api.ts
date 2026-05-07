import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminRefundPoliciesResponseData,
  AdminRefundPolicy,
  AdminRefundPolicyResponseData,
  AdminRefundPolicyType,
  CreateAdminRefundPolicyClauseInput,
  ReorderAdminRefundPolicyClausesInput,
  UpdateAdminRefundPolicyInput,
} from "../types/admin-refund-policies.types";

type AdminRefundPolicyApiResponse = ApiPayload<{ item: AdminRefundPolicy }>;
type AdminRefundPoliciesApiResponse = ApiPayload<{ items: AdminRefundPolicy[] }>;

export const ADMIN_REFUND_POLICIES_ROUTES = {
  list: "/admin/refund-policies",
  item: (policyType: AdminRefundPolicyType | string) =>
    `/admin/refund-policies/${policyType}`,
  clauses: (policyType: AdminRefundPolicyType | string) =>
    `/admin/refund-policies/${policyType}/clauses`,
  clause: (policyType: AdminRefundPolicyType | string, clauseId: string) =>
    `/admin/refund-policies/${policyType}/clauses/${clauseId}`,
  reorder: (policyType: AdminRefundPolicyType | string) =>
    `/admin/refund-policies/${policyType}/clauses/reorder`,
} as const;

export async function listAdminRefundPolicies(): Promise<AdminRefundPoliciesResponseData> {
  const response = await httpClient.get<AdminRefundPoliciesApiResponse>(ADMIN_REFUND_POLICIES_ROUTES.list);
  return extractData(response.data);
}

export async function getAdminRefundPolicy(
  policyType: AdminRefundPolicyType | string,
): Promise<AdminRefundPolicyResponseData> {
  const response = await httpClient.get<AdminRefundPolicyApiResponse>(
    ADMIN_REFUND_POLICIES_ROUTES.item(policyType),
  );
  return extractData(response.data);
}

export async function updateAdminRefundPolicy(
  policyType: AdminRefundPolicyType | string,
  input: UpdateAdminRefundPolicyInput,
): Promise<AdminRefundPolicyResponseData> {
  const response = await httpClient.patch<AdminRefundPolicyApiResponse>(
    ADMIN_REFUND_POLICIES_ROUTES.item(policyType),
    input,
  );
  return extractData(response.data);
}

export async function createAdminRefundPolicyClause(
  policyType: AdminRefundPolicyType | string,
  input: CreateAdminRefundPolicyClauseInput,
): Promise<AdminRefundPolicyResponseData> {
  const response = await httpClient.post<AdminRefundPolicyApiResponse>(
    ADMIN_REFUND_POLICIES_ROUTES.clauses(policyType),
    input,
  );
  return extractData(response.data);
}

export async function updateAdminRefundPolicyClause(
  policyType: AdminRefundPolicyType | string,
  clauseId: string,
  input: CreateAdminRefundPolicyClauseInput,
): Promise<AdminRefundPolicyResponseData> {
  const response = await httpClient.patch<AdminRefundPolicyApiResponse>(
    ADMIN_REFUND_POLICIES_ROUTES.clause(policyType, clauseId),
    input,
  );
  return extractData(response.data);
}

export async function deleteAdminRefundPolicyClause(
  policyType: AdminRefundPolicyType | string,
  clauseId: string,
): Promise<AdminRefundPolicyResponseData> {
  const response = await httpClient.delete<AdminRefundPolicyApiResponse>(
    ADMIN_REFUND_POLICIES_ROUTES.clause(policyType, clauseId),
  );
  return extractData(response.data);
}

export async function reorderAdminRefundPolicyClauses(
  policyType: AdminRefundPolicyType | string,
  input: ReorderAdminRefundPolicyClausesInput,
): Promise<AdminRefundPolicyResponseData> {
  const response = await httpClient.patch<AdminRefundPolicyApiResponse>(
    ADMIN_REFUND_POLICIES_ROUTES.reorder(policyType),
    input,
  );
  return extractData(response.data);
}
