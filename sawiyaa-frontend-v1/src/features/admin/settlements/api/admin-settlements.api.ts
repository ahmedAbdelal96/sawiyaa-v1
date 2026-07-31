import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { AddSettlementAdjustmentPayload, ListAdminSettlementsParams, SettlementDetailResponse, SettlementListResponse } from "../types/admin-settlements.types";
import type { RecordPractitionerPayoutRequest } from "../types/admin-settlements.types";

export async function listAdminSettlements(params: ListAdminSettlementsParams) {
  const response = await httpClient.get<ApiPayload<SettlementListResponse>>("/admin/settlements", { params });
  return extractData(response.data);
}
export async function getAdminSettlement(id: string) {
  const response = await httpClient.get<ApiPayload<SettlementDetailResponse>>(`/admin/settlements/${id}`);
  return extractData(response.data);
}
export async function addAdminSettlementAdjustment(id: string, payload: AddSettlementAdjustmentPayload) {
  const response = await httpClient.post(`/admin/settlements/${id}/adjustments`, payload);
  return extractData(response.data);
}
export async function approveAdminSettlement(id: string, payload?: { exchangeRate?: string; approvedWalletCreditAmount?: string; walletCreditOverrideReason?: string }) {
  const response = await httpClient.post(`/admin/settlements/${id}/approve`, payload ?? {});
  return extractData(response.data);
}
export async function rejectAdminSettlement(id: string, reason: string) {
  const response = await httpClient.post(`/admin/settlements/${id}/reject`, { reason });
  return extractData(response.data);
}
export async function payoutAdminSettlement(id: string, payload: RecordPractitionerPayoutRequest) {
  const response = await httpClient.post(`/admin/settlements/${id}/payout`, payload);
  return extractData(response.data);
}
