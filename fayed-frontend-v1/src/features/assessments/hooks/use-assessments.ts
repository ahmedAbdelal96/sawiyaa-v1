import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientJourneyQueryKeys } from "@/features/patient-journey/constants/query-keys";
import {
  getMyAssessmentSubmission,
  getMyAssessmentsHistory,
  submitAssessment,
} from "../api/assessments.api";
import { assessmentsQueryKeys } from "../constants/query-keys";
import type {
  PatientAssessmentsHistoryParams,
  SubmitAssessmentRequest,
} from "../types/assessments.types";

export function useSubmitAssessment(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitAssessmentRequest) => submitAssessment(slug, payload),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: assessmentsQueryKeys.history() });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKeys.all });
      queryClient.setQueryData(assessmentsQueryKeys.submission(submission.submissionId), {
        submissionId: submission.submissionId,
        assessment: submission.assessment,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        result: submission.result,
      });
    },
  });
}

export function usePatientAssessmentsHistory(
  params: PatientAssessmentsHistoryParams = {},
) {
  return useQuery({
    queryKey: assessmentsQueryKeys.historyList(params),
    queryFn: () => getMyAssessmentsHistory(params),
    staleTime: 60_000,
  });
}

export function usePatientAssessmentSubmission(submissionId: string | null) {
  return useQuery({
    queryKey: assessmentsQueryKeys.submission(submissionId ?? ""),
    queryFn: () => getMyAssessmentSubmission(submissionId!),
    enabled: Boolean(submissionId),
    staleTime: 60_000,
  });
}
