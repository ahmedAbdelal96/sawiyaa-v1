import { useQuery } from "@tanstack/react-query";
import { fetchPublicPackageOffers } from "../api/package-offers.api";
import type { ListPackageOffersParams } from "../types/package-offers.types";

export const packageOfferQueryKeys = {
  all: ["package-offers"] as const,
  list: (params?: ListPackageOffersParams) =>
    [...packageOfferQueryKeys.all, "list", params ?? {}] as const,
};

export function usePublicPackageOffers(params?: ListPackageOffersParams) {
  return useQuery({
    queryKey: packageOfferQueryKeys.list(params),
    queryFn: () => fetchPublicPackageOffers(params),
    staleTime: 30_000,
  });
}
