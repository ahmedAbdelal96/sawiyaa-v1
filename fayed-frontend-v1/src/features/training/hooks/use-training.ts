"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminTraining,
  createAdminTraining,
  createAdminTrainingSchedule,
  createPatientTrainingEnrollment,
  getAdminTraining,
  getAdminTrainingSchedules,
  getAdminTrainings,
  getPatientTrainingEnrollment,
  getPatientTrainingEnrollments,
  publishAdminTraining,
  resolvePatientTrainingJoinAccess,
  updateAdminTraining,
  updateAdminTrainingSchedule,
} from "../api/training.api";
import type {
  CreateAdminTrainingInput,
  CreateAdminTrainingScheduleInput,
  CreateTrainingEnrollmentInput,
  ListAdminTrainingsParams,
  ListPatientTrainingEnrollmentsParams,
  UpdateAdminTrainingInput,
  UpdateAdminTrainingScheduleInput,
} from "../types/training.types";

export const trainingQueryKeys = {
  all: ["training"] as const,
  patientEnrollments: (params?: ListPatientTrainingEnrollmentsParams) =>
    [...trainingQueryKeys.all, "patient-enrollments", params ?? {}] as const,
  patientEnrollment: (enrollmentId: string) =>
    [...trainingQueryKeys.all, "patient-enrollment", enrollmentId] as const,
  adminTrainings: (params?: ListAdminTrainingsParams) =>
    [...trainingQueryKeys.all, "admin-trainings", params ?? {}] as const,
  adminTraining: (trainingId: string, locale?: string) =>
    [...trainingQueryKeys.all, "admin-training", trainingId, locale ?? ""] as const,
  adminTrainingSchedules: (trainingId: string) =>
    [...trainingQueryKeys.all, "admin-training-schedules", trainingId] as const,
};

export function usePatientTrainingEnrollments(
  params?: ListPatientTrainingEnrollmentsParams,
) {
  return useQuery({
    queryKey: trainingQueryKeys.patientEnrollments(params),
    queryFn: () => getPatientTrainingEnrollments(params),
    staleTime: 30_000,
  });
}

export function usePatientTrainingEnrollment(enrollmentId: string | null) {
  return useQuery({
    queryKey: trainingQueryKeys.patientEnrollment(enrollmentId ?? ""),
    queryFn: () => getPatientTrainingEnrollment(enrollmentId!),
    enabled: Boolean(enrollmentId),
    staleTime: 30_000,
  });
}

export function useCreatePatientTrainingEnrollment() {
  return useMutation({
    mutationFn: ({
      scheduleId,
      input,
    }: {
      scheduleId: string;
      input?: CreateTrainingEnrollmentInput;
    }) => createPatientTrainingEnrollment(scheduleId, input),
  });
}

export function useResolvePatientTrainingJoinAccess() {
  return useMutation({
    mutationFn: (enrollmentId: string) => resolvePatientTrainingJoinAccess(enrollmentId),
  });
}

export function useAdminTrainings(params?: ListAdminTrainingsParams) {
  return useQuery({
    queryKey: trainingQueryKeys.adminTrainings(params),
    queryFn: () => getAdminTrainings(params),
    staleTime: 30_000,
  });
}

export function useAdminTraining(trainingId: string | null, locale?: string) {
  return useQuery({
    queryKey: trainingQueryKeys.adminTraining(trainingId ?? "", locale),
    queryFn: () => getAdminTraining(trainingId!, locale),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });
}

export function useAdminTrainingSchedules(trainingId: string | null) {
  return useQuery({
    queryKey: trainingQueryKeys.adminTrainingSchedules(trainingId ?? ""),
    queryFn: () => getAdminTrainingSchedules(trainingId!),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });
}

export function useCreateAdminTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAdminTrainingInput) => createAdminTraining(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingQueryKeys.adminTrainings() });
    },
  });
}

export function useUpdateAdminTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trainingId,
      input,
    }: {
      trainingId: string;
      input: UpdateAdminTrainingInput;
    }) => updateAdminTraining(trainingId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingQueryKeys.adminTraining(variables.trainingId),
      });
      queryClient.invalidateQueries({ queryKey: trainingQueryKeys.adminTrainings() });
    },
  });
}

export function usePublishAdminTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trainingId, locale }: { trainingId: string; locale?: string }) =>
      publishAdminTraining(trainingId, locale),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingQueryKeys.adminTraining(variables.trainingId, variables.locale),
      });
      queryClient.invalidateQueries({ queryKey: trainingQueryKeys.adminTrainings() });
    },
  });
}

export function useArchiveAdminTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trainingId, locale }: { trainingId: string; locale?: string }) =>
      archiveAdminTraining(trainingId, locale),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingQueryKeys.adminTraining(variables.trainingId, variables.locale),
      });
      queryClient.invalidateQueries({ queryKey: trainingQueryKeys.adminTrainings() });
    },
  });
}

export function useCreateAdminTrainingSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trainingId,
      input,
    }: {
      trainingId: string;
      input: CreateAdminTrainingScheduleInput;
    }) => createAdminTrainingSchedule(trainingId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingQueryKeys.adminTrainingSchedules(variables.trainingId),
      });
      queryClient.invalidateQueries({
        queryKey: trainingQueryKeys.adminTraining(variables.trainingId),
      });
    },
  });
}

export function useUpdateAdminTrainingSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trainingId,
      scheduleId,
      input,
    }: {
      trainingId: string;
      scheduleId: string;
      input: UpdateAdminTrainingScheduleInput;
    }) => updateAdminTrainingSchedule(trainingId, scheduleId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingQueryKeys.adminTrainingSchedules(variables.trainingId),
      });
    },
  });
}
