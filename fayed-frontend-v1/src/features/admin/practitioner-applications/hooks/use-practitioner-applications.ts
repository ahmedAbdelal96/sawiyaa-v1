import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAdminPractitionerApplication,
  createAdminPractitionerDirectly,
  getAdminPractitionerApplicationDetails,
  listAdminPractitionerApplications,
  rejectAdminPractitionerApplication,
  updateAdminPractitionerApplicationDraft,
} from "../api/practitioner-applications.api";
import { adminPractitionerApplicationsQueryKeys } from "../constants/query-keys";
import type {
  ApprovePractitionerApplicationRequest,
  CreateAdminPractitionerRequest,
  ListPractitionerApplicationsParams,
  RejectPractitionerApplicationRequest,
  UpdatePractitionerApplicationDraftRequest,
} from "../types/practitioner-applications.types";

/**
 * Lists admin review queue items with optional status/search/pagination filters.
 */
export function useAdminPractitionerApplications(
  params?: ListPractitionerApplicationsParams,
  enabled = true
) {
  return useQuery({
    queryKey: adminPractitionerApplicationsQueryKeys.list(params),
    queryFn: () => listAdminPractitionerApplications(params),
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Reads one admin review details payload.
 */
export function useAdminPractitionerApplicationDetails(id?: string) {
  return useQuery({
    queryKey: adminPractitionerApplicationsQueryKeys.details(id ?? ""),
    queryFn: () => getAdminPractitionerApplicationDetails(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Approves one application and invalidates list + details + practitioner slices.
 */
export function useApprovePractitionerApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ApprovePractitionerApplicationRequest;
    }) => approveAdminPractitionerApplication(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.details(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * Rejects one application and invalidates list + details + practitioner slices.
 */
export function useRejectPractitionerApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: RejectPractitionerApplicationRequest;
    }) => rejectAdminPractitionerApplication(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.details(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * Updates practitioner application data before final decision and invalidates list/details slices.
 */
export function useUpdatePractitionerApplicationDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePractitionerApplicationDraftRequest;
    }) => updateAdminPractitionerApplicationDraft(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.details(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * Creates practitioner account directly from admin and refreshes practitioner application surfaces.
 */
export function useCreateAdminPractitionerDirect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdminPractitionerRequest) =>
      createAdminPractitionerDirectly(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.all,
      });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
