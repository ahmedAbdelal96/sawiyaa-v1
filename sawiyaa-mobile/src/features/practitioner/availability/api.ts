import { apiClient, extractApiData } from "../../../lib/api";
import type {
  AvailabilityRollingWindowData, AvailabilityRepeatConfirmation, AvailabilityRepeatPreview,
  AvailabilityWeekDetailsData, AvailabilityWeekMutationData, AvailabilityWeekSlotInput, BookingSettings,
} from "./types";

export async function getMyAvailabilityWeeks() {
  const response = await apiClient.get("/practitioners/me/availability/weeks");
  return extractApiData<AvailabilityRollingWindowData>(response);
}

export async function getAvailabilityWeekDetails(weekId: string) {
  const response = await apiClient.get(`/practitioners/me/availability/weeks/${weekId}`);
  return extractApiData<AvailabilityWeekDetailsData>(response);
}

export interface CreateAvailabilityWeekPayload {
  weekStartDate: string;
  timezone: string;
  slots?: AvailabilityWeekSlotInput[];
}

export async function createAvailabilityWeek(payload: CreateAvailabilityWeekPayload) {
  const response = await apiClient.post("/practitioners/me/availability/weeks", payload);
  return extractApiData<AvailabilityWeekMutationData>(response);
}

export interface UpdateAvailabilityWeekPayload {
  timezone?: string;
  slots?: AvailabilityWeekSlotInput[];
}

export async function updateAvailabilityWeek(weekId: string, payload: UpdateAvailabilityWeekPayload) {
  const response = await apiClient.patch(`/practitioners/me/availability/weeks/${weekId}`, payload);
  return extractApiData<AvailabilityWeekMutationData>(response);
}

export async function publishAvailabilityWeek(weekId: string) {
  const response = await apiClient.post(`/practitioners/me/availability/weeks/${weekId}/publish`, {});
  return extractApiData<AvailabilityWeekMutationData>(response);
}

export async function previewAvailabilityWeekRepeat(sourceWeekId: string, targetWeekStartDates: string[], idempotencyKey: string) {
  const response = await apiClient.post(`/practitioners/me/availability/weeks/${sourceWeekId}/repeat/preview`, { targetWeekStartDates, idempotencyKey });
  return extractApiData<AvailabilityRepeatPreview>(response);
}

export async function confirmAvailabilityWeekRepeat(sourceWeekId: string, payload: { operationId: string; idempotencyKey: string }) {
  const response = await apiClient.post(`/practitioners/me/availability/weeks/${sourceWeekId}/repeat/confirm`, payload);
  return extractApiData<AvailabilityRepeatConfirmation>(response);
}

export async function getMyBookingSettings() {
  const response = await apiClient.get("/practitioners/me/booking-settings");
  return extractApiData<BookingSettings>(response);
}

export async function updateMyBookingSettings(acceptsNormalBookings: boolean) {
  const response = await apiClient.patch("/practitioners/me/booking-settings", { acceptsNormalBookings });
  return extractApiData<BookingSettings>(response);
}
