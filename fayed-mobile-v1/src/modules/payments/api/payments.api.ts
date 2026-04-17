import type {
  CouponValidationDataResponse,
  FinancialBreakdownDataResponse,
  PaymentItemDataResponse,
  PaymentsListDataResponse,
} from "@/modules/payments/domain/payments.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

type InitiateSessionPaymentPayload = {
  couponCode?: string;
};

type ListPaymentsQuery = {
  status?: string;
  page?: number;
  limit?: number;
};

export async function initiateSessionPaymentRequest(
  sessionId: string,
  payload: InitiateSessionPaymentPayload,
) {
  const response = await httpClient.post<PaymentItemDataResponse>(
    `/patients/me/sessions/${sessionId}/payments/initiate`,
    payload,
  );
  return unwrapApiData(response.data);
}

export async function listPaymentsRequest(query: ListPaymentsQuery = {}) {
  const response = await httpClient.get<PaymentsListDataResponse>("/patients/me/payments", {
    params: query,
  });
  return unwrapApiData(response.data);
}

export async function getPaymentDetailsRequest(paymentId: string) {
  const response = await httpClient.get<PaymentItemDataResponse>(
    `/patients/me/payments/${paymentId}`,
  );
  return unwrapApiData(response.data);
}

export async function validateSessionCouponRequest(sessionId: string, couponCode: string) {
  const response = await httpClient.post<CouponValidationDataResponse>(
    `/patients/me/sessions/${sessionId}/coupons/validate`,
    { couponCode },
  );
  return unwrapApiData(response.data);
}

export async function getSessionFinancialBreakdownRequest(
  sessionId: string,
  couponCode?: string,
) {
  const response = await httpClient.post<FinancialBreakdownDataResponse>(
    `/patients/me/sessions/${sessionId}/financial-breakdown`,
    { couponCode },
  );
  return unwrapApiData(response.data);
}
