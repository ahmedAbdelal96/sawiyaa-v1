import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  ListPackageOffersParams,
  PackageOffersListResponseData,
} from "../types/package-offers.types";

export const PACKAGE_OFFERS_ROUTES = {
  publicList: "/public/package-offers",
} as const;

export async function fetchPublicPackageOffers(
  params?: ListPackageOffersParams,
): Promise<PackageOffersListResponseData> {
  const response = await httpClient.get<ApiPayload<PackageOffersListResponseData>>(
    PACKAGE_OFFERS_ROUTES.publicList,
    { params },
  );
  return extractData(response.data);
}
