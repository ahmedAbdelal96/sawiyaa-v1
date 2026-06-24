import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAdminPractitionerApplication,
  createAdminPractitionerApplicationCredential,
  createAdminPractitionerDirectly,
  deleteAdminPractitionerApplicationCredential,
  getAdminPractitionerApplicationDetails,
  listAdminPractitionerApplications,
  rejectAdminPractitionerApplication,
  requestChangesAdminPractitionerApplication,
  uploadAdminDirectPractitionerCredentialFile,
  updateAdminPractitionerApplicationCredential,
  updateAdminPractitionerApplicationDraft,
} from "../api/practitioner-applications.api";
import { adminPractitionerApplicationsQueryKeys } from "../constants/query-keys";
import type {
  ApprovePractitionerApplicationRequest,
  CreateAdminPractitionerApplicationCredentialRequest,
  CreateAdminPractitionerRequest,
  ListPractitionerApplicationsParams,
  RejectPractitionerApplicationRequest,
  RequestPractitionerApplicationChangesRequest,
  UploadAdminPractitionerCredentialFileRequest,
  UpdateAdminPractitionerApplicationCredentialRequest,
  UpdatePractitionerApplicationDraftRequest,
} from "../types/practitioner-applications.types";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { isAdminRole } from "@/lib/auth/roles";

/**
 * Lists admin review queue items with optional status/search/pagination filters.
 */
export function useAdminPractitionerApplications(
  params?: ListPractitionerApplicationsParams,
  enabled = true
) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminPractitionerApplicationsQueryKeys.list(params),
    queryFn: () => listAdminPractitionerApplications(params),
    enabled: isAdminRole(role) && enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Reads one admin review details payload.
 */
export function useAdminPractitionerApplicationDetails(id?: string) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminPractitionerApplicationsQueryKeys.details(id ?? ""),
    queryFn: () => getAdminPractitionerApplicationDetails(id as string),
    enabled: isAdminRole(role) && Boolean(id),
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
 * Requests changes for one application and invalidates list + details surfaces.
 */
export function useRequestPractitionerApplicationChanges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: RequestPractitionerApplicationChangesRequest;
    }) => requestChangesAdminPractitionerApplication(id, data),
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

/**
 * Uploads a credential file for admin direct-create wizard.
 */
export function useUploadAdminDirectPractitionerCredentialFile() {
  return useMutation({
    mutationFn: (data: UploadAdminPractitionerCredentialFileRequest) =>
      uploadAdminDirectPractitionerCredentialFile(data),
  });
}

/**
 * Creates one practitioner credential in admin application details scope.
 */
export function useCreateAdminPractitionerApplicationCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CreateAdminPractitionerApplicationCredentialRequest;
    }) => createAdminPractitionerApplicationCredential(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.details(variables.id),
      });
    },
  });
}

/**
 * Updates one practitioner credential in admin application details scope.
 */
export function useUpdateAdminPractitionerApplicationCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      credentialId,
      data,
    }: {
      id: string;
      credentialId: string;
      data: UpdateAdminPractitionerApplicationCredentialRequest;
    }) => updateAdminPractitionerApplicationCredential(id, credentialId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.details(variables.id),
      });
    },
  });
}

/**
 * Deletes one practitioner credential in admin application details scope.
 */
export function useDeleteAdminPractitionerApplicationCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, credentialId }: { id: string; credentialId: string }) =>
      deleteAdminPractitionerApplicationCredential(id, credentialId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerApplicationsQueryKeys.details(variables.id),
      });
    },
  });
}
