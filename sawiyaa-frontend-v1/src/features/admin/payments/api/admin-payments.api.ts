import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminPaymentOpsResponseData,
  AdminRefundItemResponseData,
  AdminRefundListResponseData,
  RequestAdminRefundInput,
} from "../types/admin-payments.types";

export async function getAdminPaymentOpsDetails(paymentId: string) {
  const response = await httpClient.get<ApiPayload<AdminPaymentOpsResponseData>>(
    `/admin/payments/${paymentId}`,
  );
  return extractData(response.data);
}

export async function getAdminPaymentRefunds(paymentId: string) {
  const response = await httpClient.get<ApiPayload<AdminRefundListResponseData>>(
    `/admin/payments/${paymentId}/refunds`,
  );
  return extractData(response.data);
}

export async function requestAdminPaymentRefund(
  paymentId: string,
  data: RequestAdminRefundInput,
) {
  const response = await httpClient.post<ApiPayload<AdminRefundItemResponseData>>(
    `/admin/payments/${paymentId}/refunds`,
    data,
  );
  return extractData(response.data);
}

export async function retryAdminPaymentRefund(paymentId: string, refundId: string) {
  const response = await httpClient.post<ApiPayload<AdminRefundItemResponseData>>(
    `/admin/payments/${paymentId}/refunds/${refundId}/retry`,
  );
  return extractData(response.data);
}
