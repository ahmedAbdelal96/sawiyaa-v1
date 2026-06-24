import type { PaginatedResponse } from "./types";

export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export type ApiPayload<T> = T | ApiEnvelope<T>;

export interface ApiMessageResponse {
  success?: boolean;
  message: string;
}

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type PaginatedPayload<T> =
  | PaginatedResponse<T>
  | ApiEnvelope<PaginatedResponse<T>>;

export function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "data" in (value as Record<string, unknown>)
  );
}

export function isPaginatedResponse<T>(
  value: unknown
): value is PaginatedResponse<T> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return Array.isArray(candidate.data) && typeof candidate.meta === "object";
}
