import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  copyAvailabilityWeekToNext,
  createAvailabilityException,
  createAvailabilityWeek,
  deleteAvailabilityException,
  getMyAvailability,
  getMyAvailabilityWeeks,
  replaceWeeklyAvailability,
  publishAvailabilityWeek,
  updateAvailabilityWeek,
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
 * Reads current and next published availability weeks.
 */
export function useMyAvailabilityWeeks(enabled = true) {
  return useQuery({
    queryKey: [...availabilityQueryKeys.all, "weeks"] as const,
    queryFn: getMyAvailabilityWeeks,
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

/**
 * Creates a new draft availability week.
 */
export function useCreateAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAvailabilityWeek,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}

/**
 * Updates an existing draft availability week.
 */
export function useUpdateAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAvailabilityWeek,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}

/**
 * Copies the current week into the next week as a draft.
 */
export function useCopyAvailabilityWeekToNext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: copyAvailabilityWeekToNext,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}

/**
 * Publishes a draft availability week.
 */
export function usePublishAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishAvailabilityWeek,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}
