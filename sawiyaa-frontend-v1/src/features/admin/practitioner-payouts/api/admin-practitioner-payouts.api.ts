import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminPractitionerManualPayoutListResponseData,
  AdminPractitionerManualPayoutHistoryListResponseData,
  AdminPractitionerPayoutBalanceResponseData,
  AdminPractitionerPayoutSummaryListResponseData,
  RecordAdminPractitionerManualPayoutRequest,
  RecordAdminPractitionerManualPayoutResponseData,
  ListAdminPractitionerPayoutSummariesParams,
  ListAdminPractitionerManualPayoutsParams,
  ListAdminPractitionerManualPayoutHistoryParams,
} from "../types/admin-practitioner-payouts.types";

export async function getAdminPractitionerPayoutBalance(
  practitionerId: string,
  currency: string,
) {
  const response = await httpClient.get<ApiPayload<AdminPractitionerPayoutBalanceResponseData>>(
    `/admin/practitioner-payouts/practitioners/${practitionerId}/balance`,
    { params: { currency } },
  );

  return extractData(response.data);
}

export async function listAdminPractitionerPayoutSummaries(
  params?: ListAdminPractitionerPayoutSummariesParams,
) {
  const response = await httpClient.get<ApiPayload<AdminPractitionerPayoutSummaryListResponseData>>(
    "/admin/practitioner-payouts/practitioners",
    { params },
  );

  return extractData(response.data);
}

export async function listAdminPractitionerManualPayouts(
  practitionerId: string,
  params?: ListAdminPractitionerManualPayoutsParams,
) {
  const response = await httpClient.get<ApiPayload<AdminPractitionerManualPayoutListResponseData>>(
    `/admin/practitioner-payouts/practitioners/${practitionerId}/payouts`,
    { params },
  );

  return extractData(response.data);
}

export async function listAdminPractitionerManualPayoutHistory(
  params?: ListAdminPractitionerManualPayoutHistoryParams,
) {
  const response = await httpClient.get<
    ApiPayload<AdminPractitionerManualPayoutHistoryListResponseData>
  >("/admin/practitioner-payouts/history", { params });

  return extractData(response.data);
}

export async function recordAdminPractitionerManualPayout(
  data: RecordAdminPractitionerManualPayoutRequest,
) {
  const response = await httpClient.post<ApiPayload<RecordAdminPractitionerManualPayoutResponseData>>(
    "/admin/practitioner-payouts",
    data,
  );

  return extractData(response.data);
}
