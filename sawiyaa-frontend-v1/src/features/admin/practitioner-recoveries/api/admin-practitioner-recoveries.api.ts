import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminPractitionerRecoveryDetailData,
  AdminPractitionerRecoveryMutationResult,
  AdminPractitionerRecoveriesListData,
  ListAdminPractitionerRecoveriesParams,
  MarkAdminPractitionerRecoveryCollectedPayload,
  WaiveAdminPractitionerRecoveryPayload,
} from "../types/admin-practitioner-recoveries.types";

export async function listAdminPractitionerRecoveries(
  params: ListAdminPractitionerRecoveriesParams,
) {
  const response = await httpClient.get<ApiPayload<AdminPractitionerRecoveriesListData>>(
    "/admin/finance/practitioner-recoveries",
    { params },
  );

  return extractData(response.data);
}

export async function downloadAdminPractitionerRecoveriesCsv(
  params: ListAdminPractitionerRecoveriesParams,
) {
  const response = await httpClient.get(
    "/admin/finance/practitioner-recoveries/export.csv",
    {
      params,
      responseType: "blob",
    },
  );

  const fileNameHeader = response.headers?.["content-disposition"];
  return {
    blob: response.data as Blob,
    fileNameHeader:
      typeof fileNameHeader === "string" ? fileNameHeader : undefined,
  };
}

export async function getAdminPractitionerRecovery(recoveryId: string) {
  const response = await httpClient.get<ApiPayload<AdminPractitionerRecoveryDetailData>>(
    `/admin/finance/practitioner-recoveries/${recoveryId}`,
  );

  return extractData(response.data);
}

export async function markAdminPractitionerRecoveryCollected(
  recoveryId: string,
  payload: MarkAdminPractitionerRecoveryCollectedPayload,
) {
  const response = await httpClient.post<ApiPayload<AdminPractitionerRecoveryMutationResult>>(
    `/admin/finance/practitioner-recoveries/${recoveryId}/mark-collected`,
    payload,
  );

  return extractData(response.data);
}

export async function waiveAdminPractitionerRecovery(
  recoveryId: string,
  payload: WaiveAdminPractitionerRecoveryPayload,
) {
  const response = await httpClient.post<ApiPayload<AdminPractitionerRecoveryMutationResult>>(
    `/admin/finance/practitioner-recoveries/${recoveryId}/waive`,
    payload,
  );

  return extractData(response.data);
}
