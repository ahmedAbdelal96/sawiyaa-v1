import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmAvailabilityWeekRepeat,
  createAvailabilityWeek,
  getMyAvailabilityWeeks,
  getAvailabilityWeekDetails,
  previewAvailabilityWeekRepeat,
  publishAvailabilityWeek,
  updateAvailabilityWeek,
} from "../api/availability.api";
import { availabilityQueryKeys } from "../constants/query-keys";

function invalidateAvailability(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
}

export function useMyAvailabilityWeeks(enabled = true) {
  return useQuery({
    queryKey: [...availabilityQueryKeys.all, "weeks"] as const,
    queryFn: getMyAvailabilityWeeks,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAvailabilityWeekDetails(weekId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...availabilityQueryKeys.all, "week", weekId] as const,
    queryFn: () => getAvailabilityWeekDetails(weekId as string),
    enabled: enabled && Boolean(weekId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useCreateAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createAvailabilityWeek, onSuccess: () => invalidateAvailability(queryClient) });
}

export function useUpdateAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: updateAvailabilityWeek, onSuccess: () => invalidateAvailability(queryClient) });
}

export function usePublishAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: publishAvailabilityWeek, onSuccess: () => invalidateAvailability(queryClient) });
}

export function usePreviewAvailabilityWeekRepeat() {
  return useMutation({ mutationFn: previewAvailabilityWeekRepeat });
}

export function useConfirmAvailabilityWeekRepeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmAvailabilityWeekRepeat,
    onSuccess: () => invalidateAvailability(queryClient),
  });
}
