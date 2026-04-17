import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminTrainingsListData,
  AdminTrainingItem,
  AdminTrainingItemResponse,
  AdminTrainingSchedule,
  AdminTrainingScheduleItemResponse,
  AdminTrainingScheduleListData,
  CreateAdminTrainingInput,
  CreateAdminTrainingScheduleInput,
  CreateTrainingEnrollmentInput,
  ListAdminTrainingsParams,
  ListPatientTrainingEnrollmentsParams,
  PatientTrainingEnrollmentItem,
  PatientTrainingEnrollmentItemResponse,
  PatientTrainingEnrollmentsListData,
  PatientTrainingJoinAccessItem,
  PatientTrainingJoinAccessItemResponse,
  UpdateAdminTrainingInput,
  UpdateAdminTrainingScheduleInput,
} from "../types/training.types";

export async function getPatientTrainingEnrollments(
  params?: ListPatientTrainingEnrollmentsParams,
): Promise<PatientTrainingEnrollmentsListData> {
  const response = await httpClient.get<ApiPayload<PatientTrainingEnrollmentsListData>>(
    "/patients/me/training/enrollments",
    { params },
  );
  return extractData(response.data);
}

export async function getPatientTrainingEnrollment(
  enrollmentId: string,
): Promise<PatientTrainingEnrollmentItem> {
  const response = await httpClient.get<ApiPayload<PatientTrainingEnrollmentItemResponse>>(
    `/patients/me/training/enrollments/${enrollmentId}`,
  );
  return extractData(response.data).item;
}

export async function createPatientTrainingEnrollment(
  scheduleId: string,
  input: CreateTrainingEnrollmentInput = {},
): Promise<PatientTrainingEnrollmentItemResponse> {
  const response = await httpClient.post<ApiPayload<PatientTrainingEnrollmentItemResponse>>(
    `/patients/me/training/schedules/${scheduleId}/enrollments`,
    input,
  );
  return extractData(response.data);
}

export async function resolvePatientTrainingJoinAccess(
  enrollmentId: string,
): Promise<PatientTrainingJoinAccessItem> {
  const response = await httpClient.get<ApiPayload<PatientTrainingJoinAccessItemResponse>>(
    `/patients/me/training/enrollments/${enrollmentId}/join-access`,
  );
  return extractData(response.data).item;
}

export async function getAdminTrainings(
  params?: ListAdminTrainingsParams,
): Promise<AdminTrainingsListData> {
  const response = await httpClient.get<ApiPayload<AdminTrainingsListData>>(
    "/admin/trainings",
    { params },
  );
  return extractData(response.data);
}

export async function getAdminTraining(
  trainingId: string,
  locale?: string,
): Promise<AdminTrainingItem> {
  const response = await httpClient.get<ApiPayload<AdminTrainingItemResponse>>(
    `/admin/trainings/${trainingId}`,
    { params: locale ? { locale } : undefined },
  );
  return extractData(response.data).item;
}

export async function createAdminTraining(
  input: CreateAdminTrainingInput,
): Promise<AdminTrainingItem> {
  const response = await httpClient.post<ApiPayload<AdminTrainingItemResponse>>(
    "/admin/trainings",
    input,
  );
  return extractData(response.data).item;
}

export async function updateAdminTraining(
  trainingId: string,
  input: UpdateAdminTrainingInput,
): Promise<AdminTrainingItem> {
  const response = await httpClient.patch<ApiPayload<AdminTrainingItemResponse>>(
    `/admin/trainings/${trainingId}`,
    input,
  );
  return extractData(response.data).item;
}

export async function publishAdminTraining(
  trainingId: string,
  locale?: string,
): Promise<AdminTrainingItem> {
  const response = await httpClient.patch<ApiPayload<AdminTrainingItemResponse>>(
    `/admin/trainings/${trainingId}/publish`,
    null,
    { params: locale ? { locale } : undefined },
  );
  return extractData(response.data).item;
}

export async function archiveAdminTraining(
  trainingId: string,
  locale?: string,
): Promise<AdminTrainingItem> {
  const response = await httpClient.patch<ApiPayload<AdminTrainingItemResponse>>(
    `/admin/trainings/${trainingId}/archive`,
    null,
    { params: locale ? { locale } : undefined },
  );
  return extractData(response.data).item;
}

export async function getAdminTrainingSchedules(
  trainingId: string,
): Promise<AdminTrainingScheduleListData> {
  const response = await httpClient.get<ApiPayload<AdminTrainingScheduleListData>>(
    `/admin/trainings/${trainingId}/schedules`,
  );
  return extractData(response.data);
}

export async function createAdminTrainingSchedule(
  trainingId: string,
  input: CreateAdminTrainingScheduleInput,
): Promise<AdminTrainingSchedule> {
  const response = await httpClient.post<ApiPayload<AdminTrainingScheduleItemResponse>>(
    `/admin/trainings/${trainingId}/schedules`,
    input,
  );
  return extractData(response.data).item;
}

export async function updateAdminTrainingSchedule(
  trainingId: string,
  scheduleId: string,
  input: UpdateAdminTrainingScheduleInput,
): Promise<AdminTrainingSchedule> {
  const response = await httpClient.patch<ApiPayload<AdminTrainingScheduleItemResponse>>(
    `/admin/trainings/${trainingId}/schedules/${scheduleId}`,
    input,
  );
  return extractData(response.data).item;
}
