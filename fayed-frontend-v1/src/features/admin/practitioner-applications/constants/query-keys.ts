import type { ListPractitionerApplicationsParams } from "../types/practitioner-applications.types";

/**
 * Stable query keys for admin practitioner-application review surfaces.
 */
export const adminPractitionerApplicationsQueryKeys = {
  all: ["admin", "practitioner-applications"] as const,
  list: (params?: ListPractitionerApplicationsParams) =>
    [...adminPractitionerApplicationsQueryKeys.all, "list", params ?? {}] as const,
  details: (id: string) =>
    [...adminPractitionerApplicationsQueryKeys.all, "details", id] as const,
};

