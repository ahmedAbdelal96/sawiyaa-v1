"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkAdminAcademyProgramEnrollments,
  archiveAdminAcademyProgram,
  cancelAdminAcademyProgramEnrollment,
  createPublicAcademyProgramEnrollment,
  createAdminAcademyProgram,
  createAdminAcademyProgramEnrollment,
  createAdminAcademyProgramSession,
  exportAdminAcademyProgramEnrollments,
  getAdminAcademyProgram,
  getAdminAcademyProgramAttendance,
  getAdminAcademyProgramEnrollments,
  getAdminAcademyPrograms,
  getPublicAcademyProgram,
  getPublicAcademyProgramEnrollment,
  getPublicAcademyPrograms,
  getPatientAcademyProgramEnrollment,
  getPatientAcademyProgramEnrollments,
  markCertifiedAdminAcademyProgramEnrollment,
  markCompletedAdminAcademyProgramEnrollment,
  publishAdminAcademyProgram,
  uploadAdminAcademyProgramCover,
  uploadAdminAcademyProgramEnrollmentCertificate,
  saveAdminAcademyProgramAttendance,
  updateAdminAcademyProgram,
  updateAdminAcademyProgramEnrollmentLearner,
  updateAdminAcademyProgramSession,
} from "../api/academy-programs.api";
import type {
  AcademyProgramItem,
  CreateAcademyProgramInput,
  CreateAcademyProgramSessionInput,
  ListAdminAcademyProgramsParams,
  ListAdminAcademyProgramAttendanceParams,
  ListPublicAcademyProgramsParams,
  ListAdminAcademyProgramEnrollmentsParams,
  BulkAcademyProgramEnrollmentActionInput,
  CreateAdminAcademyProgramEnrollmentInput,
  CreateAcademyProgramEnrollmentInput,
  SaveAdminAcademyProgramAttendanceInput,
  UploadAcademyProgramEnrollmentCertificateInput,
  UpdateAcademyProgramEnrollmentLearnerInput,
  UpdateAcademyProgramInput,
  UpdateAcademyProgramSessionInput,
  ListPatientAcademyProgramEnrollmentsParams,
} from "../types/academy-programs.types";

export const academyProgramsQueryKeys = {
  all: ["academy-programs"] as const,
  publicPrograms: (params?: ListPublicAcademyProgramsParams, scopeKey?: string | null) =>
    [...academyProgramsQueryKeys.all, "public-programs", scopeKey ?? "guest", params ?? {}] as const,
  publicProgram: (slug: string, scopeKey?: string | null) =>
    [...academyProgramsQueryKeys.all, "public-program", scopeKey ?? "guest", slug] as const,
  publicProgramEnrollment: (enrollmentId: string, token: string) =>
    [...academyProgramsQueryKeys.all, "public-program-enrollment", enrollmentId, token] as const,
  patientEnrollments: (params?: ListPatientAcademyProgramEnrollmentsParams) =>
    [...academyProgramsQueryKeys.all, "patient-enrollments", params ?? {}] as const,
  patientEnrollment: (enrollmentId: string) =>
    [...academyProgramsQueryKeys.all, "patient-enrollment", enrollmentId] as const,
  adminPrograms: (params?: ListAdminAcademyProgramsParams) =>
    [...academyProgramsQueryKeys.all, "admin-programs", params ?? {}] as const,
  adminProgram: (programId: string) =>
    [...academyProgramsQueryKeys.all, "admin-program", programId] as const,
  adminProgramAttendance: (
    programId: string,
    params?: ListAdminAcademyProgramAttendanceParams,
  ) =>
    [...academyProgramsQueryKeys.all, "admin-program-attendance", programId, params ?? {}] as const,
  adminProgramEnrollments: (
    programId: string,
    params?: ListAdminAcademyProgramEnrollmentsParams,
  ) => [...academyProgramsQueryKeys.all, "admin-program-enrollments", programId, params ?? {}] as const,
};

export function usePublicAcademyPrograms(
  params?: ListPublicAcademyProgramsParams,
  options?: { cacheScopeKey?: string | null },
) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.publicPrograms(params, options?.cacheScopeKey),
    queryFn: () => getPublicAcademyPrograms(params),
    staleTime: 30_000,
  });
}

export function usePublicAcademyProgram(
  slug: string | null,
  options?: { cacheScopeKey?: string | null },
) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.publicProgram(slug ?? "", options?.cacheScopeKey),
    queryFn: () => getPublicAcademyProgram(slug!),
    enabled: Boolean(slug),
    staleTime: 30_000,
  });
}

export function useCreatePublicAcademyProgramEnrollment() {
  return useMutation({
    mutationFn: (params: {
      slug: string;
      input: CreateAcademyProgramEnrollmentInput;
    }) => createPublicAcademyProgramEnrollment(params.slug, params.input),
  });
}

export function usePublicAcademyProgramEnrollment(
  enrollmentId: string | null,
  token: string | null,
) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.publicProgramEnrollment(enrollmentId ?? "", token ?? ""),
    queryFn: () => getPublicAcademyProgramEnrollment(enrollmentId!, token!),
    enabled: Boolean(enrollmentId && token),
    staleTime: 0,
  });
}

export function usePatientAcademyProgramEnrollments(
  params?: ListPatientAcademyProgramEnrollmentsParams,
) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.patientEnrollments(params),
    queryFn: () => getPatientAcademyProgramEnrollments(params),
    staleTime: 20_000,
  });
}

export function usePatientAcademyProgramEnrollment(enrollmentId: string | null) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.patientEnrollment(enrollmentId ?? ""),
    queryFn: () => getPatientAcademyProgramEnrollment(enrollmentId!),
    enabled: Boolean(enrollmentId),
    staleTime: 0,
  });
}

export function useAdminAcademyPrograms(params?: ListAdminAcademyProgramsParams) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.adminPrograms(params),
    queryFn: () => getAdminAcademyPrograms(params),
    staleTime: 30_000,
  });
}

export function useAdminAcademyProgram(programId: string | null) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.adminProgram(programId ?? ""),
    queryFn: () => getAdminAcademyProgram(programId!),
    enabled: Boolean(programId),
    staleTime: 30_000,
  });
}

export function useAdminAcademyProgramAttendance(
  programId: string | null,
  params?: ListAdminAcademyProgramAttendanceParams,
) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.adminProgramAttendance(programId ?? "", params),
    queryFn: () => getAdminAcademyProgramAttendance(programId!, params),
    enabled: Boolean(programId),
    staleTime: 0,
  });
}

export function useCreateAdminAcademyProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAcademyProgramInput) => createAdminAcademyProgram(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useUpdateAdminAcademyProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      input,
    }: {
      programId: string;
      input: UpdateAcademyProgramInput;
    }) => updateAdminAcademyProgram(programId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgram(variables.programId),
      });
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function usePublishAdminAcademyProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) => publishAdminAcademyProgram(programId),
    onSuccess: (_data, programId) => {
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgram(programId),
      });
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useUploadAdminAcademyProgramCover() {
  return useMutation({
    mutationFn: (file: File) => uploadAdminAcademyProgramCover(file),
  });
}

export function useArchiveAdminAcademyProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) => archiveAdminAcademyProgram(programId),
    onSuccess: (_data, programId) => {
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgram(programId),
      });
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useCreateAdminAcademyProgramSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      input,
    }: {
      programId: string;
      input: CreateAcademyProgramSessionInput;
    }) => createAdminAcademyProgramSession(programId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgram(variables.programId),
      });
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useCreateAdminAcademyProgramEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      input,
    }: {
      programId: string;
      input: CreateAdminAcademyProgramEnrollmentInput;
    }) => createAdminAcademyProgramEnrollment(programId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgramEnrollments(variables.programId),
      });
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgram(variables.programId),
      });
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useUpdateAdminAcademyProgramSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      sessionId,
      input,
    }: {
      programId: string;
      sessionId: string;
      input: UpdateAcademyProgramSessionInput;
    }) => updateAdminAcademyProgramSession(programId, sessionId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgram(variables.programId),
      });
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useSaveAdminAcademyProgramAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      input,
    }: {
      programId: string;
      input: SaveAdminAcademyProgramAttendanceInput;
    }) => saveAdminAcademyProgramAttendance(programId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgramAttendance(variables.programId),
      });
      queryClient.invalidateQueries({
        queryKey: academyProgramsQueryKeys.adminProgram(variables.programId),
      });
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useAdminAcademyProgramEnrollments(
  programId: string | null,
  params?: ListAdminAcademyProgramEnrollmentsParams,
) {
  return useQuery({
    queryKey: academyProgramsQueryKeys.adminProgramEnrollments(programId ?? "", params),
    queryFn: () => getAdminAcademyProgramEnrollments(programId!, params),
    enabled: Boolean(programId),
    staleTime: 20_000,
  });
}

export function useExportAdminAcademyProgramEnrollments() {
  return useMutation({
    mutationFn: ({
      programId,
      params,
    }: {
      programId: string;
      params?: ListAdminAcademyProgramEnrollmentsParams;
    }) => exportAdminAcademyProgramEnrollments(programId, params),
  });
}

export function useUpdateAdminAcademyProgramEnrollmentLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      enrollmentId,
      input,
    }: {
      enrollmentId: string;
      input: UpdateAcademyProgramEnrollmentLearnerInput;
    }) => updateAdminAcademyProgramEnrollmentLearner(enrollmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useUploadAdminAcademyProgramEnrollmentCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      enrollmentId,
      input,
    }: {
      enrollmentId: string;
      input: UploadAcademyProgramEnrollmentCertificateInput;
    }) => uploadAdminAcademyProgramEnrollmentCertificate(enrollmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useCancelAdminAcademyProgramEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enrollmentId: string) => cancelAdminAcademyProgramEnrollment(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useMarkCompletedAdminAcademyProgramEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enrollmentId: string) => markCompletedAdminAcademyProgramEnrollment(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useMarkCertifiedAdminAcademyProgramEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enrollmentId: string) => markCertifiedAdminAcademyProgramEnrollment(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}

export function useBulkAdminAcademyProgramEnrollments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      input,
    }: {
      programId: string;
      input: BulkAcademyProgramEnrollmentActionInput;
    }) => bulkAdminAcademyProgramEnrollments(programId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyProgramsQueryKeys.all });
    },
  });
}
