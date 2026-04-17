import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  PractitionerLedgerListParams,
  PractitionerLedgerListResponse,
  PractitionerSettlementListParams,
  PractitionerSettlementListResponse,
  PractitionerWallet,
  PractitionerWalletResponse,
} from "../types/financial-operations.types";

export async function getPractitionerWallet(): Promise<PractitionerWallet> {
  const response = await httpClient.get<ApiPayload<PractitionerWalletResponse>>(
    "/practitioners/me/wallet",
  );
  return extractData(response.data).item;
}

export async function getPractitionerLedger(
  params?: PractitionerLedgerListParams,
): Promise<PractitionerLedgerListResponse> {
  const response = await httpClient.get<ApiPayload<PractitionerLedgerListResponse>>(
    "/practitioners/me/ledger",
    { params },
  );
  return extractData(response.data);
}

export async function getPractitionerSettlements(
  params?: PractitionerSettlementListParams,
): Promise<PractitionerSettlementListResponse> {
  const response = await httpClient.get<ApiPayload<PractitionerSettlementListResponse>>(
    "/practitioners/me/settlements",
    { params },
  );
  return extractData(response.data);
}
