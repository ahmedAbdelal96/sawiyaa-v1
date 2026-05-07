import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  CustomerWalletEntriesResponseData,
  CustomerWalletSummaryResponseData,
  InitiateSessionPaymentInput,
  ListCustomerWalletEntriesParams,
  ListPaymentsParams,
  PaymentItem,
  PaymentItemResponseData,
  PaymentsListResponseData,
  SessionPaymentCapabilitiesResponseData,
} from "../types/payments.types";

/**
 * POST /patients/me/sessions/:sessionId/payments/initiate
 *
 * Creates or reuses a payment attempt for a PENDING_PAYMENT session.
 * Provider routing is backend-controlled.
 * Response may contain:
 * - `clientSecret` for Stripe Elements flow
 * - `checkoutUrl` for hosted checkout flow
 */
export async function initiateSessionPayment(
  sessionId: string,
  input: InitiateSessionPaymentInput,
): Promise<PaymentItemResponseData> {
  const response = await httpClient.post<ApiPayload<PaymentItemResponseData>>(
    `/patients/me/sessions/${sessionId}/payments/initiate`,
    input,
  );
  return extractData(response.data);
}

/**
 * GET /patients/me/sessions/:sessionId/payments/capabilities
 *
 * Returns the Paymob methods that are actually enabled for the current merchant config.
 */
export async function getPatientSessionPaymentCapabilities(
  sessionId: string,
): Promise<SessionPaymentCapabilitiesResponseData> {
  const response = await httpClient.get<ApiPayload<SessionPaymentCapabilitiesResponseData>>(
    `/patients/me/sessions/${sessionId}/payments/capabilities`,
  );
  return extractData(response.data);
}

/**
 * GET /patients/me/payments
 *
 * Lists patient-owned payments with optional status filter and pagination.
 */
export async function getPatientPayments(
  params?: ListPaymentsParams,
): Promise<PaymentsListResponseData> {
  const response = await httpClient.get<ApiPayload<PaymentsListResponseData>>(
    "/patients/me/payments",
    { params },
  );
  return extractData(response.data);
}

/**
 * GET /patients/me/payments/:paymentId
 *
 * Fetches a single patient-owned payment.
 */
export async function getPatientPayment(paymentId: string): Promise<PaymentItem> {
  const response = await httpClient.get<ApiPayload<PaymentItemResponseData>>(
    `/patients/me/payments/${paymentId}`,
  );
  return extractData(response.data).item;
}

/**
 * GET /patients/me/wallet
 *
 * Fetches the authenticated patient's wallet summary.
 */
export async function getPatientWalletSummary(
  currencyCode?: string,
): Promise<CustomerWalletSummaryResponseData> {
  const response = await httpClient.get<ApiPayload<CustomerWalletSummaryResponseData>>(
    "/patients/me/wallet",
    {
      params: currencyCode ? { currencyCode } : undefined,
    },
  );
  return extractData(response.data);
}

/**
 * GET /patients/me/wallet/entries
 *
 * Lists patient wallet ledger entries.
 */
export async function getPatientWalletEntries(
  params?: ListCustomerWalletEntriesParams,
): Promise<CustomerWalletEntriesResponseData> {
  const response = await httpClient.get<ApiPayload<CustomerWalletEntriesResponseData>>(
    "/patients/me/wallet/entries",
    { params },
  );
  return extractData(response.data);
}
