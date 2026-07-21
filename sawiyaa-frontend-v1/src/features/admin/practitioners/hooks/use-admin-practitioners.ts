"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminPractitioners,
  removeAdminPractitionerAvatar,
  updateAdminPractitionerAvatar,
  getAdminPractitionerPublication,
  updateAdminPractitionerPublication,
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

export function useAdminPractitionerPublication(practitionerId: string | null) {
  return useQuery({
    queryKey: ["admin", "practitioner-publication", practitionerId],
    queryFn: () => getAdminPractitionerPublication(practitionerId!),
    enabled: Boolean(practitionerId),
    staleTime: 0,
  });
}

export function useUpdateAdminPractitionerPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { practitionerId: string; isPublished: boolean; reason?: string }) =>
      updateAdminPractitionerPublication(input.practitionerId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "practitioners"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "practitioner-publication", variables.practitionerId] });
    },
  });
}
