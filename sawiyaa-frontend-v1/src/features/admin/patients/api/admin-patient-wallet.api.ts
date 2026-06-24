import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  CustomerWalletEntriesResponseData,
  CustomerWalletSummaryResponseData,
  ListCustomerWalletEntriesParams,
} from "@/features/payments/types/payments.types";

export async function getAdminPatientWalletSummary(
  patientId: string,
  currencyCode?: string,
): Promise<CustomerWalletSummaryResponseData> {
  const response = await httpClient.get<ApiPayload<CustomerWalletSummaryResponseData>>(
    `/admin/patients/${patientId}/wallet`,
    { params: currencyCode ? { currencyCode } : undefined },
  );
  return extractData(response.data);
}

export async function getAdminPatientWalletEntries(
  patientId: string,
  params?: ListCustomerWalletEntriesParams,
): Promise<CustomerWalletEntriesResponseData> {
  const response = await httpClient.get<ApiPayload<CustomerWalletEntriesResponseData>>(
    `/admin/patients/${patientId}/wallet/entries`,
    { params },
  );
  return extractData(response.data);
}

