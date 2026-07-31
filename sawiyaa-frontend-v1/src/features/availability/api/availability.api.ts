import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AvailabilityRepeatConfirmation,
  AvailabilityRepeatPreview,
  AvailabilityRollingWindowData,
  AvailabilityWeekDetailsData,
  AvailabilityWeekMutationData,
} from "../types/availability.types";

export async function getMyAvailabilityWeeks(): Promise<AvailabilityRollingWindowData> {
  const response = await httpClient.get<ApiPayload<AvailabilityRollingWindowData>>(
    "/practitioners/me/availability/weeks",
  );
  return extractData(response.data);
}

export async function getAvailabilityWeekDetails(weekId: string): Promise<AvailabilityWeekDetailsData> {
  const response = await httpClient.get<ApiPayload<AvailabilityWeekDetailsData>>(
    `/practitioners/me/availability/weeks/${weekId}`,
  );
  return extractData(response.data);
}

export async function createAvailabilityWeek(data: {
  weekStartDate: string;
  timezone: string;
  slots?: Array<{
    dayOfWeek: number;
    durationMinutes: 30 | 60;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }>;
}): Promise<AvailabilityWeekMutationData> {
  const response = await httpClient.post<ApiPayload<AvailabilityWeekMutationData>>(
    "/practitioners/me/availability/weeks",
    data,
  );
  return extractData(response.data);
}

export async function updateAvailabilityWeek(data: {
  weekId: string;
  timezone?: string;
  slots?: Array<{
    dayOfWeek: number;
    durationMinutes: 30 | 60;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }>;
}): Promise<AvailabilityWeekMutationData> {
  const { weekId, ...body } = data;
  const response = await httpClient.patch<ApiPayload<AvailabilityWeekMutationData>>(
    `/practitioners/me/availability/weeks/${weekId}`,
    body,
  );
  return extractData(response.data);
}

export async function publishAvailabilityWeek(weekId: string): Promise<AvailabilityWeekMutationData> {
  const response = await httpClient.post<ApiPayload<AvailabilityWeekMutationData>>(
    `/practitioners/me/availability/weeks/${weekId}/publish`,
  );
  return extractData(response.data);
}

export async function previewAvailabilityWeekRepeat(data: {
  sourceWeekId: string;
  targetWeekStartDates: string[];
  idempotencyKey: string;
}): Promise<AvailabilityRepeatPreview> {
  const response = await httpClient.post<ApiPayload<AvailabilityRepeatPreview>>(
    `/practitioners/me/availability/weeks/${data.sourceWeekId}/repeat/preview`,
    { targetWeekStartDates: data.targetWeekStartDates, idempotencyKey: data.idempotencyKey },
  );
  return extractData(response.data);
}

export async function confirmAvailabilityWeekRepeat(data: {
  sourceWeekId: string;
  operationId: string;
  idempotencyKey: string;
}): Promise<AvailabilityRepeatConfirmation> {
  const response = await httpClient.post<ApiPayload<AvailabilityRepeatConfirmation>>(
    `/practitioners/me/availability/weeks/${data.sourceWeekId}/repeat/confirm`,
    { operationId: data.operationId, idempotencyKey: data.idempotencyKey },
  );
  return extractData(response.data);
}
