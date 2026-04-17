export type SortOrder = "asc" | "desc";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams {
  search?: string;
}

export interface DateRangeParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface SortingParams {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export type ListQueryParams = PaginationParams &
  SearchParams &
  DateRangeParams &
  SortingParams &
  Record<string, unknown>;

// Normalizes common list query params to reduce duplicated defensive code.
export function normalizeListQueryParams<T extends ListQueryParams>(
  params?: T
): T | undefined {
  if (!params) return undefined;

  const normalized = { ...params };

  if (typeof normalized.page === "number" && normalized.page < 1) {
    normalized.page = 1;
  }

  if (typeof normalized.limit === "number") {
    // Keep limits bounded to protect API and UX performance.
    if (normalized.limit < 1) normalized.limit = 1;
    if (normalized.limit > 100) normalized.limit = 100;
  }

  if (typeof normalized.search === "string") {
    normalized.search = normalized.search.trim();
  }

  return normalized;
}

