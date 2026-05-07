import { apiClient, extractApiData } from "../../../lib/api";
import type {
  CustomerWalletSummaryData,
  InitiateSessionPaymentInput,
  ListPaymentsParams,
  ListWalletEntriesParams,
  PaymentReconcileSessionReturnInput,
  PaymentReconcileSessionReturnResult,
  PaymentItem,
  PaymentsListData,
  SessionPaymentCapabilitiesItem,
  SessionFinancialBreakdown,
  WalletEntriesData,
} from "./types";

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function listPatientPayments(
  params?: ListPaymentsParams,
): Promise<PaymentsListData> {
  const response = await apiClient.get("/patients/me/payments", { params });
  return extractApiData<PaymentsListData>(response);
}

export async function getPatientPayment(
  paymentId: string,
): Promise<{ item: PaymentItem }> {
  const response = await apiClient.get(`/patients/me/payments/${paymentId}`);
  return extractApiData<{ item: PaymentItem }>(response);
}

/**
 * POST /patients/me/sessions/:id/payments/initiate
 *
 * Backend routing controls the provider. Response may contain:
 * - clientSecret  → Stripe Elements (requires @stripe/stripe-react-native SDK)
 * - checkoutUrl   → Hosted checkout (open via Linking.openURL)
 */
export async function initiateSessionPayment(
  sessionId: string,
  input: InitiateSessionPaymentInput,
): Promise<{ item: PaymentItem }> {
  const response = await apiClient.post(
    `/patients/me/sessions/${sessionId}/payments/initiate`,
    input,
  );
  return extractApiData<{ item: PaymentItem }>(response);
}

export async function getPatientSessionPaymentCapabilities(
  sessionId: string,
): Promise<{ item: SessionPaymentCapabilitiesItem }> {
  const response = await apiClient.get(
    `/patients/me/sessions/${sessionId}/payments/capabilities`,
  );
  return extractApiData<{ item: SessionPaymentCapabilitiesItem }>(response);
}

export async function reconcileSessionPaymentReturn(
  sessionId: string,
  input: PaymentReconcileSessionReturnInput,
): Promise<PaymentReconcileSessionReturnResult> {
  const response = await apiClient.post(
    `/patients/me/sessions/${sessionId}/payments/reconcile-return`,
    input,
  );
  return extractApiData<PaymentReconcileSessionReturnResult>(response);
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export async function getPatientWalletSummary(
  currencyCode?: string,
): Promise<CustomerWalletSummaryData> {
  const response = await apiClient.get("/patients/me/wallet", {
    params: currencyCode ? { currencyCode } : undefined,
  });
  return extractApiData<CustomerWalletSummaryData>(response);
}

export async function listPatientWalletEntries(
  params?: ListWalletEntriesParams,
): Promise<WalletEntriesData> {
  const response = await apiClient.get("/patients/me/wallet/entries", {
    params,
  });
  return extractApiData<WalletEntriesData>(response);
}

// ---------------------------------------------------------------------------
// Financial breakdown (used in checkout screen before initiation)
// ---------------------------------------------------------------------------

export async function getSessionFinancialBreakdown(
  sessionId: string,
  couponCode?: string | null,
): Promise<{ item: SessionFinancialBreakdown }> {
  const response = await apiClient.post(
    `/patients/me/sessions/${sessionId}/financial-breakdown`,
    couponCode ? { couponCode } : {},
  );
  return extractApiData<{ item: SessionFinancialBreakdown }>(response);
}
