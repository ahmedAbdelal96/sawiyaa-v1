import { apiClient, extractApiData } from "../../../lib/api";
import type {
  AvailabilityWeekOverview,
  AvailabilityWeekMutationResponse,
  AvailabilityWeekSlot,
} from "./types";

export async function getMyAvailabilityWeeks() {
  const response = await apiClient.get("/practitioners/me/availability/weeks/current-next");
  return extractApiData<AvailabilityWeekOverview>(response);
}

export interface CreateAvailabilityWeekPayload {
  weekStartDate: string;
  timezone: string;
  slots?: Omit<AvailabilityWeekSlot, "id">[];
}

export async function createAvailabilityWeek(payload: CreateAvailabilityWeekPayload) {
  const response = await apiClient.post("/practitioners/me/availability/weeks", payload);
  return extractApiData<AvailabilityWeekMutationResponse>(response);
}

export interface UpdateAvailabilityWeekPayload {
  timezone?: string;
  slots?: Omit<AvailabilityWeekSlot, "id">[];
}

export async function updateAvailabilityWeek(
  weekId: string,
  payload: UpdateAvailabilityWeekPayload,
) {
  const response = await apiClient.patch(
    `/practitioners/me/availability/weeks/${weekId}`,
    payload,
  );
  return extractApiData<AvailabilityWeekMutationResponse>(response);
}

export async function copyAvailabilityWeekToNext(weekId: string) {
  const response = await apiClient.post(
    `/practitioners/me/availability/weeks/${weekId}/copy-to-next`,
    {},
  );
  return extractApiData<AvailabilityWeekMutationResponse>(response);
}

export async function publishAvailabilityWeek(weekId: string) {
  const response = await apiClient.post(
    `/practitioners/me/availability/weeks/${weekId}/publish`,
    {},
  );
  return extractApiData<AvailabilityWeekMutationResponse>(response);
}
