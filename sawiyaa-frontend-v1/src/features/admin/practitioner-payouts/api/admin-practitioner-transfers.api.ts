import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { PayoutMethod } from "../../finance/types/payout-method";
import type {
  Pagination,
  ListAdminPractitionerManualPayoutHistoryParams,
} from "../types/admin-practitioner-payouts.types";

export type AdminPractitionerTransferProof = {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  originalFileName: string | null;
  uploadedAt: string;
  downloadUrl: string;
};

export type AdminPractitionerTransferItem = {
  id: string;
  practitionerId: string;
  settlementId: string;
  amountPaid: string;
  currency: string;
  payoutMethod: PayoutMethod;
  payoutSource: string;
  payoutDate: string;
  externalReference: string | null;
  notes: string | null;
  processedByUserId: string | null;
  processedByDisplayName: string | null;
  createdAt: string;
  status: string | null;
  practitionerDisplayName: string | null;
  practitionerSlug: string | null;
  proof: AdminPractitionerTransferProof | null;
};

export type PractitionerTransferSummary = {
  payoutCount: number;
  egpAmountPaid: string;
  usdAmountPaid: string;
};

export type AdminPractitionerTransferListResponse = {
  items: AdminPractitionerTransferItem[];
  pagination: Pagination;
  summary: PractitionerTransferSummary;
};

export async function listAdminPractitionerTransfers(
  params?: ListAdminPractitionerManualPayoutHistoryParams,
) {
  const response = await httpClient.get<ApiPayload<AdminPractitionerTransferListResponse>>(
    "/admin/payouts",
    {
      params: params
        ? {
            page: params.page,
            limit: params.limit,
            practitionerId: params.practitionerId,
            currencyCode: params.currency,
            payoutMethod: params.payoutMethod,
            createdFrom: params.createdFrom,
            createdTo: params.createdTo,
          }
        : undefined,
    },
  );

  return extractData(response.data);
}

export async function getAdminPractitionerTransferDetail(transferId: string) {
  try {
    const response = await httpClient.get<ApiPayload<AdminPractitionerTransferItem>>(
      `/admin/payouts/${transferId}`,
    );
    return extractData(response.data);
  } catch {
    const list = await listAdminPractitionerTransfers({ limit: 100 });
    const match = list.items.find((item) => item.id === transferId);
    if (match) return match;
    throw new Error("Transfer not found");
  }
}
