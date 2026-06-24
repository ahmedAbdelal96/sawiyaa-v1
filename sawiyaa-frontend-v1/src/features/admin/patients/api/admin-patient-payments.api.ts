import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type { PaymentsListResponseData, ListPaymentsParams } from "@/features/payments/types/payments.types";

export async function listAdminPatientPayments(
  patientId: string,
  params: ListPaymentsParams,
) {
  const response = await httpClient.get<ApiPayload<PaymentsListResponseData>>(
    `/admin/patients/${patientId}/payments`,
    { params },
  );
  return extractData(response.data);
}

