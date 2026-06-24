"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminPractitioners,
  removeAdminPractitionerAvatar,
  updateAdminPractitionerAvatar,
} from "../api/admin-practitioners.api";
import type { ListAdminPractitionersParams } from "../types/admin-practitioners.types";

export function useAdminPractitioners(
  params: ListAdminPractitionersParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin", "practitioners", params],
    queryFn: () => listAdminPractitioners(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateAdminPractitionerAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { practitionerId: string; avatarUrl: string }) =>
      updateAdminPractitionerAvatar(input.practitionerId, {
        avatarUrl: input.avatarUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "practitioners"] });
    },
  });
}

export function useRemoveAdminPractitionerAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (practitionerId: string) =>
      removeAdminPractitionerAvatar(practitionerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "practitioners"] });
    },
  });
}
