import { apiClient, extractApiData } from "../../../lib/api";
import type { AcademyProgramEnrollmentItem, AcademyProgramEnrollmentResponse, AcademyProgramEnrollmentsListData, AcademyProgramItem, AcademyProgramResponse, AcademyProgramsListData, CreateAcademyProgramEnrollmentInput, ListAcademyProgramsParams } from "./types";

export async function getPublicAcademyPrograms(params?: ListAcademyProgramsParams): Promise<AcademyProgramsListData> {
  const response = await apiClient.get<{ success: boolean; data: AcademyProgramsListData }>("/academy/programs", { params });
  return extractApiData<AcademyProgramsListData>(response);
}
export async function getPublicAcademyProgramBySlug(slug: string): Promise<AcademyProgramItem> {
  const response = await apiClient.get<{ success: boolean; data: AcademyProgramResponse }>(`/academy/programs/${slug}`);
  return extractApiData<AcademyProgramResponse>(response).item;
}
export async function createPublicAcademyProgramEnrollment(slug: string, input: CreateAcademyProgramEnrollmentInput): Promise<AcademyProgramEnrollmentItem> {
  const response = await apiClient.post<{ success: boolean; data: AcademyProgramEnrollmentResponse }>(`/academy/programs/${slug}/enrollments`, input);
  return extractApiData<AcademyProgramEnrollmentResponse>(response).item;
}
export async function getPublicAcademyProgramEnrollment(enrollmentId: string, token: string): Promise<AcademyProgramEnrollmentItem> {
  const response = await apiClient.get<{ success: boolean; data: AcademyProgramEnrollmentResponse }>(`/academy/program-enrollments/${enrollmentId}`, { params: { token } });
  return extractApiData<AcademyProgramEnrollmentResponse>(response).item;
}

export async function getAuthenticatedAcademyProgramEnrollments(params?: { page?: number; limit?: number }): Promise<AcademyProgramEnrollmentsListData> {
  const response = await apiClient.get<{ success: boolean; data: AcademyProgramEnrollmentsListData }>("/patients/me/academy/program-enrollments", { params });
  return extractApiData<AcademyProgramEnrollmentsListData>(response);
}

export async function getAuthenticatedAcademyProgramEnrollment(enrollmentId: string) {
  const response = await apiClient.get<{ success: boolean; data: { item: AcademyProgramEnrollmentItem; attendance?: unknown } }>(`/patients/me/academy/program-enrollments/${enrollmentId}`);
  return extractApiData<{ item: AcademyProgramEnrollmentItem; attendance?: unknown }>(response);
}
