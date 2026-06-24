import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api";
import {
  AssessmentDefinitionResponse,
  AssessmentSubmissionResponse,
  AssessmentsHistoryParams,
  AssessmentsListResponse,
  PatientAssessmentSubmissionDetailsResponse,
  PatientAssessmentsHistoryResponse,
  SubmitAssessmentRequest,
} from "./types";

export async function fetchPublicAssessments() {
  const response = await apiClient.get<AssessmentsListResponse>("/assessments");
  return response.data;
}

export async function fetchAssessmentDefinition(slug: string) {
  const response = await apiClient.get<AssessmentDefinitionResponse>(
    `/assessments/${slug}`,
  );
  return response.data;
}

export async function fetchMyAssessmentsHistory(
  params: AssessmentsHistoryParams = {},
) {
  const response = await apiClient.get<PatientAssessmentsHistoryResponse>(
    "/patients/me/assessments",
    {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
      },
    },
  );
  return response.data;
}

export async function fetchMyAssessmentSubmission(submissionId: string) {
  const response =
    await apiClient.get<PatientAssessmentSubmissionDetailsResponse>(
      `/patients/me/assessments/${submissionId}`,
    );
  return response.data;
}

export async function submitAssessmentPayload(
  slug: string,
  payload: SubmitAssessmentRequest,
) {
  const response = await apiClient.post<AssessmentSubmissionResponse>(
    `/assessments/${slug}/submissions`,
    payload,
  );
  return response.data;
}

const assessmentQueryKeys = {
  list: ["patient-assessments", "list"] as const,
  detail: (slug: string | null) =>
    ["patient-assessments", "detail", slug] as const,
  history: (params?: AssessmentsHistoryParams) =>
    ["patient-assessments", "history", params ?? {}] as const,
  submission: (submissionId: string | null) =>
    ["patient-assessments", "submission", submissionId] as const,
};

export const useGetPublicAssessments = () => {
  return useQuery({
    queryKey: assessmentQueryKeys.list,
    queryFn: fetchPublicAssessments,
    staleTime: 60_000,
  });
};

export const useGetAssessmentDefinition = (slug: string | null) => {
  return useQuery({
    queryKey: assessmentQueryKeys.detail(slug),
    queryFn: () => fetchAssessmentDefinition(slug!),
    enabled: !!slug,
    staleTime: 60_000,
  });
};

export const useSubmitAssessment = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitAssessmentRequest) =>
      submitAssessmentPayload(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-assessments", "history"],
      });
    },
  });
};

export const useGetMyAssessmentsHistory = (
  params: AssessmentsHistoryParams = {},
) => {
  return useQuery({
    queryKey: assessmentQueryKeys.history(params),
    queryFn: () => fetchMyAssessmentsHistory(params),
    staleTime: 60_000,
  });
};

export const useGetMyAssessmentSubmission = (submissionId: string | null) => {
  return useQuery({
    queryKey: assessmentQueryKeys.submission(submissionId),
    queryFn: () => fetchMyAssessmentSubmission(submissionId!),
    enabled: !!submissionId,
    staleTime: 60_000,
  });
};
