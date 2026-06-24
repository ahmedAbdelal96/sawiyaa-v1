import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AssessmentSubmissionResult,
  PatientAssessmentSubmissionDetails,
  PatientAssessmentsHistory,
  PatientAssessmentsHistoryParams,
  SubmitAssessmentRequest,
} from "../types/assessments.types";

export async function submitAssessment(
  slug: string,
  payload: SubmitAssessmentRequest,
): Promise<AssessmentSubmissionResult> {
  const response = await httpClient.post<ApiPayload<AssessmentSubmissionResult>>(
    `/assessments/${slug}/submissions`,
    payload,
  );
  return extractData(response.data);
}

export async function getMyAssessmentsHistory(
  params: PatientAssessmentsHistoryParams = {},
): Promise<PatientAssessmentsHistory> {
  const response = await httpClient.get<ApiPayload<PatientAssessmentsHistory>>(
    "/patients/me/assessments",
    {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
      },
    },
  );
  return extractData(response.data);
}

export async function getMyAssessmentSubmission(
  submissionId: string,
): Promise<PatientAssessmentSubmissionDetails> {
  const response = await httpClient.get<ApiPayload<PatientAssessmentSubmissionDetails>>(
    `/patients/me/assessments/${submissionId}`,
  );
  return extractData(response.data);
}
