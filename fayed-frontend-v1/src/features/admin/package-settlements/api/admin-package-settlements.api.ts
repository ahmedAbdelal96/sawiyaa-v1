import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  ListAdminPackageSettlementsParams,
  PackageSettlementDetailResponseData,
  PackageSettlementListResponseData,
  ReleasePackageSettlementResponseData,
} from "../types/admin-package-settlements.types";

export async function listAdminPackageSettlements(
  params: ListAdminPackageSettlementsParams,
) {
  const response = await httpClient.get<ApiPayload<PackageSettlementListResponseData>>(
    "/admin/package-settlements",
    { params },
  );

  return extractData(response.data);
}

export async function getAdminPackageSettlement(id: string) {
  const response = await httpClient.get<ApiPayload<PackageSettlementDetailResponseData>>(
    `/admin/package-settlements/${id}`,
  );

  return extractData(response.data);
}

export async function releaseAdminPackageSettlement(id: string) {
  const response = await httpClient.post<ApiPayload<ReleasePackageSettlementResponseData>>(
    `/admin/package-settlements/${id}/release`,
  );

  return extractData(response.data);
}
