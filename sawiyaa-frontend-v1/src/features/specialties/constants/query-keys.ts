import type { ListSpecialtiesParams } from "../types/specialties.types";

/**
 * Stable query keys for specialties catalog and admin specialty management.
 */
export const specialtiesQueryKeys = {
  all: ["specialties"] as const,
  list: (params?: ListSpecialtiesParams) =>
    [...specialtiesQueryKeys.all, "list", params ?? {}] as const,
  adminList: (params?: ListSpecialtiesParams) =>
    [...specialtiesQueryKeys.all, "admin-list", params ?? {}] as const,
  adminCategories: (params?: ListSpecialtiesParams) =>
    [...specialtiesQueryKeys.all, "admin-categories", params ?? {}] as const,
  bySlug: (slug: string) => [...specialtiesQueryKeys.all, "slug", slug] as const,
  categories: () => [...specialtiesQueryKeys.all, "categories"] as const,
  adminAll: ["admin", "specialties"] as const,
};
