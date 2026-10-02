import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api";
import {
  ListPublicPractitionersFilters,
  PublicPractitionerDetailsResponse,
  PublicPractitionerInstantBookingAvailabilityResponse,
  PublicPractitionerPresenceResponse,
  PublicPractitionersListResponse,
} from "./types";
import { toPublicPractitionerQueryParams } from "./query";
import i18n from "../../../i18n";

export const useGetPublicPractitioners = (
  filters: ListPublicPractitionersFilters,
) => {
  return useQuery({
    queryKey: ["public-practitioners", i18n.language, filters],
    queryFn: async () => {
      const response = await apiClient.get<PublicPractitionersListResponse>(
        "/public/practitioners",
        {
          params: toPublicPractitionerQueryParams(filters),
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
    queryKey: ["public-practitioners", "infinite", i18n.language, filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<PublicPractitionersListResponse>(
        "/public/practitioners",
        {
          params: {
            ...toPublicPractitionerQueryParams(filters),
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
    queryKey: ["public-practitioner", i18n.language, slug],
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

export const useGetPublicPractitionerInstantBookingAvailability = (slug: string | null) => {
  return useQuery({
    queryKey: ["public-practitioner-instant-booking-availability", slug],
    queryFn: async () => {
      const response = await apiClient.get<PublicPractitionerInstantBookingAvailabilityResponse>(
        `/public/practitioners/${slug}/instant-booking-availability`,
      );
      return response.data;
    },
    enabled: !!slug,
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
};
