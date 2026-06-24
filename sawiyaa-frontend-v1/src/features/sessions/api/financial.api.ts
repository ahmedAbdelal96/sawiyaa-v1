import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { FinancialBreakdown, FinancialBreakdownResponseData } from "../types/financial.types";

/**
 * POST /patients/me/sessions/:sessionId/financial-breakdown
 *
 * Resolves the gross price, optional coupon effect, and net paid amount
 * for a patient-owned session before payment is initiated.
 * Coupon redemption is NOT consumed here — it is recorded when payment succeeds.
 */
export async function getSessionFinancialBreakdown(
  sessionId: string,
  couponCode?: string | null,
): Promise<FinancialBreakdown> {
  const response = await httpClient.post<ApiPayload<FinancialBreakdownResponseData>>(
    `/patients/me/sessions/${sessionId}/financial-breakdown`,
    couponCode ? { couponCode } : {},
  );
  return extractData(response.data).item;
}
