import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getMyAvailability,
  replaceWeeklyAvailability,
  updateAvailabilityException,
} from "./api";

export const practitionerAvailabilityQueryKeys = {
  all: ["practitioner-availability"] as const,
  me: () => [...practitionerAvailabilityQueryKeys.all, "me"] as const,
};

export function useMyAvailability(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerAvailabilityQueryKeys.me(),
    queryFn: getMyAvailability,
    enabled: enabled && authEnabled,
    staleTime: 30_000,
  });
}

export function useReplaceWeeklyAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replaceWeeklyAvailability,
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.me(), data);
    },
  });
}

export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvailabilityException,
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.me(), data);
    },
  });
}

export function useUpdateAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exceptionId,
      payload,
    }: {
      exceptionId: string;
      payload: Parameters<typeof updateAvailabilityException>[1];
    }) => updateAvailabilityException(exceptionId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.me(), data);
    },
  });
}

export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAvailabilityException,
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerAvailabilityQueryKeys.me(), data);
    },
  });
}
