export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface OrganizationFilters {
  search?: string;
  status?: string;
}

export interface ContractFilters {
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;