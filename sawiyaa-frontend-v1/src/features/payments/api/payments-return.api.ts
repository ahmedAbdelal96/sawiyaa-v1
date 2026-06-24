import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  PaymentReconcileSessionReturnInput,
  PaymentReconcileSessionReturnResponseData,
} from "../types/payments.types";

/**
 * Best-effort reconciliation for hosted checkout returns.
 * Used when the provider returns success but the webhook has not yet landed.
 */
export async function reconcileSessionPaymentReturn(
  sessionId: string,
  input: PaymentReconcileSessionReturnInput,
): Promise<PaymentReconcileSessionReturnResponseData> {
  const response = await httpClient.post<
    ApiPayload<PaymentReconcileSessionReturnResponseData>
  >(`/patients/me/sessions/${sessionId}/payments/reconcile-return`, input);

  return extractData(response.data);
}
