import type { ListPublicPractitionersFilters } from "./types";

export function toPublicPractitionerQueryParams(filters: ListPublicPractitionersFilters) {
  return {
    ...filters,
    languageCodes: filters.languageCodes?.join(",") || undefined,
  };
}
