import type { PaginatedResponse } from "./types";
import {
  isApiEnvelope,
  isPaginatedResponse,
  type ApiPayload,
  type PaginatedPayload,
} from "./contracts";

export function extractData<T>(payload: ApiPayload<T>): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }
  return payload;
}

export function extractPaginatedData<T>(
  payload: PaginatedPayload<T>
): PaginatedResponse<T> {
  const normalized = extractData<PaginatedResponse<T>>(payload);

  if (!isPaginatedResponse<T>(normalized)) {
    throw new Error("Invalid paginated API payload");
  }

  return normalized;
}
