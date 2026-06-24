import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminAssessmentDetailsResponseData,
  AdminAssessmentsListParams,
  AdminAssessmentsListResponseData,
  CreateAdminAssessmentInput,
  CreateAdminAssessmentOptionInput,
  CreateAdminAssessmentQuestionInput,
  PreviewAdminAssessmentScoreInput,
  PreviewAdminAssessmentScoreResponseData,
  ReorderAdminAssessmentOptionsInput,
  ReorderAdminAssessmentQuestionsInput,
  UpdateAdminAssessmentMetadataInput,
  UpdateAdminAssessmentOptionInput,
  UpdateAdminAssessmentQuestionInput,
  UpdateAdminAssessmentScoringConfigInput,
} from "../types/admin-assessments.types";

export async function listAdminAssessments(params: AdminAssessmentsListParams) {
  const response = await httpClient.get<ApiPayload<AdminAssessmentsListResponseData>>(
    "/admin/assessments",
    { params },
  );
  return extractData(response.data);
}

export async function getAdminAssessmentDetails(id: string) {
  const response = await httpClient.get<ApiPayload<AdminAssessmentDetailsResponseData>>(
    `/admin/assessments/${id}`,
  );
  return extractData(response.data);
}

export async function createAdminAssessment(data: CreateAdminAssessmentInput) {
  const response = await httpClient.post<ApiPayload<AdminAssessmentDetailsResponseData>>(
    "/admin/assessments",
    data,
  );
  return extractData(response.data);
}

export async function updateAdminAssessmentMetadata(
  id: string,
  data: UpdateAdminAssessmentMetadataInput,
) {
  const response = await httpClient.patch<ApiPayload<AdminAssessmentDetailsResponseData>>(
    `/admin/assessments/${id}`,
    data,
  );
  return extractData(response.data);
}

export async function forkAdminAssessmentDraft(id: string) {
  const response = await httpClient.post<ApiPayload<AdminAssessmentDetailsResponseData>>(
    `/admin/assessments/${id}/fork-draft`,
  );
  return extractData(response.data);
}

export async function publishAdminAssessment(id: string) {
  const response = await httpClient.post<ApiPayload<AdminAssessmentDetailsResponseData>>(
    `/admin/assessments/${id}/publish`,
  );
  return extractData(response.data);
}

export async function unpublishAdminAssessment(id: string) {
  const response = await httpClient.post<ApiPayload<AdminAssessmentDetailsResponseData>>(
    `/admin/assessments/${id}/unpublish`,
  );
  return extractData(response.data);
}

export async function createAdminAssessmentQuestion(
  assessmentId: string,
  data: CreateAdminAssessmentQuestionInput,
) {
  const response = await httpClient.post<ApiPayload<{ item: unknown }>>(
    `/admin/assessments/${assessmentId}/questions`,
    data,
  );
  return extractData(response.data);
}

export async function updateAdminAssessmentQuestion(
  assessmentId: string,
  questionId: string,
  data: UpdateAdminAssessmentQuestionInput,
) {
  const response = await httpClient.patch<ApiPayload<{ item: unknown }>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}`,
    data,
  );
  return extractData(response.data);
}

export async function deleteAdminAssessmentQuestion(
  assessmentId: string,
  questionId: string,
) {
  const response = await httpClient.delete<ApiPayload<{ deleted: boolean }>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}`,
  );
  return extractData(response.data);
}

export async function reorderAdminAssessmentQuestions(
  assessmentId: string,
  data: ReorderAdminAssessmentQuestionsInput,
) {
  const response = await httpClient.patch<ApiPayload<{ reordered: boolean }>>(
    `/admin/assessments/${assessmentId}/questions/reorder`,
    data,
  );
  return extractData(response.data);
}

export async function createAdminAssessmentOption(
  assessmentId: string,
  questionId: string,
  data: CreateAdminAssessmentOptionInput,
) {
  const response = await httpClient.post<ApiPayload<{ item: unknown }>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}/options`,
    data,
  );
  return extractData(response.data);
}

export async function updateAdminAssessmentOption(
  assessmentId: string,
  questionId: string,
  optionId: string,
  data: UpdateAdminAssessmentOptionInput,
) {
  const response = await httpClient.patch<ApiPayload<{ item: unknown }>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}/options/${optionId}`,
    data,
  );
  return extractData(response.data);
}

export async function deleteAdminAssessmentOption(
  assessmentId: string,
  questionId: string,
  optionId: string,
) {
  const response = await httpClient.delete<ApiPayload<{ deleted: boolean }>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}/options/${optionId}`,
  );
  return extractData(response.data);
}

export async function reorderAdminAssessmentOptions(
  assessmentId: string,
  questionId: string,
  data: ReorderAdminAssessmentOptionsInput,
) {
  const response = await httpClient.patch<ApiPayload<{ reordered: boolean }>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}/options/reorder`,
    data,
  );
  return extractData(response.data);
}

export async function updateAdminAssessmentScoringConfig(
  id: string,
  data: UpdateAdminAssessmentScoringConfigInput,
) {
  const response = await httpClient.patch<ApiPayload<AdminAssessmentDetailsResponseData>>(
    `/admin/assessments/${id}/scoring-config`,
    data,
  );
  return extractData(response.data);
}

export async function previewAdminAssessmentScore(
  id: string,
  data: PreviewAdminAssessmentScoreInput,
) {
  const response = await httpClient.post<ApiPayload<PreviewAdminAssessmentScoreResponseData>>(
    `/admin/assessments/${id}/preview-score`,
    data,
  );
  return extractData(response.data);
}
