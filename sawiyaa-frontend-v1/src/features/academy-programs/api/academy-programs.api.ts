import type { ApiPayload } from "@/lib/api/contracts";
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type {
  AcademyProgramItem,
  AcademyProgramEnrollmentItem,
  AcademyProgramEnrollmentDetailResponse,
  AcademyProgramEnrollmentResponse,
  AcademyProgramEnrollmentsListData,
  AcademyProgramCoverUploadResponse,
  AcademyProgramResponse,
  AcademyProgramsListData,
  CreateAcademyProgramInput,
  CreateAcademyProgramSessionInput,
  ListAdminAcademyProgramsParams,
  ListPublicAcademyProgramsParams,
  ListPatientAcademyProgramEnrollmentsParams,
  ListAdminAcademyProgramEnrollmentsParams,
  BulkAcademyProgramEnrollmentActionInput,
  AcademyProgramAttendanceResponse,
  ListAdminAcademyProgramAttendanceParams,
  SaveAdminAcademyProgramAttendanceInput,
  UpdateAcademyProgramEnrollmentLearnerInput,
  UploadAcademyProgramEnrollmentCertificateInput,
  UpdateAcademyProgramInput,
  UpdateAcademyProgramSessionInput,
  CreateAcademyProgramEnrollmentInput,
  CreateAdminAcademyProgramEnrollmentInput,
} from "../types/academy-programs.types";

export async function getPublicAcademyPrograms(
  params?: ListPublicAcademyProgramsParams,
): Promise<AcademyProgramsListData> {
  const response = await httpClient.get<ApiPayload<AcademyProgramsListData>>(
    "/academy/programs",
    { params },
  );
  return extractData(response.data);
}

export async function getPublicAcademyProgram(
  slug: string,
): Promise<AcademyProgramItem> {
  const response = await httpClient.get<ApiPayload<AcademyProgramResponse>>(
    `/academy/programs/${slug}`,
  );
  return extractData(response.data).item;
}

export async function createPublicAcademyProgramEnrollment(
  slug: string,
  input: CreateAcademyProgramEnrollmentInput,
): Promise<AcademyProgramEnrollmentItem> {
  const response = await httpClient.post<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/academy/programs/${slug}/enrollments`,
    input,
  );
  return extractData(response.data).item;
}

export async function getPublicAcademyProgramEnrollment(
  enrollmentId: string,
  token: string,
): Promise<AcademyProgramEnrollmentItem> {
  const response = await httpClient.get<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/academy/program-enrollments/${enrollmentId}`,
    { params: { token } },
  );
  return extractData(response.data).item;
}

export async function getPatientAcademyProgramEnrollments(
  params?: ListPatientAcademyProgramEnrollmentsParams,
): Promise<AcademyProgramEnrollmentsListData> {
  const response = await httpClient.get<ApiPayload<AcademyProgramEnrollmentsListData>>(
    "/patients/me/academy/program-enrollments",
    { params },
  );
  return extractData(response.data);
}

export async function getPatientAcademyProgramEnrollment(
  enrollmentId: string,
): Promise<AcademyProgramEnrollmentDetailResponse> {
  const response = await httpClient.get<ApiPayload<AcademyProgramEnrollmentDetailResponse>>(
    `/patients/me/academy/program-enrollments/${enrollmentId}`,
  );
  return extractData(response.data);
}

export async function getAdminAcademyPrograms(
  params?: ListAdminAcademyProgramsParams,
): Promise<AcademyProgramsListData> {
  const response = await httpClient.get<ApiPayload<AcademyProgramsListData>>(
    "/admin/academy/programs",
    { params },
  );
  return extractData(response.data);
}

export async function getAdminAcademyProgram(
  programId: string,
): Promise<AcademyProgramItem> {
  const response = await httpClient.get<ApiPayload<AcademyProgramResponse>>(
    `/admin/academy/programs/${programId}`,
  );
  return extractData(response.data).item;
}

export async function getAdminAcademyProgramAttendance(
  programId: string,
  params?: ListAdminAcademyProgramAttendanceParams,
): Promise<AcademyProgramAttendanceResponse> {
  const response = await httpClient.get<ApiPayload<AcademyProgramAttendanceResponse>>(
    `/admin/academy/programs/${programId}/attendance`,
    { params },
  );
  return extractData(response.data);
}

export async function createAdminAcademyProgram(
  input: CreateAcademyProgramInput,
): Promise<AcademyProgramItem> {
  const response = await httpClient.post<ApiPayload<AcademyProgramResponse>>(
    "/admin/academy/programs",
    input,
  );
  return extractData(response.data).item;
}

export async function uploadAdminAcademyProgramCover(
  file: File,
): Promise<AcademyProgramCoverUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await httpClient.post<ApiPayload<AcademyProgramCoverUploadResponse>>(
    "/admin/academy/programs/cover-upload",
    formData,
  );
  return extractData(response.data);
}

export async function updateAdminAcademyProgram(
  programId: string,
  input: UpdateAcademyProgramInput,
): Promise<AcademyProgramItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramResponse>>(
    `/admin/academy/programs/${programId}`,
    input,
  );
  return extractData(response.data).item;
}

export async function publishAdminAcademyProgram(
  programId: string,
): Promise<AcademyProgramItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramResponse>>(
    `/admin/academy/programs/${programId}/publish`,
  );
  return extractData(response.data).item;
}

export async function archiveAdminAcademyProgram(
  programId: string,
  input: { reason: string },
): Promise<AcademyProgramItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramResponse>>(
    `/admin/academy/programs/${programId}/archive`,
    input,
  );
  return extractData(response.data).item;
}

export async function createAdminAcademyProgramSession(
  programId: string,
  input: CreateAcademyProgramSessionInput,
): Promise<AcademyProgramItem> {
  const response = await httpClient.post<ApiPayload<AcademyProgramResponse>>(
    `/admin/academy/programs/${programId}/sessions`,
    input,
  );
  return extractData(response.data).item;
}

export async function updateAdminAcademyProgramSession(
  programId: string,
  sessionId: string,
  input: UpdateAcademyProgramSessionInput,
): Promise<AcademyProgramItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramResponse>>(
    `/admin/academy/programs/${programId}/sessions/${sessionId}`,
    input,
  );
  return extractData(response.data).item;
}

export async function saveAdminAcademyProgramAttendance(
  programId: string,
  input: SaveAdminAcademyProgramAttendanceInput,
): Promise<AcademyProgramAttendanceResponse> {
  const response = await httpClient.put<ApiPayload<AcademyProgramAttendanceResponse>>(
    `/admin/academy/programs/${programId}/attendance`,
    input,
  );
  return extractData(response.data);
}

export async function getAdminAcademyProgramEnrollments(
  programId: string,
  params?: ListAdminAcademyProgramEnrollmentsParams,
): Promise<AcademyProgramEnrollmentsListData> {
  const response = await httpClient.get<ApiPayload<AcademyProgramEnrollmentsListData>>(
    `/admin/academy/programs/${programId}/enrollments`,
    { params },
  );
  return extractData(response.data);
}

export async function createAdminAcademyProgramEnrollment(
  programId: string,
  input: CreateAdminAcademyProgramEnrollmentInput,
): Promise<AcademyProgramEnrollmentItem> {
  const response = await httpClient.post<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/admin/academy/programs/${programId}/enrollments/manual`,
    input,
  );
  return extractData(response.data).item;
}

export async function exportAdminAcademyProgramEnrollments(
  programId: string,
  params?: ListAdminAcademyProgramEnrollmentsParams,
): Promise<AcademyProgramEnrollmentItem[]> {
  const response = await httpClient.get<ApiPayload<{ items: AcademyProgramEnrollmentItem[] }>>(
    `/admin/academy/programs/${programId}/enrollments/export`,
    { params },
  );
  return extractData(response.data).items;
}

export async function updateAdminAcademyProgramEnrollmentLearner(
  enrollmentId: string,
  input: UpdateAcademyProgramEnrollmentLearnerInput,
): Promise<AcademyProgramEnrollmentItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/admin/academy/program-enrollments/${enrollmentId}/learner`,
    input,
  );
  return extractData(response.data).item;
}

export async function uploadAdminAcademyProgramEnrollmentCertificate(
  enrollmentId: string,
  input: UploadAcademyProgramEnrollmentCertificateInput,
): Promise<AcademyProgramEnrollmentItem> {
  const formData = new FormData();
  formData.append("file", input.file);

  const response = await httpClient.post<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/admin/academy/program-enrollments/${enrollmentId}/certificate`,
    formData,
  );
  return extractData(response.data).item;
}

export async function cancelAdminAcademyProgramEnrollment(
  enrollmentId: string,
  input: { reason: string },
): Promise<AcademyProgramEnrollmentItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/admin/academy/program-enrollments/${enrollmentId}/cancel`,
    input,
  );
  return extractData(response.data).item;
}

export async function markCompletedAdminAcademyProgramEnrollment(
  enrollmentId: string,
): Promise<AcademyProgramEnrollmentItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/admin/academy/program-enrollments/${enrollmentId}/complete`,
  );
  return extractData(response.data).item;
}

export async function markCertifiedAdminAcademyProgramEnrollment(
  enrollmentId: string,
): Promise<AcademyProgramEnrollmentItem> {
  const response = await httpClient.patch<ApiPayload<AcademyProgramEnrollmentResponse>>(
    `/admin/academy/program-enrollments/${enrollmentId}/certify`,
  );
  return extractData(response.data).item;
}

export async function bulkAdminAcademyProgramEnrollments(
  programId: string,
  input: BulkAcademyProgramEnrollmentActionInput,
): Promise<AcademyProgramEnrollmentItem[]> {
  const response = await httpClient.post<ApiPayload<{ items: AcademyProgramEnrollmentItem[] }>>(
    `/admin/academy/programs/${programId}/enrollments/bulk`,
    input,
  );
  return extractData(response.data).items;
}
