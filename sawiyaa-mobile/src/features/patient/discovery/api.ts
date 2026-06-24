import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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

type InfinitePublicPractitionersFilters = Omit<ListPublicPractitionersFilters, "page">;

export const useGetPublicPractitionersInfinite = (
  filters: InfinitePublicPractitionersFilters,
) => {
  return useInfiniteQuery({
    queryKey: ["public-practitioners", "infinite", filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<PublicPractitionersListResponse>(
        "/public/practitioners",
        {
          params: {
            ...filters,
            page: pageParam,
            limit: filters.limit ?? 12,
          },
        },
      );

      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data.pagination;
      if (pagination.page >= pagination.totalPages) {
        return undefined;
      }

      return pagination.page + 1;
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
