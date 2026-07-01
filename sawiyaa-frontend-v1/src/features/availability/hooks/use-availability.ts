import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  copyAvailabilityWeekToNext,
  createAvailabilityWeek,
  getMyAvailabilityWeeks,
  publishAvailabilityWeek,
  updateAvailabilityWeek,
} from "../api/availability.api";
import { availabilityQueryKeys } from "../constants/query-keys";

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
