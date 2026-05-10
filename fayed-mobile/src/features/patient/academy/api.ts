import { apiClient, extractApiData } from "../../../lib/api";
import type {
  AcademyCourseItem,
  AcademyCourseResponse,
  AcademyCoursesListData,
  AcademyEnrollmentItem,
  AcademyEnrollmentResponse,
  CreateAcademyEnrollmentInput,
  ListAcademyCoursesParams,
} from "./types";

export async function getPublicAcademyCourses(
  params?: ListAcademyCoursesParams,
): Promise<AcademyCoursesListData> {
  const response = await apiClient.get<{
    success: boolean;
    data: AcademyCoursesListData;
  }>("/academy/courses", {
    params,
  });
  return extractApiData<AcademyCoursesListData>(response);
}

export async function getPublicAcademyCourseBySlug(
  slug: string,
): Promise<AcademyCourseItem> {
  const response = await apiClient.get<{
    success: boolean;
    data: AcademyCourseResponse;
  }>(`/academy/courses/${slug}`);
  return extractApiData<AcademyCourseResponse>(response).item;
}

export async function createPublicAcademyEnrollment(
  slug: string,
  input: CreateAcademyEnrollmentInput,
): Promise<AcademyEnrollmentItem> {
  const response = await apiClient.post<{
    success: boolean;
    data: AcademyEnrollmentResponse;
  }>(`/academy/courses/${slug}/enrollments`, input);
  return extractApiData<AcademyEnrollmentResponse>(response).item;
}

export async function getPublicAcademyEnrollment(
  enrollmentId: string,
  token: string,
): Promise<AcademyEnrollmentItem> {
  const response = await apiClient.get<{
    success: boolean;
    data: AcademyEnrollmentResponse;
  }>(`/academy/enrollments/${enrollmentId}`, {
    params: { token },
  });
  return extractApiData<AcademyEnrollmentResponse>(response).item;
}
