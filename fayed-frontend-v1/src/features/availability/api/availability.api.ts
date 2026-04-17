import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
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
