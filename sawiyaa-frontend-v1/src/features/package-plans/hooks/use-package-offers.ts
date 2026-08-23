import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { fetchPublicPackageOffers } from "../api/package-offers.api";
import type { ListPackageOffersParams } from "../types/package-offers.types";

export const packageOfferQueryKeys = {
  all: ["package-offers"] as const,
  list: (params?: ListPackageOffersParams, locale?: string) =>
    [...packageOfferQueryKeys.all, "list", locale ?? "en", params ?? {}] as const,
};

export function usePublicPackageOffers(params?: ListPackageOffersParams) {
  const locale = useLocale();

  return useQuery({
    queryKey: packageOfferQueryKeys.list(params, locale),
    queryFn: () => fetchPublicPackageOffers(params),
    staleTime: 30_000,
  });
}
