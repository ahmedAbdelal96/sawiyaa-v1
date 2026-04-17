import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getMyAvailability,
  replaceWeeklyAvailability,
} from "../api/availability.api";
import { availabilityQueryKeys } from "../constants/query-keys";

/**
 * Reads the practitioner's current availability schedule and exceptions.
 */
export function useMyAvailability(enabled = true) {
  return useQuery({
    queryKey: availabilityQueryKeys.me(),
    queryFn: getMyAvailability,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Replaces the entire weekly schedule and refreshes the local cache.
 */
export function useReplaceWeeklyAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replaceWeeklyAvailability,
    onSuccess: (data) => {
      queryClient.setQueryData(availabilityQueryKeys.me(), data);
    },
  });
}

/**
 * Creates a temporary override exception and refreshes the local cache.
 */
export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAvailabilityException,
    onSuccess: (data) => {
      queryClient.setQueryData(availabilityQueryKeys.me(), data);
    },
  });
}

/**
 * Deletes an exception by ID and refreshes the local cache.
 */
export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAvailabilityException,
    onSuccess: (data) => {
      queryClient.setQueryData(availabilityQueryKeys.me(), data);
    },
  });
}
