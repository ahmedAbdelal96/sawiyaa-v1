import { apiClient, extractApiData } from "../../../lib/api";
import type {
  CreatePatientPackagePurchaseRequest,
  InitiatePatientPackagePurchasePaymentInput,
  ListMyPackagePurchasesParams,
  PackagePlanQuotedItem,
  PackagePlansQuery,
  PatientPackagePlanQuoteRequest,
  PatientPackagePlanQuoteResponseData,
  PatientPackagePurchaseItemResponseData,
  PatientPackagePurchaseListResponseData,
  PackagePurchasePaymentResponseData,
  PublicPackagePlansResponseData,
} from "./types";
import type { RefundPoliciesResponseData, RefundPolicyResponseData, RefundPolicyType } from "../refund-policies/types";

export const PACKAGE_PLANS_ROUTES = {
  publicByPractitionerSlug: (slug: string) => `/public/practitioners/${slug}/package-plans`,
  patientQuote: "/patients/me/package-purchases/quote",
} as const;

export const PACKAGE_PURCHASES_ROUTES = {
  listMine: "/patients/me/package-purchases",
  quote: "/patients/me/package-purchases/quote",
  byId: (purchaseId: string) => `/patients/me/package-purchases/${purchaseId}`,
  initiatePayment: (purchaseId: string) =>
    `/patients/me/package-purchases/${purchaseId}/payments/initiate`,
} as const;

export const REFUND_POLICY_ROUTES = {
  current: "/public/refund-policies/current",
  session: "/public/refund-policies/session",
  package: "/public/refund-policies/package",
} as const;

export async function fetchPublicPractitionerPackagePlans(
  practitionerSlug: string,
  params?: PackagePlansQuery,
): Promise<PublicPackagePlansResponseData> {
  const response = await apiClient.get<{
    success: boolean;
    data: PublicPackagePlansResponseData;
  }>(PACKAGE_PLANS_ROUTES.publicByPractitionerSlug(practitionerSlug), {
    params,
  });
  return extractApiData<PublicPackagePlansResponseData>(response);
}

export async function quotePatientPackagePlan(
  input: PatientPackagePlanQuoteRequest,
): Promise<PatientPackagePlanQuoteResponseData> {
  const response = await apiClient.post<{
    success: boolean;
    data: PatientPackagePlanQuoteResponseData;
  }>(PACKAGE_PLANS_ROUTES.patientQuote, input);
  return extractApiData<PatientPackagePlanQuoteResponseData>(response);
}

export async function createPatientPackagePurchase(
  input: CreatePatientPackagePurchaseRequest,
): Promise<PatientPackagePurchaseItemResponseData> {
  const response = await apiClient.post<{
    success: boolean;
    data: PatientPackagePurchaseItemResponseData;
  }>(PACKAGE_PURCHASES_ROUTES.listMine, input);
  return extractApiData<PatientPackagePurchaseItemResponseData>(response);
}

export async function listMyPackagePurchases(
  params?: ListMyPackagePurchasesParams,
): Promise<PatientPackagePurchaseListResponseData> {
  const response = await apiClient.get<{
    success: boolean;
    data: PatientPackagePurchaseListResponseData;
  }>(PACKAGE_PURCHASES_ROUTES.listMine, { params });
  return extractApiData<PatientPackagePurchaseListResponseData>(response);
}

export async function getMyPackagePurchase(
  purchaseId: string,
): Promise<PatientPackagePurchaseItemResponseData> {
  const response = await apiClient.get<{
    success: boolean;
    data: PatientPackagePurchaseItemResponseData;
  }>(PACKAGE_PURCHASES_ROUTES.byId(purchaseId));
  return extractApiData<PatientPackagePurchaseItemResponseData>(response);
}

export async function initiatePatientPackagePurchasePayment(
  purchaseId: string,
  input: InitiatePatientPackagePurchasePaymentInput,
): Promise<PackagePurchasePaymentResponseData> {
  const response = await apiClient.post<{
    success: boolean;
    data: PackagePurchasePaymentResponseData;
  }>(PACKAGE_PURCHASES_ROUTES.initiatePayment(purchaseId), input);
  return extractApiData<PackagePurchasePaymentResponseData>(response);
}

export async function fetchRefundPolicy(policyType: RefundPolicyType): Promise<RefundPolicyResponseData> {
  const route =
    policyType === "SESSION"
      ? REFUND_POLICY_ROUTES.session
      : REFUND_POLICY_ROUTES.package;

  const response = await apiClient.get<{
    success: boolean;
    data: RefundPolicyResponseData["item"] | RefundPolicyResponseData;
  }>(route);
  const data = extractApiData<RefundPolicyResponseData["item"] | RefundPolicyResponseData>(response);
  return { item: "item" in data ? data.item : data };
}

export async function fetchCurrentRefundPolicies(): Promise<RefundPoliciesResponseData> {
  const response = await apiClient.get<{
    success: boolean;
    data: { items: RefundPoliciesResponseData["items"] };
  }>(REFUND_POLICY_ROUTES.current);
  const data = extractApiData<{ items: RefundPoliciesResponseData["items"] }>(response);
  return { items: data.items };
}
