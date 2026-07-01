import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AvailabilityWeek,
  AvailabilityWeekMutationData,
  AvailabilityWeekOverview,
} from "../types/availability.types";

/**
 * Reads the practitioner's current and next availability weeks.
 */
export async function getMyAvailabilityWeeks(): Promise<AvailabilityWeekOverview> {
  const response = await httpClient.get<ApiPayload<AvailabilityWeekOverview>>(
    "/practitioners/me/availability/weeks/current-next"
  );
  return extractData(response.data);
}

/**
 * Creates a new draft availability week.
 */
export async function createAvailabilityWeek(data: {
  weekStartDate: string;
  timezone: string;
  slots?: {
    dayOfWeek: number;
    durationMinutes: 30 | 60;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }[];
}): Promise<AvailabilityWeekMutationData> {
  const response = await httpClient.post<ApiPayload<AvailabilityWeekMutationData>>(
    "/practitioners/me/availability/weeks",
    data
  );
  return extractData(response.data);
}

/**
 * Updates an existing draft availability week.
 */
export async function updateAvailabilityWeek(data: {
  weekId: string;
  timezone?: string;
  slots?: {
    dayOfWeek: number;
    durationMinutes: 30 | 60;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }[];
}): Promise<AvailabilityWeekMutationData> {
  const { weekId, ...body } = data;
  const response = await httpClient.patch<ApiPayload<AvailabilityWeekMutationData>>(
    `/practitioners/me/availability/weeks/${weekId}`,
    body
  );
  return extractData(response.data);
}

/**
 * Copies a week into the next week as a draft.
 */
export async function copyAvailabilityWeekToNext(weekId: string): Promise<AvailabilityWeekMutationData> {
  const response = await httpClient.post<ApiPayload<AvailabilityWeekMutationData>>(
    `/practitioners/me/availability/weeks/${weekId}/copy-to-next`
  );
  return extractData(response.data);
}

/**
 * Publishes a draft availability week.
 */
export async function publishAvailabilityWeek(weekId: string): Promise<AvailabilityWeekMutationData> {
  const response = await httpClient.post<ApiPayload<AvailabilityWeekMutationData>>(
    `/practitioners/me/availability/weeks/${weekId}/publish`
  );
  return extractData(response.data);
}
