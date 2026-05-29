"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminFeaturedPlacement,
  getAdminFeaturedPlacement,
  listAdminFeaturedPlacementHistory,
  listAdminFeaturedPlacements,
  pauseAdminFeaturedPlacement,
  resumeAdminFeaturedPlacement,
  updateAdminFeaturedPlacement,
} from "../api/admin-featured-practitioners.api";
import type {
  CreateAdminFeaturedPlacementInput,
  ListAdminFeaturedPlacementsParams,
  PlacementActionNoteInput,
  UpdateAdminFeaturedPlacementInput,
} from "../types/admin-featured-practitioners.types";

export const adminFeaturedPractitionersQueryKeys = {
  all: ["admin", "featured-practitioners"] as const,
  list: (params: ListAdminFeaturedPlacementsParams) =>
    [...adminFeaturedPractitionersQueryKeys.all, "list", params] as const,
  detail: (id: string) =>
    [...adminFeaturedPractitionersQueryKeys.all, "detail", id] as const,
  history: (id: string) =>
    [...adminFeaturedPractitionersQueryKeys.all, "history", id] as const,
};

export function useAdminFeaturedPlacements(
  params: ListAdminFeaturedPlacementsParams,
) {
  return useQuery({
    queryKey: adminFeaturedPractitionersQueryKeys.list(params),
    queryFn: () => listAdminFeaturedPlacements(params),
    staleTime: 30_000,
  });
}

export function useAdminFeaturedPlacementDetail(id: string | null) {
  return useQuery({
    queryKey: adminFeaturedPractitionersQueryKeys.detail(id ?? ""),
    queryFn: () => getAdminFeaturedPlacement(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useAdminFeaturedPlacementHistory(id: string | null) {
  return useQuery({
    queryKey: adminFeaturedPractitionersQueryKeys.history(id ?? ""),
    queryFn: () => listAdminFeaturedPlacementHistory(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useCreateAdminFeaturedPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminFeaturedPlacementInput) =>
      createAdminFeaturedPlacement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.all,
      });
    },
  });
}

export function useUpdateAdminFeaturedPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: UpdateAdminFeaturedPlacementInput }) =>
      updateAdminFeaturedPlacement(input.id, input.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.detail(variables.id),
      });
    },
  });
}

export function usePauseAdminFeaturedPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: PlacementActionNoteInput }) =>
      pauseAdminFeaturedPlacement(input.id, input.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.history(variables.id),
      });
    },
  });
}

export function useResumeAdminFeaturedPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: PlacementActionNoteInput }) =>
      resumeAdminFeaturedPlacement(input.id, input.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: adminFeaturedPractitionersQueryKeys.history(variables.id),
      });
    },
  });
}
