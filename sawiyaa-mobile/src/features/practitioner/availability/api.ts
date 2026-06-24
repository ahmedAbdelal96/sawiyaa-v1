import { apiClient } from "../../../lib/api";
import type {
  AvailabilityData,
  CreateAvailabilityExceptionInput,
  ReplaceWeeklyAvailabilityInput,
  UpdateAvailabilityExceptionInput,
} from "./types";

export async function getMyAvailability() {
  const response = await apiClient.get<{
    success: true;
    data: AvailabilityData;
  }>("/practitioners/me/availability");
  return response.data.data;
}

export async function replaceWeeklyAvailability(
  payload: ReplaceWeeklyAvailabilityInput,
) {
  const response = await apiClient.put<{
    success: true;
    data: AvailabilityData;
  }>("/practitioners/me/availability/weekly-slots", payload);
  return response.data.data;
}

export async function createAvailabilityException(
  payload: CreateAvailabilityExceptionInput,
) {
  const response = await apiClient.post<{
    success: true;
    data: AvailabilityData;
  }>("/practitioners/me/availability/exceptions", payload);
  return response.data.data;
}

export async function updateAvailabilityException(
  exceptionId: string,
  payload: UpdateAvailabilityExceptionInput,
) {
  const response = await apiClient.patch<{
    success: true;
    data: AvailabilityData;
  }>(`/practitioners/me/availability/exceptions/${exceptionId}`, payload);
  return response.data.data;
}

export async function deleteAvailabilityException(exceptionId: string) {
  const response = await apiClient.delete<{
    success: true;
    data: AvailabilityData;
  }>(`/practitioners/me/availability/exceptions/${exceptionId}`);
  return response.data.data;
}
