import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { PaymentItemResponseData } from "@/features/payments/types/payments.types";
import type {
  CreatePatientPackagePurchaseRequest,
  ListMyPackagePurchasesParams,
  InitiatePatientPackagePurchasePaymentInput,
  BookPatientPackageSessionRequest,
  PatientPackagePurchaseItemResponseData,
  PatientPackagePurchaseListResponseData,
} from "../types/package-purchases.types";

export const PACKAGE_PURCHASES_ROUTES = {
  listMine: "/patients/me/package-purchases",
  quote: "/patients/me/package-purchases/quote",
  byId: (purchaseId: string) => `/patients/me/package-purchases/${purchaseId}`,
  initiatePayment: (purchaseId: string) =>
    `/patients/me/package-purchases/${purchaseId}/payments/initiate`,
  bookSession: (purchaseId: string) =>
    `/patients/me/package-purchases/${purchaseId}/sessions`,
} as const;

export async function createPatientPackagePurchase(
  input: CreatePatientPackagePurchaseRequest,
): Promise<PatientPackagePurchaseItemResponseData> {
  const response = await httpClient.post<
    ApiPayload<PatientPackagePurchaseItemResponseData>
  >(PACKAGE_PURCHASES_ROUTES.listMine, input);
  return extractData(response.data);
}

export async function bookPatientPackageSession(
  purchaseId: string,
  input: BookPatientPackageSessionRequest,
): Promise<unknown> {
  const response = await httpClient.post<ApiPayload<unknown>>(
    PACKAGE_PURCHASES_ROUTES.bookSession(purchaseId),
    input,
  );
  return extractData(response.data);
}

export async function listMyPackagePurchases(): Promise<PatientPackagePurchaseListResponseData> {
  const response = await httpClient.get<
    ApiPayload<PatientPackagePurchaseListResponseData>
  >(PACKAGE_PURCHASES_ROUTES.listMine);
  return extractData(response.data);
}

export async function listMyPackagePurchasesWithParams(
  params?: ListMyPackagePurchasesParams,
): Promise<PatientPackagePurchaseListResponseData> {
  const response = await httpClient.get<
    ApiPayload<PatientPackagePurchaseListResponseData>
  >(PACKAGE_PURCHASES_ROUTES.listMine, { params });
  return extractData(response.data);
}

export async function getMyPackagePurchase(
  purchaseId: string,
): Promise<PatientPackagePurchaseItemResponseData> {
  const response = await httpClient.get<
    ApiPayload<PatientPackagePurchaseItemResponseData>
  >(PACKAGE_PURCHASES_ROUTES.byId(purchaseId));
  return extractData(response.data);
}

export async function initiatePatientPackagePurchasePayment(
  purchaseId: string,
  input: InitiatePatientPackagePurchasePaymentInput,
): Promise<PaymentItemResponseData> {
  const response = await httpClient.post<ApiPayload<PaymentItemResponseData>>(
    PACKAGE_PURCHASES_ROUTES.initiatePayment(purchaseId),
    input,
  );
  return extractData(response.data);
}
