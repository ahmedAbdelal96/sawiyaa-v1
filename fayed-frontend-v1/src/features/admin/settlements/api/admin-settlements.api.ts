import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  GenerateSettlementBatchInput,
  PractitionerPayoutDetailResponseData,
  PractitionerPayoutDueListResponseData,
  PractitionerPayoutHistoryListResponseData,
  AdminPayoutHistoryListResponseData,
  PractitionerStatementResponseData,
  RecordPractitionerPayoutRequest,
  RecordPractitionerPayoutResponseData,
  ListPractitionerSettlementsParams,
  ListSettlementBatchesParams,
  ListSettlementPayoutsParams,
  MarkSettlementFailedInput,
  MarkSettlementPaidInput,
  PractitionerSettlementListResponseData,
  SettlementBatchDetailResponseData,
  SettlementBatchListResponseData,
  SettlementPayoutItemResponseData,
  SettlementPayoutListResponseData,
  RecordPractitionerSettlementPayoutInput,
  UploadPractitionerPayoutProofResponseData,
  RevenueShareRulesResponseData,
  UpdateRevenueShareRulesRequest,
  ListSettlementDuesDirectoryParams,
  SettlementDuesDirectoryListResponseData,
} from "../types/admin-settlements.types";

export async function listAdminSettlementBatches(
  params: ListSettlementBatchesParams,
) {
  const response = await httpClient.get<ApiPayload<SettlementBatchListResponseData>>(
    "/admin/settlements",
    { params },
  );

  return extractData(response.data);
}

export async function getAdminSettlementBatchDetails(batchId: string) {
  const response = await httpClient.get<ApiPayload<SettlementBatchDetailResponseData>>(
    `/admin/settlements/${batchId}`,
  );

  return extractData(response.data);
}

export async function generateAdminSettlementBatch(
  data: GenerateSettlementBatchInput,
) {
  const response = await httpClient.post<ApiPayload<SettlementBatchDetailResponseData>>(
    "/admin/settlements/generate",
    data,
  );

  return extractData(response.data);
}

export async function markAdminSettlementPaid(
  batchId: string,
  data: MarkSettlementPaidInput,
) {
  const response = await httpClient.post<ApiPayload<SettlementBatchDetailResponseData>>(
    `/admin/settlements/${batchId}/mark-paid`,
    data,
  );

  return extractData(response.data);
}

export async function markAdminSettlementFailed(
  batchId: string,
  data: MarkSettlementFailedInput,
) {
  const response = await httpClient.post<ApiPayload<SettlementBatchDetailResponseData>>(
    `/admin/settlements/${batchId}/mark-failed`,
    data,
  );

  return extractData(response.data);
}

export async function listAdminPractitionerSettlements(
  practitionerId: string,
  params: ListPractitionerSettlementsParams,
) {
  const response = await httpClient.get<
    ApiPayload<PractitionerSettlementListResponseData>
  >(`/admin/settlements/practitioners/${practitionerId}/settlements`, {
    params,
  });

  return extractData(response.data);
}

export async function listAdminPractitionerPayouts(
  practitionerId: string,
  params: ListSettlementPayoutsParams,
) {
  const response = await httpClient.get<ApiPayload<SettlementPayoutListResponseData>>(
    `/admin/settlements/practitioners/${practitionerId}/payouts`,
    { params },
  );

  return extractData(response.data);
}

export async function recordAdminPractitionerSettlementPayout(
  practitionerId: string,
  settlementId: string,
  data: RecordPractitionerSettlementPayoutInput,
) {
  const response = await httpClient.post<ApiPayload<SettlementPayoutItemResponseData>>(
    `/admin/settlements/practitioners/${practitionerId}/payouts/${settlementId}`,
    data,
  );

  return extractData(response.data);
}

export async function listAdminPractitionerPayoutDues(
  practitionerId: string,
  params?: { page?: number; limit?: number; currencyCode?: string },
) {
  const response = await httpClient.get<ApiPayload<PractitionerPayoutDueListResponseData>>(
    `/admin/practitioners/${practitionerId}/payouts/due`,
    { params },
  );

  return extractData(response.data);
}

export async function listAdminSettlementDuesDirectory(
  params: ListSettlementDuesDirectoryParams,
) {
  const response = await httpClient.get<ApiPayload<SettlementDuesDirectoryListResponseData>>(
    "/admin/settlements/practitioner-dues",
    { params },
  );

  return extractData(response.data);
}

export async function listAdminPractitionerPayoutHistory(
  practitionerId: string,
  params?: {
    page?: number;
    limit?: number;
    payoutMethod?: string;
    payoutSource?: string;
    createdFrom?: string;
    createdTo?: string;
    currencyCode?: string;
  },
) {
  const response = await httpClient.get<ApiPayload<PractitionerPayoutHistoryListResponseData>>(
    `/admin/practitioners/${practitionerId}/payouts`,
    { params },
  );

  return extractData(response.data);
}

export async function listAdminPayoutHistory(
  params?: {
    page?: number;
    limit?: number;
    practitionerId?: string;
    payoutMethod?: string;
    createdFrom?: string;
    createdTo?: string;
    currencyCode?: string;
  },
) {
  const response = await httpClient.get<ApiPayload<AdminPayoutHistoryListResponseData>>(
    `/admin/payouts`,
    { params },
  );

  return extractData(response.data);
}

export async function getAdminPractitionerPayoutDetail(
  practitionerId: string,
  payoutId: string,
) {
  const response = await httpClient.get<ApiPayload<PractitionerPayoutDetailResponseData>>(
    `/admin/practitioners/${practitionerId}/payouts/${payoutId}`,
  );

  return extractData(response.data);
}

export async function getAdminPractitionerStatement(
  practitionerId: string,
  params?: {
    currencyCode?: string;
    rowType?: "ALL" | "EARNING" | "PAYOUT";
    effectiveFrom?: string;
    effectiveTo?: string;
  },
) {
  const response = await httpClient.get<ApiPayload<PractitionerStatementResponseData>>(
    `/admin/practitioners/${practitionerId}/statement`,
    { params },
  );

  return extractData(response.data);
}

export async function recordAdminPractitionerPayout(
  practitionerId: string,
  data: RecordPractitionerPayoutRequest,
) {
  const response = await httpClient.post<ApiPayload<RecordPractitionerPayoutResponseData>>(
    `/admin/practitioners/${practitionerId}/payouts`,
    data,
  );

  return extractData(response.data);
}

export async function uploadAdminPractitionerPayoutProof(
  practitionerId: string,
  payoutId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await httpClient.post<ApiPayload<UploadPractitionerPayoutProofResponseData>>(
    `/admin/practitioners/${practitionerId}/payouts/${payoutId}/proof`,
    formData,
  );

  return extractData(response.data);
}

export async function downloadAdminPractitionerPayoutProof(
  practitionerId: string,
  payoutId: string,
) {
  const response = await httpClient.get(
    `/admin/practitioners/${practitionerId}/payouts/${payoutId}/proof`,
    {
      responseType: "blob",
    },
  );

  return response.data as Blob;
}

export async function getAdminRevenueShareRules() {
  const response = await httpClient.get<ApiPayload<RevenueShareRulesResponseData>>(
    "/admin/revenue-share-rules",
  );

  return extractData(response.data);
}

export async function updateAdminRevenueShareRules(
  data: UpdateRevenueShareRulesRequest,
) {
  const response = await httpClient.put<ApiPayload<RevenueShareRulesResponseData>>(
    "/admin/revenue-share-rules",
    data,
  );

  return extractData(response.data);
}
