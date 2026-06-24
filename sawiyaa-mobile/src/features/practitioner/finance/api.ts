import { apiClient, extractApiData } from "../../../lib/api";
import type {
  PractitionerLedgerListParams,
  PractitionerLedgerListResponse,
  PractitionerSettlementListParams,
  PractitionerSettlementListResponse,
  PractitionerWalletResponse,
} from "./types";

export async function getPractitionerWalletSummary() {
  const response = await apiClient.get<{
    success: boolean;
    data: PractitionerWalletResponse;
  }>("/practitioners/me/wallet");
  return extractApiData<PractitionerWalletResponse>(response);
}

export async function getPractitionerLedgerEntries(
  params?: PractitionerLedgerListParams,
) {
  const response = await apiClient.get<{
    success: boolean;
    data: PractitionerLedgerListResponse;
  }>("/practitioners/me/ledger", {
    params,
  });
  return extractApiData<PractitionerLedgerListResponse>(response);
}

export async function getPractitionerSettlementItems(
  params?: PractitionerSettlementListParams,
) {
  const response = await apiClient.get<{
    success: boolean;
    data: PractitionerSettlementListResponse;
  }>("/practitioners/me/settlements", {
    params,
  });
  return extractApiData<PractitionerSettlementListResponse>(response);
}
