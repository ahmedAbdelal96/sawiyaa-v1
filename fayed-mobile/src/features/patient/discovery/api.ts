import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api";
import {
  ListPublicPractitionersFilters,
  PublicPractitionerDetailsResponse,
  PublicPractitionerPresenceResponse,
  PublicPractitionersListResponse,
} from "./types";

export const useGetPublicPractitioners = (
  filters: ListPublicPractitionersFilters,
) => {
  return useQuery({
    queryKey: ["public-practitioners", filters],
    queryFn: async () => {
      const response = await apiClient.get<PublicPractitionersListResponse>(
        "/public/practitioners",
        {
          params: filters,
        },
      );
      return response.data;
    },
  });
};

export const useGetPublicPractitionerDetails = (slug: string | null) => {
  return useQuery({
    queryKey: ["public-practitioner", slug],
    queryFn: async () => {
      const response = await apiClient.get<PublicPractitionerDetailsResponse>(
        `/public/practitioners/${slug}`,
      );
      return response.data;
    },
    enabled: !!slug,
  });
};

export const useGetPublicPractitionerPresence = (slug: string | null) => {
  return useQuery({
    queryKey: ["public-practitioner-presence", slug],
    queryFn: async () => {
      const response = await apiClient.get<PublicPractitionerPresenceResponse>(
        `/public/practitioners/${slug}/presence`,
      );
      return response.data;
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
};
