import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AcademyCourseItem,
  AcademyCourseLectureItem,
  AcademyCourseResponse,
  AcademyCoursesListData,
  AcademyEnrollmentItem,
  AcademyEnrollmentResponse,
  AcademyEnrollmentsListData,
  CreateAcademyCourseInput,
  CreateAcademyCourseLectureInput,
  CreateAcademyEnrollmentInput,
  ListAcademyCoursesParams,
  ListAdminAcademyCoursesParams,
  ListAdminAcademyEnrollmentsParams,
  UpdateAcademyCourseInput,
} from "../types/academy.types";

export async function getPublicAcademyCourses(
  params?: ListAcademyCoursesParams,
): Promise<AcademyCoursesListData> {
  const response = await httpClient.get<ApiPayload<AcademyCoursesListData>>(
    "/academy/courses",
    { params },
  );
  return extractData(response.data);
}

export async function getPublicAcademyCourseBySlug(
  slug: string,
): Promise<AcademyCourseItem> {
  const response = await httpClient.get<ApiPayload<AcademyCourseResponse>>(
    `/academy/courses/${slug}`,
  );
  return extractData(response.data).item;
}

export async function createPublicAcademyEnrollment(
  slug: string,
  input: CreateAcademyEnrollmentInput,
): Promise<AcademyEnrollmentItem> {
  const response = await httpClient.post<ApiPayload<AcademyEnrollmentResponse>>(
    `/academy/courses/${slug}/enrollments`,
    input,
  );
  return extractData(response.data).item;
}

export async function getPublicAcademyEnrollment(
  enrollmentId: string,
  token: string,
): Promise<AcademyEnrollmentItem> {
  const response = await httpClient.get<ApiPayload<AcademyEnrollmentResponse>>(
    `/academy/enrollments/${enrollmentId}`,
    { params: { token } },
  );
  return extractData(response.data).item;
}

export async function getAdminAcademyCourses(
  params?: ListAdminAcademyCoursesParams,
): Promise<AcademyCoursesListData> {
  const response = await httpClient.get<ApiPayload<AcademyCoursesListData>>(
    "/admin/academy/courses",
    { params },
  );
  return extractData(response.data);
}

export async function getAdminAcademyCourse(
  courseId: string,
): Promise<AcademyCourseItem & { enrollments: AcademyEnrollmentItem[] }> {
  const response = await httpClient.get<
    ApiPayload<{
      item: AcademyCourseItem;
      enrollments: AcademyEnrollmentItem[];
    }>
  >(`/admin/academy/courses/${courseId}`);
  const data = extractData(response.data);
  return { ...data.item, enrollments: data.enrollments };
}

export async function createAdminAcademyCourseLecture(
  courseId: string,
  input: CreateAcademyCourseLectureInput,
): Promise<AcademyCourseLectureItem> {
  const response = await httpClient.post<ApiPayload<{ item: AcademyCourseLectureItem }>>(
    `/admin/academy/courses/${courseId}/lectures`,
    input,
  );
  return extractData(response.data).item;
}

export async function getAdminAcademyEnrollments(
  params?: ListAdminAcademyEnrollmentsParams,
): Promise<AcademyEnrollmentsListData> {
  const response = await httpClient.get<ApiPayload<AcademyEnrollmentsListData>>(
    "/admin/academy/enrollments",
    { params },
  );
  return extractData(response.data);
}

export async function createAdminAcademyCourse(
  input: CreateAcademyCourseInput,
): Promise<AcademyCourseItem> {
  const response = await httpClient.post<ApiPayload<AcademyCourseResponse>>(
    "/admin/academy/courses",
    input,
  );
  return extractData(response.data).item;
}

export async function updateAdminAcademyCourse(
  courseId: string,
  input: UpdateAcademyCourseInput,
): Promise<AcademyCourseItem> {
  const response = await httpClient.patch<ApiPayload<AcademyCourseResponse>>(
    `/admin/academy/courses/${courseId}`,
    input,
  );
  return extractData(response.data).item;
}

export async function publishAdminAcademyCourse(
  courseId: string,
): Promise<AcademyCourseItem> {
  const response = await httpClient.patch<ApiPayload<AcademyCourseResponse>>(
    `/admin/academy/courses/${courseId}/publish`,
  );
  return extractData(response.data).item;
}

export async function archiveAdminAcademyCourse(
  courseId: string,
): Promise<AcademyCourseItem> {
  const response = await httpClient.patch<ApiPayload<AcademyCourseResponse>>(
    `/admin/academy/courses/${courseId}/archive`,
  );
  return extractData(response.data).item;
}
