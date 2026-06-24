import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AvailabilityWeek,
  AvailabilityWeekMutationData,
  AvailabilityWeekOverview,
  CreateAvailabilityExceptionInput,
  MyAvailabilityData,
  ReplaceWeeklyAvailabilityInput,
} from "../types/availability.types";

/**
 * Reads the practitioner's current weekly schedule + exceptions.
 * Always returns a response; no 404 when schedule is empty.
 */
export async function getMyAvailability(): Promise<MyAvailabilityData> {
  const response = await httpClient.get<ApiPayload<MyAvailabilityData>>(
    "/practitioners/me/availability"
  );
  return extractData(response.data);
}

/**
 * Full-state replacement of the weekly recurring schedule.
 * Overwrites all existing active slots deterministically.
 */
export async function replaceWeeklyAvailability(
  data: ReplaceWeeklyAvailabilityInput
): Promise<MyAvailabilityData> {
  const response = await httpClient.put<ApiPayload<MyAvailabilityData>>(
    "/practitioners/me/availability/weekly-slots",
    data
  );
  return extractData(response.data);
}

/**
 * Creates a temporary override window (BLOCK or OPEN_EXTRA).
 */
export async function createAvailabilityException(
  data: CreateAvailabilityExceptionInput
): Promise<MyAvailabilityData> {
  const response = await httpClient.post<ApiPayload<MyAvailabilityData>>(
    "/practitioners/me/availability/exceptions",
    data
  );
  return extractData(response.data);
}

/**
 * Soft-deletes (deactivates) a single availability exception by ID.
 */
export async function deleteAvailabilityException(
  id: string
): Promise<MyAvailabilityData> {
  const response = await httpClient.delete<ApiPayload<MyAvailabilityData>>(
    `/practitioners/me/availability/exceptions/${id}`
  );
  return extractData(response.data);
}

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
