import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminAssessment,
  createAdminAssessmentOption,
  createAdminAssessmentQuestion,
  deleteAdminAssessmentOption,
  deleteAdminAssessmentQuestion,
  forkAdminAssessmentDraft,
  getAdminAssessmentDetails,
  listAdminAssessments,
  previewAdminAssessmentScore,
  publishAdminAssessment,
  reorderAdminAssessmentOptions,
  reorderAdminAssessmentQuestions,
  unpublishAdminAssessment,
  updateAdminAssessmentMetadata,
  updateAdminAssessmentOption,
  updateAdminAssessmentQuestion,
  updateAdminAssessmentScoringConfig,
} from "../api/admin-assessments.api";
import { adminAssessmentsQueryKeys } from "../constants/query-keys";
import type {
  AdminAssessmentsListParams,
  CreateAdminAssessmentInput,
  CreateAdminAssessmentOptionInput,
  CreateAdminAssessmentQuestionInput,
  PreviewAdminAssessmentScoreInput,
  ReorderAdminAssessmentOptionsInput,
  ReorderAdminAssessmentQuestionsInput,
  UpdateAdminAssessmentMetadataInput,
  UpdateAdminAssessmentOptionInput,
  UpdateAdminAssessmentQuestionInput,
  UpdateAdminAssessmentScoringConfigInput,
} from "../types/admin-assessments.types";

export function useAdminAssessmentsList(params: AdminAssessmentsListParams) {
  return useQuery({
    queryKey: adminAssessmentsQueryKeys.list(params),
    queryFn: () => listAdminAssessments(params),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminAssessmentDetails(id?: string) {
  return useQuery({
    queryKey: adminAssessmentsQueryKeys.details(id ?? ""),
    queryFn: () => getAdminAssessmentDetails(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useCreateAdminAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdminAssessmentInput) => createAdminAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminAssessmentsQueryKeys.all });
    },
  });
}

export function useUpdateAdminAssessmentMetadata() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminAssessmentMetadataInput }) =>
      updateAdminAssessmentMetadata(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: adminAssessmentsQueryKeys.all });
    },
  });
}

export function useForkAdminAssessmentDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forkAdminAssessmentDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminAssessmentsQueryKeys.all });
    },
  });
}

export function usePublishAdminAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishAdminAssessment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminAssessmentsQueryKeys.details(id) });
      queryClient.invalidateQueries({ queryKey: adminAssessmentsQueryKeys.all });
    },
  });
}

export function useUnpublishAdminAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unpublishAdminAssessment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminAssessmentsQueryKeys.details(id) });
      queryClient.invalidateQueries({ queryKey: adminAssessmentsQueryKeys.all });
    },
  });
}

export function useCreateAdminAssessmentQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      data,
    }: {
      assessmentId: string;
      data: CreateAdminAssessmentQuestionInput;
    }) => createAdminAssessmentQuestion(assessmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useUpdateAdminAssessmentQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      questionId,
      data,
    }: {
      assessmentId: string;
      questionId: string;
      data: UpdateAdminAssessmentQuestionInput;
    }) => updateAdminAssessmentQuestion(assessmentId, questionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useDeleteAdminAssessmentQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assessmentId, questionId }: { assessmentId: string; questionId: string }) =>
      deleteAdminAssessmentQuestion(assessmentId, questionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useReorderAdminAssessmentQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      data,
    }: {
      assessmentId: string;
      data: ReorderAdminAssessmentQuestionsInput;
    }) => reorderAdminAssessmentQuestions(assessmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useCreateAdminAssessmentOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      questionId,
      data,
    }: {
      assessmentId: string;
      questionId: string;
      data: CreateAdminAssessmentOptionInput;
    }) => createAdminAssessmentOption(assessmentId, questionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useUpdateAdminAssessmentOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      questionId,
      optionId,
      data,
    }: {
      assessmentId: string;
      questionId: string;
      optionId: string;
      data: UpdateAdminAssessmentOptionInput;
    }) => updateAdminAssessmentOption(assessmentId, questionId, optionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useDeleteAdminAssessmentOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      questionId,
      optionId,
    }: {
      assessmentId: string;
      questionId: string;
      optionId: string;
    }) => deleteAdminAssessmentOption(assessmentId, questionId, optionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useReorderAdminAssessmentOptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      questionId,
      data,
    }: {
      assessmentId: string;
      questionId: string;
      data: ReorderAdminAssessmentOptionsInput;
    }) => reorderAdminAssessmentOptions(assessmentId, questionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.assessmentId),
      });
    },
  });
}

export function useUpdateAdminAssessmentScoringConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminAssessmentScoringConfigInput }) =>
      updateAdminAssessmentScoringConfig(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminAssessmentsQueryKeys.details(variables.id),
      });
    },
  });
}

export function usePreviewAdminAssessmentScore() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PreviewAdminAssessmentScoreInput }) =>
      previewAdminAssessmentScore(id, data),
  });
}
