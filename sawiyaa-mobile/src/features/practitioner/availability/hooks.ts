import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getMyAvailabilityWeeks,
  createAvailabilityWeek,
  updateAvailabilityWeek,
  copyAvailabilityWeekToNext,
  publishAvailabilityWeek,
  type CreateAvailabilityWeekPayload,
  type UpdateAvailabilityWeekPayload,
} from "./api";

export const practitionerAvailabilityQueryKeys = {
  all: ["practitioner", "availability"] as const,
  weeks: () => [...practitionerAvailabilityQueryKeys.all, "weeks"] as const,
  currentNext: () => [...practitionerAvailabilityQueryKeys.weeks(), "current-next"] as const,
};

export function useMyAvailabilityWeeks(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerAvailabilityQueryKeys.currentNext(),
    queryFn: getMyAvailabilityWeeks,
    enabled: enabled && authEnabled,
    staleTime: 30_000,
  });
}

export function useCreateAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAvailabilityWeekPayload) => createAvailabilityWeek(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.currentNext(), data);
    },
  });
}

export function useUpdateAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      weekId,
      payload,
    }: {
      weekId: string;
      payload: UpdateAvailabilityWeekPayload;
    }) => updateAvailabilityWeek(weekId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.currentNext(), data);
    },
  });
}

export function useCopyAvailabilityWeekToNext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekId: string) => copyAvailabilityWeekToNext(weekId),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.currentNext(), data);
    },
  });
}

export function usePublishAvailabilityWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekId: string) => publishAvailabilityWeek(weekId),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.currentNext(), data);
    },
  });
}
